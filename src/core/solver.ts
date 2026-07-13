import { Grid } from './grid';
import { DIR_OFFSET, OPPOSITE, PLAYER_PANEL_KINDS, exitsFrom } from './panel';
import { findPath } from './path';
import type { Dir, GridPos, PanelKind, Rotation, StageDef } from './types';
import { posKey } from './types';

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
 * 現在の盤面(配置済みパネル込み)からクリアできる配置を1つ探す。
 * 見つかれば「いま空いているスロットへ新たに置くべき配置」だけを返す。
 * 既に complete なら空配列。解なしなら null。
 */
export function findSolution(grid: Grid): SolverPlacement[] | null {
  if (findPath(grid).complete) return [];

  const options = panelOptionsFor(grid.stage);
  const visited = new Set<string>();
  const placed: SolverPlacement[] = [];

  const ok = solveFrom(grid, grid.stage.start.pos, null, visited, options, placed);
  // 探索中の仮置きを戻す(呼び出し元の盤面を汚さない)。成功時は placed に解が残る
  for (const p of placed) {
    grid.remove(p.pos);
  }
  return ok ? placed : null;
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

function solveFrom(
  grid: Grid,
  current: GridPos,
  enteredFrom: Dir | null,
  visited: Set<string>,
  options: Array<[PanelKind, Rotation]>,
  placed: SolverPlacement[],
): boolean {
  if (posKey(current) === posKey(grid.stage.goal.pos)) {
    return findPath(grid).complete;
  }
  const panel = grid.panelAt(current);
  if (!panel) return false;
  const vk = visitKey(current, enteredFrom, panel.kind);
  if (visited.has(vk)) return false;
  visited.add(vk);
  try {
    const exits = exitsFrom(panel.kind, panel.rotation, enteredFrom);
    for (const dir of exits) {
      const offset = DIR_OFFSET[dir];
      const next: GridPos = { x: current.x + offset.x, z: current.z + offset.z };
      if (!grid.inBounds(next)) continue;
      const nextPanel = grid.panelAt(next);
      if (nextPanel && grid.connectionsAt(next)?.includes(OPPOSITE[dir])) {
        if (solveFrom(grid, next, OPPOSITE[dir], visited, options, placed)) return true;
      } else if (grid.isSlot(next) && !grid.panelAt(next)) {
        for (const [kind, rot] of options) {
          grid.place(next, kind, rot);
          const conns = grid.connectionsAt(next)!;
          if (conns.includes(OPPOSITE[dir])) {
            placed.push({ pos: next, kind, rotation: rot });
            if (solveFrom(grid, next, OPPOSITE[dir], visited, options, placed)) {
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
