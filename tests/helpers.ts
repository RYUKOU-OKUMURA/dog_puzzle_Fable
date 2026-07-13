import { expect } from 'vitest';
import { Grid } from '../src/core/grid';
import { DIR_OFFSET, OPPOSITE, exitsFrom } from '../src/core/panel';
import { findPath } from '../src/core/path';
import { panelOptionsFor } from '../src/core/solver';
import type { Dir, GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';

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

/** 意図解の枚数より少ない配置では complete にできないことを assert */
export function expectNoShorterSolution(stage: StageDef, intendedPlacementCount: number): void {
  expect(intendedPlacementCount).toBeGreaterThan(0);
  expect(
    canSolveWithAtMost(stage, intendedPlacementCount - 1),
    `${stage.id}: ${intendedPlacementCount - 1}枚以下では解けない`,
  ).toBe(false);
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
