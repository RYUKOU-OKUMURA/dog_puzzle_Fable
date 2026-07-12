import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import { makeTestStage } from './helpers';

describe('findPath', () => {
  it('何も置いていないと未完成で、ルートはスタートだけ', () => {
    const grid = new Grid(makeTestStage());
    const result = findPath(grid);
    expect(result.complete).toBe(false);
    expect(result.route).toEqual([{ x: 0, z: 1 }]);
  });

  it('まっすぐ2枚(東西向き)でゴールまでつながる', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route).toEqual([
      { x: 0, z: 1 },
      { x: 1, z: 1 },
      { x: 2, z: 1 },
      { x: 3, z: 1 },
    ]);
  });

  it('向きが違うと(南北向きのまっすぐ)つながらない', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'straight', 0);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(false);
    expect(result.route).toEqual([{ x: 0, z: 1 }]);
  });

  it('片方だけが相手を向いていてもつながらない(双方向チェック)', () => {
    const grid = new Grid(makeTestStage());
    // corner 0° は北・東。スタートは東を向いているが、corner は西を向いていない
    grid.place({ x: 1, z: 1 }, 'corner', 0);
    const result = findPath(grid);
    expect(result.complete).toBe(false);
    expect(result.route).toEqual([{ x: 0, z: 1 }]);
  });

  it('途中まではつながっていると、そこまでの部分ルートを返す(首かしげ用)', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(false);
    expect(result.route).toEqual([
      { x: 0, z: 1 },
      { x: 1, z: 1 },
    ]);
  });

  it('曲がり角で遠回りルートもつながる', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'corner', 180); // 南・西
    grid.place({ x: 1, z: 2 }, 'corner', 0); // 北・東
    grid.place({ x: 2, z: 2 }, 'corner', 270); // 西・北
    grid.place({ x: 2, z: 1 }, 'corner', 90); // 東・南
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route).toEqual([
      { x: 0, z: 1 },
      { x: 1, z: 1 },
      { x: 1, z: 2 },
      { x: 2, z: 2 },
      { x: 2, z: 1 },
      { x: 3, z: 1 },
    ]);
  });

  it('T字路の使っていない枝があってもゴールできる(最短ルートを歩く)', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'tee', 180); // 東・南・西
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    grid.place({ x: 1, z: 2 }, 'straight', 0); // 枝の先の行き止まり
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route).toEqual([
      { x: 0, z: 1 },
      { x: 1, z: 1 },
      { x: 2, z: 1 },
      { x: 3, z: 1 },
    ]);
  });

  it('ルートは必ずスタートで始まり、完成時はゴールで終わる', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const { route } = findPath(grid);
    expect(route[0]).toEqual(grid.stage.start.pos);
    expect(route[route.length - 1]).toEqual(grid.stage.goal.pos);
  });
});
