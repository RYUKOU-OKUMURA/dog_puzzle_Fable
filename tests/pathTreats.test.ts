import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import type { GridPos, StageDef } from '../src/core/types';
import { MAX_TREATS, posKey } from '../src/core/types';
import { makeTestStage } from './helpers';

/**
 * おやつ収集(M5)の経路判定。状態を (マス, 取ったおやつのビットマスク) に拡張した BFS の検証。
 *   - おやつなしは従来どおり
 *   - 一本道のおやつは通過
 *   - 近道(おやつなし)と遠回り(おやつあり)がある盤面 → 遠回りを返す
 *   - どう組んでもおやつに届かない盤面 → complete=false & goalReachable=true(おやつ残り)
 */

/** makeTestStage におやつを足したステージを返す */
function stageWith(treats: GridPos[]): StageDef {
  return { ...makeTestStage(), treats };
}

const routeKeys = (route: GridPos[]): string[] => route.map(posKey);

describe('findPath: おやつなしは従来どおり', () => {
  it('おやつ未指定でも complete/route は従来挙動', () => {
    const grid = new Grid(makeTestStage());
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.goalReachable).toBe(true);
    expect(result.route).toEqual([
      { x: 0, z: 1 },
      { x: 1, z: 1 },
      { x: 2, z: 1 },
      { x: 3, z: 1 },
    ]);
  });

  it('おやつ空配列でも従来どおり', () => {
    const grid = new Grid(stageWith([]));
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route.at(-1)).toEqual({ x: 3, z: 1 });
  });
});

describe('findPath: 一本道上のおやつ', () => {
  it('経路上のおやつを通ってゴールする(ルートにおやつマスが含まれる)', () => {
    const grid = new Grid(stageWith([{ x: 1, z: 1 }]));
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route).toContainEqual({ x: 1, z: 1 });
    expect(result.route.at(-1)).toEqual({ x: 3, z: 1 });
  });
});

describe('findPath: 近道はおやつを通らないが遠回りは通る', () => {
  /**
   * 5×4 の盤面。上段(z=1)にまっすぐの近道、下段(z=2)におやつを通る遠回りループ。
   *   z\x 0    1    2    3    4
   *   1   ★→ ┬(1,1) ─(2,1) ┬(3,1) →◎
   *   2        └(1,2) ─(2,2)[おやつ] ┘(3,2)
   * 両ルートとも組める盤面で、全おやつルート(下段のループ)が返ることを保証する。
   */
  function branchStage(): StageDef {
    return {
      id: 'branch',
      name: 'わかれみち',
      size: { w: 5, h: 4 },
      start: { pos: { x: 0, z: 1 }, rotation: 90 },
      goal: { pos: { x: 4, z: 1 }, rotation: 270 },
      fixedRoads: [],
      slots: [
        { x: 1, z: 1 },
        { x: 2, z: 1 },
        { x: 3, z: 1 },
        { x: 1, z: 2 },
        { x: 2, z: 2 },
        { x: 3, z: 2 },
      ],
      scenery: [],
      encounterDogId: 'corgi',
      treats: [{ x: 2, z: 2 }],
    };
  }

  it('近道(おやつなし)だけ組んだ盤面は、おやつ残り扱い', () => {
    const grid = new Grid(branchStage());
    grid.place({ x: 1, z: 1 }, 'straight', 90); // 上段の近道のみ
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    grid.place({ x: 3, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    // ゴールには着くがおやつ(2,2)を通っていない
    expect(result.complete).toBe(false);
    expect(result.goalReachable).toBe(true);
  });

  it('両方組める盤面では、おやつを通る遠回りループが返る', () => {
    const grid = new Grid(branchStage());
    // 上段(近道)と下段(おやつループ)を同時に組む
    grid.place({ x: 1, z: 1 }, 'tee', 180); // ┬ W,E,S
    grid.place({ x: 2, z: 1 }, 'straight', 90); // ─
    grid.place({ x: 3, z: 1 }, 'tee', 180); // ┬ W,E,S
    grid.place({ x: 1, z: 2 }, 'corner', 0); // └ N,E
    grid.place({ x: 2, z: 2 }, 'straight', 90); // ─(おやつ)
    grid.place({ x: 3, z: 2 }, 'corner', 270); // ┘ N,W
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    // 返ったルートはおやつ(2,2)を通る遠回り
    expect(result.route).toContainEqual({ x: 2, z: 2 });
    expect(result.route).toContainEqual({ x: 1, z: 2 });
    expect(result.route).toContainEqual({ x: 3, z: 2 });
    expect(result.route.at(-1)).toEqual({ x: 4, z: 1 });
    // 近道(上段だけ)より長い
    expect(result.route.length).toBeGreaterThan(5);
  });
});

describe('findPath: どう組んでもおやつに届かない', () => {
  /**
   * おやつ(3,2)は ゴール(3,1) の南の孤立マス。ゴールは西向きで (3,2) 側へ接続しないため、
   * どんなパネルを置いてもおやつマスを経路に組み込めない。
   *   z\x 0    1    2    3
   *   1   ★→ □(1,1) □(2,1) ◎(goal)
   *   2                      □(3,2)[おやつ]
   */
  function isolatedTreatStage(): StageDef {
    return {
      id: 'isolated',
      name: 'おやつにとどかない',
      size: { w: 4, h: 3 },
      start: { pos: { x: 0, z: 1 }, rotation: 90 },
      goal: { pos: { x: 3, z: 1 }, rotation: 270 },
      fixedRoads: [],
      slots: [
        { x: 1, z: 1 },
        { x: 2, z: 1 },
        { x: 3, z: 2 },
      ],
      scenery: [],
      encounterDogId: 'corgi',
      treats: [{ x: 3, z: 2 }],
    };
  }

  it('ゴールには届くが、おやつが残る(おやつ残り扱い。ルートは空)', () => {
    const grid = new Grid(isolatedTreatStage());
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(false);
    expect(result.goalReachable).toBe(true);
    expect(result.route).toEqual([]); // おやつ残りは歩かない
  });

  it('孤立マスにパネルを置いてもおやつは取れない', () => {
    const grid = new Grid(isolatedTreatStage());
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    grid.place({ x: 3, z: 2 }, 'corner', 0); // ゴール側へ接続しようとしても無理
    const result = findPath(grid);
    expect(result.complete).toBe(false);
    expect(result.goalReachable).toBe(true);
  });
});

describe('findPath: おやつ3個(最大)の一本道', () => {
  it('3個のおやつをすべて通る', () => {
    const grid = new Grid(
      stageWith([
        { x: 1, z: 1 },
        { x: 2, z: 1 },
        { x: 2, z: 2 },
      ]),
    );
    // (2,2)は経路外なので、(1,1)(2,1)の2個だけ取れる → complete=false
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(false); // (2,2)のおやつが残る
    expect(result.goalReachable).toBe(true);
  });

  it('3個とも経路上にあれば complete', () => {
    const grid = new Grid(
      stageWith([
        { x: 1, z: 1 },
        { x: 2, z: 1 },
        { x: 0, z: 1 },
      ]),
    );
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(routeKeys(result.route)).toEqual(['0,1', '1,1', '2,1', '3,1']);
  });
});

describe('findPath: 同一座標のおやつ重複は無害化される', () => {
  it('同じマスに2つおやつがあっても1つ扱いで complete になる', () => {
    const grid = new Grid(
      stageWith([
        { x: 1, z: 1 },
        { x: 1, z: 1 },
      ]),
    );
    grid.place({ x: 1, z: 1 }, 'straight', 90);
    grid.place({ x: 2, z: 1 }, 'straight', 90);
    const result = findPath(grid);
    expect(result.complete).toBe(true);
    expect(result.route).toContainEqual({ x: 1, z: 1 });
  });
});

describe('findPath: おやつが最大数を超えると throw する(防御)', () => {
  // defineStage は構築時に弾くが、findPath は直接組まれた StageDef も受け取る。
  // 超過分を黙って切り捨てず、早く失敗することを保証する(M5.1)。
  it('最大数を超えるおやつを渡すと throw する', () => {
    const tooMany: GridPos[] = Array.from({ length: MAX_TREATS + 1 }, (_, i) => ({ x: i, z: 1 }));
    const stage: StageDef = { ...makeTestStage(), treats: tooMany };
    // Grid 生成時点では気づかない(パネル配置前)ので、findPath で弾く
    expect(() => new Grid(stage)).not.toThrow();
    expect(() => findPath(new Grid(stage))).toThrow(/おやつは \d+つまで です/);
  });

  it('最大数ちょうどなら throw しない', () => {
    const stage = stageWith([
      { x: 0, z: 1 },
      { x: 1, z: 1 },
      { x: 2, z: 1 },
    ]);
    expect(() => findPath(new Grid(stage))).not.toThrow();
  });
});
