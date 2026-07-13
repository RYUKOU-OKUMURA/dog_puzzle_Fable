import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W3-2「フランスの まち 2」8×8 (🦴3: T字なし + ダミー3)
 *
 * 設計意図: palette から tee を外す。S字の1本道(曲がりを先読み)。
 * T字が無いので分岐でごまかせず、どこで曲がるかを決めてから置く。
 * ダミー3: (3,2)=早すぎる南下、(5,2)=東への行き止まり、(3,4)=中腹の寄り道。
 * 経路: ★(1,1)→(2,1)(3,1)(4,1)→(4,2)(4,3)→(3,3)(2,3)→(2,4)(2,5)
 *       →(3,5)(4,5)(5,5)→◎(6,5)。
 */
export const w3s2: StageDef = defineStage({
  id: 'w3-s2',
  name: 'フランスの まち 2',
  world: 'w3',
  encounterDogId: 'papillon',
  difficulty: 3,
  palette: ['straight', 'corner'],
  map: [
    '噴 .  家 .  山 .  噴 .',
    '家 ★ □  □  □  .  .  家',
    '噴 .  .  □  □  □  .  山',
    '.  .  □  □  □  .  .  家',
    '家 .  □  □  .  .  .  噴',
    '山 .  □  □  □  □  ◎  .',
    '.  .  家 .  山 噴 .  家',
    '家 .  .  噴 .  .  山 .',
  ],
});
