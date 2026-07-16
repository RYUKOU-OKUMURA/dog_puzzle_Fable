import { expect } from 'vitest';
import { Grid } from '../src/core/grid';
import { connectionsOf, DIR_OFFSET, OPPOSITE, exitsFrom } from '../src/core/panel';
import { findPath } from '../src/core/path';
import { isStageSolvable, panelOptionsFor } from '../src/core/solver';
import type { Dir, GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';

const ALL_DIRS_TREAT: readonly Dir[] = ['N', 'E', 'S', 'W'];

/**
 * テスト用 4×4 ミニステージ。
 *
 *   z\x  0        1      2      3
 *   0    .        .      .      .
 *   1    START→  slot   slot   ←GOAL
 *   2    .        slot   slot   .
 *   3    .        .      .      .
 *
 * スタートは東向き(rotation 90)、ゴールは西向き(rotation 270)。
 * 最短解は (1,1)(2,1) に東西向きのまっすぐ(rotation 90)を置く。
 */
export function makeTestStage(): StageDef {
  return {
    id: 'test',
    name: 'テストのまち',
    size: { w: 4, h: 4 },
    start: { pos: { x: 0, z: 1 }, rotation: 90 },
    goal: { pos: { x: 3, z: 1 }, rotation: 270 },
    fixedRoads: [],
    slots: [
      { x: 1, z: 1 },
      { x: 2, z: 1 },
      { x: 1, z: 2 },
      { x: 2, z: 2 },
    ],
    scenery: [],
    encounterDogId: 'akita',
  };
}

function visitKey(pos: GridPos, enteredFrom: Dir | null, kind: string): string {
  if (kind !== 'bridge' || enteredFrom === null) return posKey(pos);
  const axis = enteredFrom === 'N' || enteredFrom === 'S' ? 'NS' : 'EW';
  return `${posKey(pos)}:${axis}`;
}

/**
 * 配置枚数の上限つきソルバ。意図解より短い別解がないことの回帰用。
 * (core/solver の総当たりと同系。上限を超える枝は切る)
 */
export function canSolveWithAtMost(stage: StageDef, maxPlacements: number): boolean {
  const options = panelOptionsFor(stage);
  const grid = new Grid(stage);

  function solve(
    current: GridPos,
    enteredFrom: Dir | null,
    visited: Set<string>,
    placed: number,
  ): boolean {
    if (placed > maxPlacements) return false;
    if (posKey(current) === posKey(grid.stage.goal.pos)) {
      return findPath(grid).complete;
    }
    const panel = grid.panelAt(current);
    if (!panel) return false;
    const vk = visitKey(current, enteredFrom, panel.kind);
    if (visited.has(vk)) return false;
    visited.add(vk);
    try {
      for (const dir of exitsFrom(panel.kind, panel.rotation, enteredFrom)) {
        const offset = DIR_OFFSET[dir];
        const next: GridPos = { x: current.x + offset.x, z: current.z + offset.z };
        if (!grid.inBounds(next)) continue;
        const nextPanel = grid.panelAt(next);
        if (nextPanel && grid.connectionsAt(next)?.includes(OPPOSITE[dir])) {
          if (solve(next, OPPOSITE[dir], visited, placed)) return true;
        } else if (grid.isSlot(next) && !grid.panelAt(next)) {
          if (placed >= maxPlacements) continue;
          for (const [kind, rot] of options) {
            grid.place(next, kind, rot);
            if (grid.connectionsAt(next)!.includes(OPPOSITE[dir])) {
              if (solve(next, OPPOSITE[dir], visited, placed + 1)) {
                grid.remove(next);
                return true;
              }
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

  return solve(stage.start.pos, null, new Set(), 0);
}

/**
 * 意図解の枚数より少ない配置では complete にできないことを assert。
 *
 * 注意: 内部の canSolveWithAtMost は枝刈りなしの総当たりで、前進分岐に対しルート長の
 * 指数オーダーになる。意図解が短い(目安 ≲12枚)W1/W2 向け。長ルート(W3〜W5 の大型盤面)では
 * 代わりに expectRouteIsMinimal(ルート各マス必須判定・線形)を使うこと。
 */
export function expectNoShorterSolution(stage: StageDef, intendedPlacementCount: number): void {
  expect(intendedPlacementCount).toBeGreaterThan(0);
  expect(
    canSolveWithAtMost(stage, intendedPlacementCount - 1),
    `${stage.id}: ${intendedPlacementCount - 1}枚以下では解けない`,
  ).toBe(false);
}

/**
 * 意図解が「最小」(意図解より少ない配置枚数では complete にならない)ことを検証する。
 *
 * canSolveWithAtMost(枝刈りなし総当たり)は前進分岐に対し指数的に膨らみ、12×12 の長ルートでは
 * タイムアウトする(M11 で顕在化)。代わりに「意図解のルートスロットを1つずつ盤面から外し、
 * そのときステージが解けなくなる(=そのマスが必須)こと」を全スロットについて確認する。
 *
 * 健全性: 意図解より少ない配置の解 S が存在すると仮定する。S は <N 枚しか置けないため、
 * 意図解の N 個のルートセル R のうち少なくとも1つ r* を使わない。r* を外した盤でも S は成立する
 * はずで、その盤は「解ける」ことになる → 「r* は必須」に反する。
 * よって「全ルートセルが必須」⟹「意図解より短い解は存在しない」。期待値はこれと同値。
 *
 * 計算量は placements.length 回の isStageSolvable(各・到達可能性枝刈りで高速)。橋・おやつ・
 * palette 制限のいずれでも isStageSolvable が正しく判定するため、全ギミックで健全。
 * 呼び出し側は意図解の「全ルートスロット」を渡すこと(expectIntendedSolutionSolves と併用想定)。
 */
export function expectRouteIsMinimal(
  stage: StageDef,
  placements: ReadonlyArray<{ pos: GridPos }>,
): void {
  expect(placements.length, `${stage.id}: 意図解の枚数 > 0`).toBeGreaterThan(0);
  for (const p of placements) {
    const withoutSlot: StageDef = {
      ...stage,
      slots: stage.slots.filter((s) => !(s.x === p.pos.x && s.z === p.pos.z)),
    };
    expect(
      isStageSolvable(withoutSlot),
      `${stage.id}: ルートスロット(${p.pos.x},${p.pos.z}) は必須(外すと解けなくなるべき)`,
    ).toBe(false);
  }
}

/** 意図解配置を盤面に置いて complete になることを assert */
export function expectIntendedSolutionSolves(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): void {
  const grid = new Grid(stage);
  const allowed = new Set(stage.palette ?? ['straight', 'corner', 'tee', 'bridge']);
  for (const p of placements) {
    expect(allowed.has(p.kind), `${p.kind} は palette 内`).toBe(true);
    expect(grid.place(p.pos, p.kind, p.rotation), `${posKey(p.pos)} に配置できる`).toBe(true);
  }
  const result = findPath(grid);
  expect(result.complete, '意図解で ★→◎ がつながる(全おやつ通過)').toBe(true);
  expect(result.route[0], 'ルートはスタートから').toEqual(stage.start.pos);
  expect(result.route[result.route.length - 1], 'ルートはゴールへ').toEqual(stage.goal.pos);
  const routeKeys = new Set(result.route.map(posKey));
  for (const t of stage.treats ?? []) {
    expect(routeKeys.has(posKey(t)), `おやつ(${posKey(t)}) をルートが通る`).toBe(true);
  }
}

// ----------------------------------------------------------------------------
// treat-aware 検証(再訪ショートカット検出)
//
// findPath(src/core/path.ts) は経路状態に「取ったおやつのビットマスク」を含むため、同一マスを
// 別のおやつ状態で再訪する経路を許す。一方 solver.ts / canSolveWithAtMost は visited に
// マスクを含めないため、この再訪を許さず「おやつマスへのスパー往復で分岐点を別maskで再訪して
// ルートの一部をスキップする」ショートカットを見逃す。ここでは findPath の挙動を忠実に模倣し、
// 意図解より少ない配置で complete になる経路(再訪ショートカット)がないことを網羅的に検証する。
// ----------------------------------------------------------------------------

/**
 * 到達可能性の緩和チェック(treat-aware 探索の枝刈り用)。空きスロットを全方位 open とみなし、
 * from から到達できるマス集合を求め、(a) ゴールが含まれるか、(b) まだ取っていないおやつが
 * すべて到達範囲にあるか、を確認。過大評価なので「ダメと言えば確実にダメ」=健全な枝刈り。
 */
function canFinishRelaxedTreat(
  grid: Grid,
  from: GridPos,
  mask: number,
  treatBit: Map<string, number>,
  allTreats: number,
  goalKey: string,
): boolean {
  if (posKey(from) === goalKey && mask === allTreats) return true;
  const seen = new Set<string>([posKey(from)]);
  const q: GridPos[] = [from];
  while (q.length > 0) {
    const c = q.shift()!;
    for (const d of ALL_DIRS_TREAT) {
      const o = DIR_OFFSET[d];
      const nb = { x: c.x + o.x, z: c.z + o.z };
      if (!grid.inBounds(nb)) continue;
      const k = posKey(nb);
      if (seen.has(k)) continue;
      const p = grid.panelAt(nb);
      // 空きスロットは open(全方位接続)、非スロットの空きは通行不可、パネルありは実際の接続
      const ex = p ? connectionsOf(p.kind, p.rotation) : grid.isSlot(nb) ? 'open' : null;
      if (ex === null) continue;
      if (ex !== 'open' && !ex.includes(OPPOSITE[d])) continue;
      seen.add(k);
      q.push(nb);
    }
  }
  if (!seen.has(goalKey)) return false;
  for (const [tk, bit] of treatBit) {
    if ((mask & bit) === 0 && !seen.has(tk)) return false;
  }
  return true;
}

/**
 * おやつマスクを状態に含めた探索(再訪を許す)。maxPlacements 枚以下で complete になるかを
 * 判定し、予算超過時は budget=true で抜ける。戻り値の ok は「別解あり」の意。
 */
export function canSolveTreatAware(
  stage: StageDef,
  maxPlacements: number,
  nodeBudget = 20_000_000,
): { ok: boolean; nodes: number; budget: boolean } {
  const options = panelOptionsFor(stage);
  const treats = stage.treats ?? [];
  const treatBit = new Map<string, number>();
  for (const p of treats) {
    const k = posKey(p);
    if (!treatBit.has(k)) treatBit.set(k, 1 << treatBit.size);
  }
  const allTreats = (1 << treatBit.size) - 1;
  const grid = new Grid(stage);
  const startMask = treatBit.get(posKey(stage.start.pos)) ?? 0;
  const goalKey = posKey(stage.goal.pos);
  let nodes = 0;

  // visited キー。橋は通行軸を、全パネルでおやつマスクを状態に含める(再訪を許す)
  function visitKeyTreat(pos: GridPos, ef: Dir | null, kind: PanelKind, mask: number): string {
    const axis = kind === 'bridge' && ef ? (ef === 'N' || ef === 'S' ? 'NS' : 'EW') : '-';
    return `${posKey(pos)}:${axis}:${mask}`;
  }

  function dfs(cur: GridPos, ef: Dir | null, mask: number, placed: number, vis: Set<string>): boolean {
    nodes++;
    if (nodes > nodeBudget) return false;
    if (posKey(cur) === goalKey && mask === allTreats) return true;
    const panel = grid.panelAt(cur);
    if (!panel) return false;
    if (!canFinishRelaxedTreat(grid, cur, mask, treatBit, allTreats, goalKey)) return false;
    const k = visitKeyTreat(cur, ef, panel.kind, mask);
    if (vis.has(k)) return false;
    vis.add(k);
    try {
      for (const dir of exitsFrom(panel.kind, panel.rotation, ef)) {
        const o = DIR_OFFSET[dir];
        const nx = { x: cur.x + o.x, z: cur.z + o.z };
        if (!grid.inBounds(nx)) continue;
        const nm = mask | (treatBit.get(posKey(nx)) ?? 0);
        const np = grid.panelAt(nx);
        if (np && grid.connectionsAt(nx)?.includes(OPPOSITE[dir])) {
          if (dfs(nx, OPPOSITE[dir], nm, placed, vis)) return true;
        } else if (grid.isSlot(nx) && !grid.panelAt(nx)) {
          if (placed >= maxPlacements) continue;
          for (const [kind, rot] of options) {
            grid.place(nx, kind, rot);
            if (grid.connectionsAt(nx)!.includes(OPPOSITE[dir])) {
              if (dfs(nx, OPPOSITE[dir], nm, placed + 1, vis)) {
                grid.remove(nx);
                return true;
              }
            }
            grid.remove(nx);
          }
        }
      }
      return false;
    } finally {
      vis.delete(k);
    }
  }

  const ok = dfs(stage.start.pos, null, startMask, 0, new Set());
  return { ok, nodes, budget: nodes > nodeBudget };
}

/**
 * 意図解より少ない配置で complete になる経路(再訪ショートカットを含む)がないことを assert。
 *
 * expectNoShorterSolution(既存) は canSolveWithAtMost が visited におやつマスクを含めないため、
 * findPath が許す「おやつマスへのスパー往復で分岐点を別maskで再訪する」ショートカットを
 * 見逃す(従来テストの抜け穴)。このヘルパは canSolveTreatAware(マスク込み探索) でそれを見逃さない。
 *
 * 予算超過(探索が尽きない)の場合は偽陽性(実は別解があるのに OK が出る)を防ぐため、明示的に
 * テストを fail させる。出荷ステージの盤面(≤12×12・分岐過多でなければ)では予算内で尽きる。
 */
export function expectNoRevisitShortcut(
  stage: StageDef,
  intendedPlacements: number,
  opts: { nodeBudget?: number } = {},
): void {
  expect(intendedPlacements, `${stage.id}: 意図解の枚数 > 0`).toBeGreaterThan(0);
  const r = canSolveTreatAware(stage, intendedPlacements - 1, opts.nodeBudget);
  expect(
    r.budget,
    `${stage.id}: 再訪ショートカット検証が予算内で完遂できない(盤面が大きすぎるか分岐が多すぎる)`,
  ).toBe(false);
  expect(
    r.ok,
    `${stage.id}: ${intendedPlacements - 1}枚以下の再訪ショートカット別解がない`,
  ).toBe(false);
}
