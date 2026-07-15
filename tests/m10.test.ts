import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import { findSolution, solveGrid } from '../src/core/solver';
import type { StageDef } from '../src/core/types';
import { WORLDS } from '../src/stage/catalog';
import { VERIFY_12X12 } from '../src/stage/devStages';

describe('M10: ソルバ到達可能性の枝刈り', () => {
  it('既存20ステージは枝刈り後も予算内で解け、解が complete を導く(回帰)', () => {
    for (const world of WORLDS) {
      for (const stage of world.stages) {
        const grid = new Grid(stage);
        const outcome = solveGrid(grid);
        expect(outcome.status, `${stage.id}: solveGrid の結果`).toBe('solved');
        // 探索の仮置きで盤面が汚されていない
        for (const slot of stage.slots) {
          expect(
            grid.panelAt(slot),
            `${stage.id}: ${slot.x},${slot.z} は汚されない`,
          ).toBeUndefined();
        }
        // 返された解を適用すると本当に complete になる
        const sol = findSolution(new Grid(stage))!;
        expect(sol.length, `${stage.id}: 解の枚数 > 0`).toBeGreaterThan(0);
        const g = new Grid(stage);
        for (const p of sol) expect(g.place(p.pos, p.kind, p.rotation)).toBe(true);
        expect(findPath(g).complete, `${stage.id}: 解で complete`).toBe(true);
      }
    }
  });

  it('ゴールへ届かない盤面は探索前に none(到達可能性チェック)', () => {
    // start(0,1)の出口(E)が芝生で塞がれ、スロットは goal 側とつながらない孤立配置。
    // 空きスロットを全部道とみなしてもゴールへ到達できない → 即 'none'。
    const isolated: StageDef = {
      id: 'isolated',
      name: '孤立',
      world: 'w1',
      size: { w: 4, h: 4 },
      start: { pos: { x: 0, z: 1 }, rotation: 90 },
      goal: { pos: { x: 3, z: 1 }, rotation: 270 },
      fixedRoads: [],
      slots: [
        { x: 1, z: 2 },
        { x: 2, z: 2 },
      ],
      scenery: [],
      encounterDogId: 'akita',
    };
    expect(solveGrid(new Grid(isolated)).status).toBe('none');
    expect(findSolution(new Grid(isolated))).toBeNull();
  });

  it('12×12・空きスロット20の検証ステージが予算内で解ける', () => {
    expect(VERIFY_12X12.size).toEqual({ w: 12, h: 12 });
    expect(VERIFY_12X12.slots.length).toBe(20);
    const outcome = solveGrid(new Grid(VERIFY_12X12));
    expect(outcome.status).toBe('solved'); // 'budget' になってはいけない
    // 解を適用すると complete(おやつ1つも通過)
    const sol = findSolution(new Grid(VERIFY_12X12))!;
    expect(sol.length).toBeGreaterThan(0);
    const g = new Grid(VERIFY_12X12);
    for (const p of sol) expect(g.place(p.pos, p.kind, p.rotation)).toBe(true);
    expect(findPath(g).complete).toBe(true);
  });
});
