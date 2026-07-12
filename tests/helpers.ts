import type { StageDef } from '../src/core/types';

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
