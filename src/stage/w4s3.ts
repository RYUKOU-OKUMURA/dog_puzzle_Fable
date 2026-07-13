import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W4-3「メキシコの まち 1」8×8 (🦴4: 橋2+ダミー)
 *
 * 設計意図: 橋を2つ使い、S字でゴールへ。おやつなし。ダミーで偽ルートを増やす。
 * 橋(3,2)を南北、橋(5,4)を東西に通る。橋を使わないと東西・南北が分断される。
 * 経路: ★(1,1)→(2,1)(3,1)→橋(3,2)→(3,3)(3,4)(4,4)→橋(5,4)→(6,4)→◎(6,5)。
 */
export const w4s3: StageDef = defineStage({
  id: 'w4-s3',
  name: 'メキシコの まち 1',
  world: 'w4',
  encounterDogId: 'malamute',
  difficulty: 4,
  palette: ['straight', 'corner', 'tee'],
  map: [
    'カ .  サ .  カ .  サ .',
    '.  ★ □  □  .  .  .  カ',
    'サ .  .  橋 ─  .  .  .',
    'カ .  .  │  .  .  .  サ',
    '.  .  .  □  □  橋 □  カ',
    'サ .  .  □  .  .  ◎  .',
    'カ .  サ .  カ .  .  サ',
    '.  カ .  .  サ .  カ .',
  ],
});
