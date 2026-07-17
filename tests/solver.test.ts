import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import {
  findHintTarget,
  findSolution,
  isStageSolvable,
  panelOptionsFor,
  SOLVER_NODE_BUDGET,
  solveGrid,
} from '../src/core/solver';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { expectRouteIsMinimal, makeTestStage } from './helpers';

/** おやつ4〜5個検証用の一本道(palette を straight のみにして探索を小さく保つ) */
function treatCorridorStage(treatCount: 4 | 5): StageDef {
  const slots: GridPos[] = [
    { x: 1, z: 1 },
    { x: 2, z: 1 },
    { x: 3, z: 1 },
    { x: 4, z: 1 },
    { x: 5, z: 1 },
  ];
  const treats = slots.slice(0, treatCount);
  return {
    id: `treat-corridor-${treatCount}`,
    name: 'おやつかいどう',
    size: { w: 7, h: 3 },
    start: { pos: { x: 0, z: 1 }, rotation: 90 },
    goal: { pos: { x: 6, z: 1 }, rotation: 270 },
    fixedRoads: [],
    slots,
    scenery: [],
    encounterDogId: 'corgi',
    treats,
    palette: ['straight'],
  };
}

describe('core/solver', () => {
  it('一意解に近い盤面で正解ルート上の空きスロットを返す', () => {
    const stage = makeTestStage();
    const grid = new Grid(stage);
    // (1,1) だけ正しいまっすぐを置き、(2,1) は空のまま
    expect(grid.place({ x: 1, z: 1 }, 'straight', 90)).toBe(true);

    const hint = findHintTarget(grid);
    expect(hint).not.toBeNull();
    expect(hint!.kind).toBe('place');
    expect(hint!.pos).toEqual({ x: 2, z: 1 });
  });

  it('既に完成済みならヒント対象なし', () => {
    const stage = makeTestStage();
    const grid = new Grid(stage);
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    expect(findPath(grid).complete).toBe(true);
    expect(findHintTarget(grid)).toBeNull();
  });

  it('誤配置で詰みならはずすべきパネルを案内する', () => {
    const stage = makeTestStage();
    const grid = new Grid(stage);
    // (1,1) に南北まっすぐを置くと東西の正解を塞ぐ
    expect(grid.place({ x: 1, z: 1 }, 'straight', 0)).toBe(true);

    const hint = findHintTarget(grid);
    expect(hint).not.toBeNull();
    expect(hint!.kind).toBe('remove');
    expect(hint!.pos).toEqual({ x: 1, z: 1 });
  });

  it('空盤の解を findSolution が返し、適用すると complete になる', () => {
    const stage = makeTestStage();
    const grid = new Grid(stage);
    const solution = findSolution(grid);
    expect(solution).not.toBeNull();
    expect(solution!.length).toBeGreaterThan(0);
    // 盤面は汚されていない
    expect(grid.panelAt({ x: 1, z: 1 })).toBeUndefined();

    for (const p of solution!) {
      expect(grid.place(p.pos, p.kind, p.rotation)).toBe(true);
    }
    expect(findPath(grid).complete).toBe(true);
  });

  it('isStageSolvable はテストステージで true', () => {
    expect(isStageSolvable(makeTestStage())).toBe(true);
  });

  it('探索予算を超えたら判定不能(budget)として null 相当を返す', () => {
    const grid = new Grid(makeTestStage());
    // 空盤の解は数ノードで見つかるが、予算1なら開始直後に超過する
    const outcome = solveGrid(grid, 1);
    expect(outcome.status).toBe('budget');
    expect(findSolution(grid, 1)).toBeNull();
  });

  it.each([4, 5] as const)(
    'おやつ%d個の一本道を既定予算(200_000ノード)内で解き、ヒントも出せる',
    (treatCount) => {
      const stage = treatCorridorStage(treatCount);
      const empty = new Grid(stage);
      const outcome = solveGrid(empty, SOLVER_NODE_BUDGET);
      expect(outcome.status).toBe('solved');
      if (outcome.status !== 'solved') return;

      const solved = new Grid(stage);
      for (const p of outcome.placements) {
        expect(solved.place(p.pos, p.kind, p.rotation)).toBe(true);
      }
      const path = findPath(solved);
      expect(path.complete).toBe(true);
      expect(path.route).toHaveLength(7);
      for (const t of stage.treats ?? []) {
        expect(path.route).toContainEqual(t);
      }

      // 1マス空けた盤でヒントが place を返す(ソルバがおやつ付き盤でも動くこと)
      const partial = new Grid(stage);
      for (const p of outcome.placements.slice(0, -1)) {
        expect(partial.place(p.pos, p.kind, p.rotation)).toBe(true);
      }
      const hint = findHintTarget(partial);
      expect(hint).not.toBeNull();
      expect(hint!.kind).toBe('place');
      expect(hint!.pos).toEqual(outcome.placements.at(-1)!.pos);
    },
  );
});

describe('panelOptionsFor', () => {
  // distinctRotationsOf 移行後も、従来の if/else 連鎖と同じ候補リスト(種別→回転の昇順)になることを固定する。
  it('palette 未指定は PLAYER_PANEL_KINDS の全種×重複しない回転(従来と同じ候補)', () => {
    const stage = makeTestStage();
    const expected: Array<[PanelKind, Rotation]> = [
      ['straight', 0],
      ['straight', 90],
      ['corner', 0],
      ['corner', 90],
      ['corner', 180],
      ['corner', 270],
      ['tee', 0],
      ['tee', 90],
      ['tee', 180],
      ['tee', 270],
    ];
    expect(panelOptionsFor(stage)).toEqual(expected);
  });

  it('palette 指定時は指定種のみ(従来と同じ候補)', () => {
    const stage = { ...makeTestStage(), palette: ['straight', 'corner'] as PanelKind[] };
    const expected: Array<[PanelKind, Rotation]> = [
      ['straight', 0],
      ['straight', 90],
      ['corner', 0],
      ['corner', 90],
      ['corner', 180],
      ['corner', 270],
    ];
    expect(panelOptionsFor(stage)).toEqual(expected);
  });
});

describe('expectRouteIsMinimal', () => {
  it('極小 nodeBudget では予算超過を fail する(解なしと混同しない)', () => {
    const stage = makeTestStage();
    // (1,2) は正解に不要なダミー。外しても緩和到達は残るため探索が走り、予算0で即 'budget' になる。
    // (ルート必須マスを外すと canReachGoal が先に 'none' を返し、予算分岐を通せない)
    expect(() => expectRouteIsMinimal(stage, [{ pos: { x: 1, z: 2 } }], { nodeBudget: 0 })).toThrow(
      /予算超過/,
    );
  });

  it('通常予算ではテストステージの意図解ルートが最小と判定される', () => {
    expectRouteIsMinimal(makeTestStage(), [{ pos: { x: 1, z: 1 } }, { pos: { x: 2, z: 1 } }]);
  });
});
