import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W5-3「ちゅうかがい」9×9 (🦴5: 全部乗せ — 橋+おやつ+palette制限+ダミー)
 *
 * 設計意図: T字なし palette。橋2+おやつ2+ダミー。橋を使わないとおやつを集め切れない。
 * 経路: ★(1,1)→(2,1)[おやつ](3,1)→橋(3,2)→(3,3)[おやつ](3,4)(4,4)→橋(5,4)
 *       →(6,4)(6,5)(6,6)→◎(7,6)。
 * ダミー: (2,5)(6,3)。
 */
export const w5s3: StageDef = defineStage({
  id: 'w5-s3',
  name: 'ちゅうかがい',
  world: 'w5',
  encounterDogId: 'shihTzu',
  difficulty: 5,
  theme: 'chinatown',
  palette: ['straight', 'corner'],
  treats: ['2,1', '3,3'],
  map: [
    'カ .  花 .  カ .  花 .  カ',
    '.  ★ □  □  .  .  .  .  花',
    '花 .  .  橋 ─  .  .  .  .',
    'カ .  .  │  .  .  □  .  花',
    '.  .  .  □  □  橋 □  .  カ',
    '花 .  □  □  .  .  □  .  .',
    'カ .  .  .  花 .  □  ◎  花',
    '.  花 .  カ .  .  .  .  .',
    'カ .  .  花 .  カ .  花 .',
  ],
});
