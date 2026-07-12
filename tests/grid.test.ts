import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { makeTestStage } from './helpers';

describe('Grid', () => {
  it('スタート・ゴールが端点パネルとして置かれている', () => {
    const grid = new Grid(makeTestStage());
    expect(grid.panelAt({ x: 0, z: 1 })).toMatchObject({ kind: 'end', rotation: 90, fixed: true });
    expect(grid.panelAt({ x: 3, z: 1 })).toMatchObject({ kind: 'end', rotation: 270, fixed: true });
    expect(grid.connectionsAt({ x: 0, z: 1 })).toEqual(['E']);
  });

  it('空きマスにだけ配置できる', () => {
    const grid = new Grid(makeTestStage());
    expect(grid.place({ x: 1, z: 1 }, 'straight')).toBe(true);
    expect(grid.panelAt({ x: 1, z: 1 })).toMatchObject({ kind: 'straight', fixed: false });

    // 空きマスでない場所(草地)には置けない
    expect(grid.place({ x: 0, z: 0 }, 'straight')).toBe(false);
    // すでにパネルがある場所には置けない
    expect(grid.place({ x: 1, z: 1 }, 'corner')).toBe(false);
    // スタート・ゴールの上には置けない
    expect(grid.place({ x: 0, z: 1 }, 'straight')).toBe(false);
  });

  it('配置したパネルは回転できる(90°ずつ一周)', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'straight');
    expect(grid.rotate({ x: 1, z: 1 })).toBe(true);
    expect(grid.panelAt({ x: 1, z: 1 })?.rotation).toBe(90);
    grid.rotate({ x: 1, z: 1 });
    grid.rotate({ x: 1, z: 1 });
    grid.rotate({ x: 1, z: 1 });
    expect(grid.panelAt({ x: 1, z: 1 })?.rotation).toBe(0);
  });

  it('配置したパネルは取り外せて、また置き直せる', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'tee');
    expect(grid.remove({ x: 1, z: 1 })).toBe(true);
    expect(grid.panelAt({ x: 1, z: 1 })).toBeUndefined();
    expect(grid.canPlace({ x: 1, z: 1 })).toBe(true);
  });

  it('固定パネル(スタート等)は回転も取り外しもできない', () => {
    const grid = new Grid(makeTestStage());
    expect(grid.rotate({ x: 0, z: 1 })).toBe(false);
    expect(grid.remove({ x: 0, z: 1 })).toBe(false);
    // 何もない場所も同様
    expect(grid.rotate({ x: 1, z: 1 })).toBe(false);
    expect(grid.remove({ x: 1, z: 1 })).toBe(false);
  });

  it('盤面の内外判定', () => {
    const grid = new Grid(makeTestStage());
    expect(grid.inBounds({ x: 0, z: 0 })).toBe(true);
    expect(grid.inBounds({ x: 3, z: 3 })).toBe(true);
    expect(grid.inBounds({ x: -1, z: 0 })).toBe(false);
    expect(grid.inBounds({ x: 4, z: 0 })).toBe(false);
  });
});
