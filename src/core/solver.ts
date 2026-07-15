import { Grid } from './grid';
import { connectionsOf, DIR_OFFSET, OPPOSITE, PLAYER_PANEL_KINDS, exitsFrom } from './panel';
import { findPath } from './path';
import type { Dir, GridPos, PanelKind, Rotation, StageDef } from './types';
import { posKey } from './types';

const ALL_DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];

/** 解の1マスぶんの配置(プレイヤーパネルのみ) */
export interface SolverPlacement {
  pos: GridPos;
  kind: PanelKind;
  rotation: Rotation;
}

/**
 * ヒント対象。
 * - place: 正解ルート上の空きスロット(ここに置けば前進できる)
 * - remove: 誤配置で詰んでいるとき、はずすべきパネル
 */
export type HintKind = 'place' | 'remove';

export interface HintTarget {
  pos: GridPos;
  kind: HintKind;
}

/**
 * 探索ノード予算。
 * 出荷済み全ステージの空盤 findSolution は実測で最大数十〜数百ノード程度で完了する。
 * 将来のステージデータミスで解なし盤面がヒント発火時にメインスレッドを塞がないよう、
 * 十分な余裕を見て 200_000 とする。超過時は判定不能として null を返す。
 */
export const SOLVER_NODE_BUDGET = 200_000;

/** 探索結果(テスト・予算超過の区別用) */
export type SolveOutcome =
  { status: 'solved'; placements: SolverPlacement[] } | { status: 'none' } | { status: 'budget' };

/** stage.palette を尊重した [種別, 回転] 候補 */
export function panelOptionsFor(stage: StageDef): Array<[PanelKind, Rotation]> {
  const kinds = stage.palette ?? PLAYER_PANEL_KINDS;
  const options: Array<[PanelKind, Rotation]> = [];
  for (const kind of kinds) {
    if (kind === 'straight') {
      options.push(['straight', 0], ['straight', 90]);
    } else if (kind === 'corner') {
      options.push(['corner', 0], ['corner', 90], ['corner', 180], ['corner', 270]);
    } else if (kind === 'tee') {
      options.push(['tee', 0], ['tee', 90], ['tee', 180], ['tee', 270]);
    }
  }
  return options;
}

/** 橋の通行軸を visited に含める(上下を別扱い) */
function visitKey(pos: GridPos, enteredFrom: Dir | null, kind: PanelKind): string {
  if (kind !== 'bridge' || enteredFrom === null) return posKey(pos);
  const axis = enteredFrom === 'N' || enteredFrom === 'S' ? 'NS' : 'EW';
  return `${posKey(pos)}:${axis}`;
}

/**
 * 到達可能性の緩和チェック(枝刈り用)。空きスロットを「全方位に接続する」とみなし、
 * 置かれたパネル/固定道は実際の接続で、from からゴールまで到達できるか BFS する。
 *
 * 接続を過大評価するので:
 * - 到達不能 ⟹ 空きを最大限活用してもゴールへ行けない ⟹ 解なし ⟹ 枝刈り安全(健全)
 * - 到達可能 ⟹ 本当に解があるとは限らない(過大評価)→ 探索続行
 * つまりこのチェックは「解を1つも見逃さない」=既存ステージの結果を変えない(M10)。
 */
function canReachGoal(grid: Grid, from: GridPos): boolean {
  const goalKey = posKey(grid.stage.goal.pos);
  const startKey = posKey(from);
  if (startKey === goalKey) return true;
  const seen = new Set<string>([startKey]);
  const queue: GridPos[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curExits = relaxedExits(grid, cur);
    if (curExits === null) continue;
    for (const dir of ALL_DIRS) {
      if (curExits !== 'open' && !curExits.includes(dir)) continue;
      const nb: GridPos = { x: cur.x + DIR_OFFSET[dir].x, z: cur.z + DIR_OFFSET[dir].z };
      if (!grid.inBounds(nb)) continue;
      const key = posKey(nb);
      if (seen.has(key)) continue;
      const nbExits = relaxedExits(grid, nb);
      if (nbExits === null) continue; // 芝生/添景は通行不可
      if (nbExits !== 'open' && !nbExits.includes(OPPOSITE[dir])) continue;
      if (key === goalKey) return true;
      seen.add(key);
      queue.push(nb);
    }
  }
  return false;
}

/**
 * 到達可能性用のマスの接続(緩和)。
 * - パネルあり: 実際の接続方向(橋は過大評価して全方位扱い=健全)
 * - 空きスロット: 'open'(全方位に接続するとみなす)
 * - 芝生/添景などパネルのない非スロット: null(通行不可)
 */
function relaxedExits(grid: Grid, pos: GridPos): readonly Dir[] | 'open' | null {
  const panel = grid.panelAt(pos);
  if (panel) return connectionsOf(panel.kind, panel.rotation);
  return grid.isSlot(pos) ? 'open' : null;
}

/**
 * 現在の盤面からクリア配置を探す(予算付き)。
 *
 * 既知の制約: visited がおやつマスクを含まないため、
 * 「同一マスを2回通らないと全おやつを回収できないステージ」は解なし扱いになる。
 * 現行全ステージは単純経路設計のため実害なし(挙動は変えない)。
 */
export function solveGrid(grid: Grid, nodeBudget = SOLVER_NODE_BUDGET): SolveOutcome {
  if (findPath(grid).complete) return { status: 'solved', placements: [] };

  // 空きスロットを全部道とみなしてもゴールへ届かない盤面は、探索せずに解なし(M10 枝刈り)
  if (!canReachGoal(grid, grid.stage.start.pos)) return { status: 'none' };

  const options = panelOptionsFor(grid.stage);
  const visited = new Set<string>();
  const placed: SolverPlacement[] = [];
  const counter = { nodes: 0, budget: nodeBudget, hitBudget: false };

  const found = solveFrom(grid, grid.stage.start.pos, null, visited, options, placed, counter);
  // 探索中の仮置きを戻す(呼び出し元の盤面を汚さない)。成功時は placed に解が残る
  for (const p of placed) {
    grid.remove(p.pos);
  }
  if (found) return { status: 'solved', placements: [...placed] };
  if (counter.hitBudget) return { status: 'budget' };
  return { status: 'none' };
}

/**
 * 現在の盤面(配置済みパネル込み)からクリアできる配置を1つ探す。
 * 見つかれば「いま空いているスロットへ新たに置くべき配置」だけを返す。
 * 既に complete なら空配列。解なし・予算超過なら null。
 */
export function findSolution(
  grid: Grid,
  nodeBudget = SOLVER_NODE_BUDGET,
): SolverPlacement[] | null {
  const outcome = solveGrid(grid, nodeBudget);
  return outcome.status === 'solved' ? outcome.placements : null;
}

/** ステージ定義から空盤で解けるか(テスト用) */
export function isStageSolvable(stage: StageDef): boolean {
  return findSolution(new Grid(stage)) !== null;
}

/**
 * ヒント対象を1つ返す。
 *
 * 仕様:
 * 1. 既にクリア可能 → null(ヒント対象なし)
 * 2. いまの配置のまま空きを埋めれば解ける → 正解ルート上の空きスロット1つ(place)
 * 3. 誤配置で詰み → はずせば解けるプレイヤーパネル1つ(remove)。
 *    それも無ければ、空盤の解と食い違う配置を remove、または解上の空きを place
 * 4. 探索予算超過 → null(ヒントを出さず安全側)
 */
export function findHintTarget(grid: Grid): HintTarget | null {
  if (findPath(grid).complete) return null;

  const withCurrent = findSolution(grid);
  if (withCurrent !== null) {
    return hintPlaceOnRoute(grid, withCurrent);
  }

  // 誤配置で詰み: 1枚はずせば解けるパネルを探す
  const playerSlots = playerPlacedSlots(grid);
  for (const pos of playerSlots) {
    const panel = grid.panelAt(pos)!;
    grid.remove(pos);
    const solvable = findSolution(grid) !== null;
    grid.place(pos, panel.kind, panel.rotation);
    if (solvable) return { pos, kind: 'remove' };
  }

  // 空盤の解と比較して案内(全はずしが必要な極端ケースの保険)
  const empty = new Grid(grid.stage);
  const fromEmpty = findSolution(empty);
  if (fromEmpty === null) return null;

  for (const pos of playerSlots) {
    const current = grid.panelAt(pos)!;
    const intended = fromEmpty.find((p) => posKey(p.pos) === posKey(pos));
    if (!intended || intended.kind !== current.kind || intended.rotation !== current.rotation) {
      return { pos, kind: 'remove' };
    }
  }

  return hintPlaceOnRoute(grid, fromEmpty);
}

/** 解配置を仮置きしてルート上の未配置スロットを1つ返す */
function hintPlaceOnRoute(grid: Grid, placements: SolverPlacement[]): HintTarget | null {
  if (placements.length === 0) return null;

  for (const p of placements) {
    grid.place(p.pos, p.kind, p.rotation);
  }
  const route = findPath(grid).route;
  for (const p of placements) {
    grid.remove(p.pos);
  }

  const routeKeys = new Set(route.map(posKey));
  for (const p of placements) {
    if (routeKeys.has(posKey(p.pos)) && grid.canPlace(p.pos)) {
      return { pos: p.pos, kind: 'place' };
    }
  }
  // ルート外のダミー配置しか無い場合は先頭の空きを案内
  const first = placements.find((p) => grid.canPlace(p.pos));
  return first ? { pos: first.pos, kind: 'place' } : null;
}

function playerPlacedSlots(grid: Grid): GridPos[] {
  const result: GridPos[] = [];
  for (const slot of grid.stage.slots) {
    const panel = grid.panelAt(slot);
    if (panel && !panel.fixed) result.push(slot);
  }
  return result;
}

interface SolveCounter {
  nodes: number;
  budget: number;
  hitBudget: boolean;
}

function solveFrom(
  grid: Grid,
  current: GridPos,
  enteredFrom: Dir | null,
  visited: Set<string>,
  options: Array<[PanelKind, Rotation]>,
  placed: SolverPlacement[],
  counter: SolveCounter,
): boolean {
  counter.nodes += 1;
  if (counter.nodes > counter.budget) {
    counter.hitBudget = true;
    return false;
  }

  if (posKey(current) === posKey(grid.stage.goal.pos)) {
    return findPath(grid).complete;
  }
  const panel = grid.panelAt(current);
  if (!panel) return false;
  const vk = visitKey(current, enteredFrom, panel.kind);
  if (visited.has(vk)) return false;
  visited.add(vk);
  try {
    // ここからの配置でゴールへ届かない(緩和到達判定)なら、これ以上探さない(M10 枝刈り)
    if (!canReachGoal(grid, current)) return false;

    const exits = exitsFrom(panel.kind, panel.rotation, enteredFrom);
    for (const dir of exits) {
      const offset = DIR_OFFSET[dir];
      const next: GridPos = { x: current.x + offset.x, z: current.z + offset.z };
      if (!grid.inBounds(next)) continue;
      const nextPanel = grid.panelAt(next);
      if (nextPanel && grid.connectionsAt(next)?.includes(OPPOSITE[dir])) {
        if (solveFrom(grid, next, OPPOSITE[dir], visited, options, placed, counter)) return true;
      } else if (grid.isSlot(next) && !grid.panelAt(next)) {
        for (const [kind, rot] of options) {
          grid.place(next, kind, rot);
          const conns = grid.connectionsAt(next)!;
          if (conns.includes(OPPOSITE[dir])) {
            placed.push({ pos: next, kind, rotation: rot });
            if (solveFrom(grid, next, OPPOSITE[dir], visited, options, placed, counter)) {
              return true;
            }
            placed.pop();
          }
          grid.remove(next);
        }
      }
    }
    return false;
  } finally {
    visited.delete(vk);
  }
}
