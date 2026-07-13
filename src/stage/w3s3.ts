import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W3-3「スイスの まち 1」8×8 (🦴4: おやつ2 + ダミー3)
 *
 * 設計意図: おやつ2つを通る U字遠回り。最短に見える南下はおやつを取りこぼす。
 * ダミー3: (6,2)=東の行き止まり、(3,4)(5,4)=底辺の寄り道おとり。
 * 経路: ★(1,1)→(2,1)(3,1)[おやつ](4,1)(5,1)→(5,2)(5,3)→(4,3)[おやつ](3,3)→◎(2,3)。
 */
export const w3s3: StageDef = defineStage({
  id: 'w3-s3',
  name: 'スイスの まち 1',
  world: 'w3',
  encounterDogId: 'saintBernard',
  difficulty: 4,
  palette: ['straight', 'corner', 'tee'],
  treats: ['3,1', '4,3'],
  map: [
    '山 .  家 .  噴 .  山 .',
    '家 ★ □  □  □  □  .  家',
    '噴 .  .  .  .  □  □  山',
    '.  .  ◎ □  □  □  .  家',
    '家 .  .  □  .  □  .  噴',
    '山 噴 .  .  家 .  .  .',
    '.  .  家 .  山 噴 .  家',
    '家 .  .  噴 .  .  山 .',
  ],
});
