import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import type { StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { makeTestStage } from './helpers';

/**
 * 橋パネル(M7)の経路判定。
 * - 橋なし盤面は従来と同じ結果
 * - 橋は N↔S / E↔W のみ(曲がり不可)
 * - 同一橋マスを上下2回通るルートが復元できる
 * - 固定なので回転・除去不可
 */

/** 橋を中央に置いた十字のテスト盤。東西南北にスロット */
function bridgeCrossStage(treats?: StageDef['treats']): StageDef {
  return {
    id: 'bridge-cross',
    name: 'はしクロス',
    size: { w: 5, h: 5 },
    start: { pos: { x: 2, z: 0 }, rotation: 180 },
    goal: { pos: { x: 2, z: 4 }, rotation: 0 },
    fixedRoads: [{ pos: { x: 2, z: 2 }, kind: 'bridge', rotation: 0 }],
    slots: [
      { x: 2, z: 1 },
      { x: 2, z: 3 },
      { x: 1, z: 2 },
      { x: 3, z: 2 },
    ],
    scenery: [],
    encounterDogId: 'chihuahua',
    treats,
  };
}

describe('findPath: 橋なしは従来どおり', () => {
  it('まっすぐ2枚でゴールまでつながる(既存と同じルート)', () => {
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
});

describe('findPath: 橋を直進で通過', () => {
  it('南北(N→S)で橋を通ってゴールできる', () => {
    const grid = new Grid(bridgeCrossStage());
    grid.place({ x: 2, z: 1 }, 'straight', 0);
    grid.place({ x: 2, z: 3 }, 'straight', 0);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route).toEqual([
      { x: 2, z: 0 },
      { x: 2, z: 1 },
      { x: 2, z: 2 },
      { x: 2, z: 3 },
      { x: 2, z: 4 },
    ]);
  });

  it('東西(E→W)で橋を通ってゴールできる', () => {
    const stage: StageDef = {
      id: 'bridge-ew',
      name: 'はし東西',
      size: { w: 5, h: 3 },
      start: { pos: { x: 0, z: 1 }, rotation: 90 },
      goal: { pos: { x: 4, z: 1 }, rotation: 270 },
      fixedRoads: [{ pos: { x: 2, z: 1 }, kind: 'bridge', rotation: 0 }],
      slots: [
        { x: 1, z: 1 },
        { x: 3, z: 1 },
      ],
      scenery: [],
      encounterDogId: 'chihuahua',
    };
    const grid = new Grid(stage);
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 3, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route).toEqual([
      { x: 0, z: 1 },
      { x: 1, z: 1 },
      { x: 2, z: 1 },
      { x: 3, z: 1 },
      { x: 4, z: 1 },
    ]);
  });
});

describe('findPath: 橋で曲がれない', () => {
  it('N→E の曲がりは経路にならない', () => {
    // ★北から橋へ入り、東の◎へ曲がろうとする。橋では曲がれないので未完成。
    const stage: StageDef = {
      id: 'bridge-no-turn',
      name: 'はしまがれない',
      size: { w: 5, h: 5 },
      start: { pos: { x: 2, z: 0 }, rotation: 180 },
      goal: { pos: { x: 4, z: 2 }, rotation: 270 },
      fixedRoads: [{ pos: { x: 2, z: 2 }, kind: 'bridge', rotation: 0 }],
      slots: [
        { x: 2, z: 1 },
        { x: 3, z: 2 },
      ],
      scenery: [],
      encounterDogId: 'chihuahua',
    };
    const grid = new Grid(stage);
    grid.place({ x: 2, z: 1 }, 'straight', 0);
    grid.place({ x: 3, z: 2 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(false);
    expect(result.route.map(posKey)).toContain('2,2');
    expect(result.route.at(-1)).not.toEqual({ x: 4, z: 2 });
  });
});

describe('findPath: 同一橋マスを上下2回通る', () => {
  it('先に東西・あと南北で同じ橋を2回通るルートが復元される', () => {
    /**
     * ★(0,2)→(1,2)→橋[下]→(3,2)→(3,3)→(2,3)→橋[上]→(2,1)→◎(2,0)
     */
    const stage: StageDef = {
      id: 'bridge-twice',
      name: 'はし2かい',
      size: { w: 5, h: 5 },
      start: { pos: { x: 0, z: 2 }, rotation: 90 },
      goal: { pos: { x: 2, z: 0 }, rotation: 180 },
      fixedRoads: [
        { pos: { x: 2, z: 2 }, kind: 'bridge', rotation: 0 },
        { pos: { x: 1, z: 2 }, kind: 'straight', rotation: 90 },
        { pos: { x: 3, z: 2 }, kind: 'corner', rotation: 180 }, // S,W
        { pos: { x: 3, z: 3 }, kind: 'corner', rotation: 270 }, // N,W
        { pos: { x: 2, z: 3 }, kind: 'corner', rotation: 0 }, // N,E
        { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 0 },
      ],
      slots: [],
      scenery: [],
      encounterDogId: 'chihuahua',
    };
    const grid = new Grid(stage);
    expect(grid.rotate({ x: 2, z: 2 })).toBe(false);
    expect(grid.remove({ x: 2, z: 2 })).toBe(false);

    const result = findPath(grid);
    expect(result.complete).toBe(true);
    const bridgeHits = result.route.filter((p) => p.x === 2 && p.z === 2);
    expect(bridgeHits.length).toBe(2);
    expect(result.route[0]).toEqual({ x: 0, z: 2 });
    expect(result.route.at(-1)).toEqual({ x: 2, z: 0 });
  });
});

describe('findPath: おやつ+橋', () => {
  it('橋の先のおやつを通ってゴールできる', () => {
    const grid = new Grid(bridgeCrossStage([{ x: 2, z: 3 }]));
    grid.place({ x: 2, z: 1 }, 'straight', 0);
    grid.place({ x: 2, z: 3 }, 'straight', 0);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route).toContainEqual({ x: 2, z: 3 });
    expect(result.route).toContainEqual({ x: 2, z: 2 });
  });

  it('東西だけつないでも南北ゴールには届かない', () => {
    const grid = new Grid(bridgeCrossStage([{ x: 2, z: 1 }]));
    grid.place({ x: 1, z: 2 }, 'straight', 90);
    grid.place({ x: 3, z: 2 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(false);
    expect(result.goalReachable).toBe(false);
  });
});

describe('Grid: 橋は固定で回転・除去不可', () => {
  it('fixed な橋は rotate/remove できない', () => {
    const grid = new Grid(bridgeCrossStage());
    expect(grid.panelAt({ x: 2, z: 2 })).toMatchObject({ kind: 'bridge', fixed: true });
    expect(grid.rotate({ x: 2, z: 2 })).toBe(false);
    expect(grid.remove({ x: 2, z: 2 })).toBe(false);
    expect(grid.panelAt({ x: 2, z: 2 })?.kind).toBe('bridge');
  });
});
