import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import { findHintTarget, findSolution, isStageSolvable } from '../src/core/solver';
import { makeTestStage } from './helpers';

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
});
