import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W2-2「イギリスの まち 2」8×8 (🦴3: おやつ2個 + U字の遠回り)
 *
 * 設計意図: おやつ2個。★(1,1)から東へ→(5,1)で南下→(5,3)で西へ折り返す U字経路(スロット7)
 * の途中におやつ2つ。(6,2)は接続しないおとりスロット。
 * 経路: ★(1,1)→(2,1)(3,1)[おやつ](4,1)(5,1)→(5,2)(5,3)→(4,3)[おやつ]→◎(3,3)。
 *
 * テキスト地図で定義(plan.md M1 フォーマット)。トークンは w2s1 に同じ。
 */
export const w2s2: StageDef = defineStage({
  id: 'w2-s2',
  name: 'イギリスの まち 2',
  world: 'w2',
  encounterDogId: 'beagle',
  difficulty: 3,
  palette: ['straight', 'corner', 'tee'],
  treats: ['3,1', '4,3'],
  map: [
    '.  レ .  電 .  レ .  電',
    '電 ★ □  □  □  □  .  レ',
    'レ .  電 .  .  □  □  .',
    '.  .  電 ◎ □  □  電 レ',
    '.  .  .  .  .  .  .  電',
    '電 .  レ .  電 .  .  .',
    '.  .  .  電 .  レ .  電',
    'レ 電 .  .  .  .  レ .',
  ],
});
