import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W2-4「イギリスの まち 4」8×8 (🦴4: おやつ3個 + おとりスロット)
 *
 * 設計意図: おやつ3個。東へ→南下→西へ折り返す U字経路(スロット8)の途中におやつ3つ。
 * (6,2)(5,4) は経路に使えないおとりスロット(正解には使わない)。
 * 経路: ★(1,1)→(2,1)(3,1)(4,1)[おやつ](5,1)→(5,2)[おやつ](5,3)→(4,3)[おやつ](3,3)→◎(2,3)。
 *
 * テキスト地図で定義(plan.md M1 フォーマット)。トークンは w2s1 に同じ。
 */
export const w2s4: StageDef = defineStage({
  id: 'w2-s4',
  name: 'イギリスの まち 4',
  world: 'w2',
  encounterDogId: 'golden',
  difficulty: 4,
  palette: ['straight', 'corner', 'tee'],
  treats: ['4,1', '5,2', '4,3'],
  map: [
    '.  レ .  電 .  レ .  電',
    '電 ★ □  □  □  □  .  レ',
    '.  .  .  .  .  □  □  .',
    '電 .  ◎ □  □  □  .  レ',
    '.  .  .  .  .  □  .  .',
    'レ .  電 .  .  .  .  電',
    '.  .  .  レ .  電 .  .',
    '電 レ .  .  .  .  レ .',
  ],
});
