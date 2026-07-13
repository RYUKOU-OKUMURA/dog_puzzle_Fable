import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W5-2「あたたかい よるの まち」9×9 (🦴4: おやつ+ダミー多め)
 *
 * 設計意図: おやつ2+ダミー4。橋なしで遠回り正解。短い内側通路がおとり。
 * 経路: ★(1,1)→(2,1)(3,1)(4,1)[おやつ](5,1)→(5,2)(5,3)(5,4)
 *       →(4,4)(3,4)[おやつ](2,4)→(2,5)(2,6)→(3,6)(4,6)→◎(5,6)。
 * ダミー: (3,2)(4,2)(3,5)(4,5) — 内側の「近道っぽい」通路。
 */
export const w5s2: StageDef = defineStage({
  id: 'w5-s2',
  name: 'あたたかい よるの まち',
  world: 'w5',
  encounterDogId: 'samoyed',
  difficulty: 4,
  theme: 'night',
  palette: ['straight', 'corner', 'tee'],
  treats: ['4,1', '3,4'],
  map: [
    '家 .  花 .  家 .  花 .  家',
    '花 ★ □  □  □  □  .  .  家',
    '家 .  .  □  □  □  .  .  花',
    '.  .  .  .  .  □  .  .  家',
    '家 .  □  □  □  □  .  .  花',
    '花 .  □  □  □  .  .  .  .',
    '家 .  □  □  □  ◎  花 .  家',
    '花 .  .  .  .  .  .  .  花',
    '.  家 .  花 .  家 .  花 .',
  ],
});
