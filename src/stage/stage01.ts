import type { StageDef } from '../core/types';

/**
 * ステージ1「にほんの まち」 8×8
 *
 *   z\x 0    1     2     3     4     5     6     7
 *   0   木   ビル  .     家    .     木    ビル  木
 *   1   花   家★  .     池    .     家    .     木
 *   2   木   道│  家    .     花    ビル  木    .
 *   3   花   道│  空    木    道│   家    ビル  木
 *   4   木   空   道─   道─   空    道─   空    家
 *   5   家   .    木    花    空    木    道│   花
 *   6   木   ビル  .     家    木    花    Ｇ◎  木
 *   7   花   .    木    .     家    木    鳥居  木
 *
 *   ★=スタート(おうち、南向き) ◎=ゴール(北向き) 空=パネルを置ける空きマス
 *   最短解: (1,4)曲がり角 → (4,4)まっすぐ(またはT字路) → (6,4)曲がり角 の3枚
 */
export const stage01: StageDef = {
  id: 'stage01',
  name: 'にほんの まち',
  size: { w: 8, h: 8 },
  start: { pos: { x: 1, z: 1 }, rotation: 180 },
  goal: { pos: { x: 6, z: 6 }, rotation: 0 },
  fixedRoads: [
    { pos: { x: 1, z: 2 }, kind: 'straight', rotation: 0 },
    { pos: { x: 1, z: 3 }, kind: 'straight', rotation: 0 },
    { pos: { x: 2, z: 4 }, kind: 'straight', rotation: 90 },
    { pos: { x: 3, z: 4 }, kind: 'straight', rotation: 90 },
    { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 0 },
    { pos: { x: 5, z: 4 }, kind: 'straight', rotation: 90 },
    { pos: { x: 6, z: 5 }, kind: 'straight', rotation: 0 },
  ],
  slots: [
    { x: 1, z: 4 },
    { x: 4, z: 4 },
    { x: 6, z: 4 },
    { x: 4, z: 5 },
    { x: 2, z: 3 },
  ],
  scenery: [
    { pos: { x: 0, z: 0 }, kind: 'tree' },
    { pos: { x: 1, z: 0 }, kind: 'building' },
    { pos: { x: 3, z: 0 }, kind: 'house' },
    { pos: { x: 5, z: 0 }, kind: 'tree' },
    { pos: { x: 6, z: 0 }, kind: 'building' },
    { pos: { x: 7, z: 0 }, kind: 'tree' },
    { pos: { x: 0, z: 1 }, kind: 'flower' },
    { pos: { x: 3, z: 1 }, kind: 'pond' },
    { pos: { x: 5, z: 1 }, kind: 'house' },
    { pos: { x: 7, z: 1 }, kind: 'tree' },
    { pos: { x: 0, z: 2 }, kind: 'tree' },
    { pos: { x: 2, z: 2 }, kind: 'house' },
    { pos: { x: 4, z: 2 }, kind: 'flower' },
    { pos: { x: 5, z: 2 }, kind: 'building' },
    { pos: { x: 6, z: 2 }, kind: 'tree' },
    { pos: { x: 0, z: 3 }, kind: 'flower' },
    { pos: { x: 3, z: 3 }, kind: 'tree' },
    { pos: { x: 5, z: 3 }, kind: 'house' },
    { pos: { x: 6, z: 3 }, kind: 'building' },
    { pos: { x: 7, z: 3 }, kind: 'tree' },
    { pos: { x: 0, z: 4 }, kind: 'tree' },
    { pos: { x: 7, z: 4 }, kind: 'house' },
    { pos: { x: 0, z: 5 }, kind: 'house' },
    { pos: { x: 2, z: 5 }, kind: 'tree' },
    { pos: { x: 3, z: 5 }, kind: 'flower' },
    { pos: { x: 5, z: 5 }, kind: 'tree' },
    { pos: { x: 7, z: 5 }, kind: 'flower' },
    { pos: { x: 0, z: 6 }, kind: 'tree' },
    { pos: { x: 1, z: 6 }, kind: 'building' },
    { pos: { x: 3, z: 6 }, kind: 'house' },
    { pos: { x: 4, z: 6 }, kind: 'tree' },
    { pos: { x: 5, z: 6 }, kind: 'flower' },
    { pos: { x: 7, z: 6 }, kind: 'tree' },
    { pos: { x: 0, z: 7 }, kind: 'flower' },
    { pos: { x: 2, z: 7 }, kind: 'tree' },
    { pos: { x: 4, z: 7 }, kind: 'house' },
    { pos: { x: 5, z: 7 }, kind: 'tree' },
    { pos: { x: 6, z: 7 }, kind: 'torii' },
    { pos: { x: 7, z: 7 }, kind: 'tree' },
  ],
  encounterDogId: 'akita',
};
