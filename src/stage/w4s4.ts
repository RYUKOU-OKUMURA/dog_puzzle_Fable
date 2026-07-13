import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W4-4「メキシコの まち 2」9×9 (🦴5: 橋2+おやつ3)
 *
 * 設計意図: 2橋+おやつ3の総仕上げ。橋を両方使わないとおやつを集め切れない。
 * ダミー2: (2,5)(6,3)は途中の寄り道おとり。
 * 経路: ★(1,1)→(2,1)[おやつ](3,1)→橋(3,2)→(3,3)[おやつ](3,4)(4,4)→橋(5,4)
 *       →(6,4)(6,5)[おやつ](6,6)→◎(7,6)。
 */
export const w4s4: StageDef = defineStage({
  id: 'w4-s4',
  name: 'メキシコの まち 2',
  world: 'w4',
  encounterDogId: 'labrador',
  difficulty: 5,
  palette: ['straight', 'corner', 'tee'],
  treats: ['2,1', '3,3', '6,5'],
  map: [
    'サ .  カ .  サ .  カ .  サ',
    '.  ★ □  □  .  .  .  .  カ',
    'カ .  .  橋 ─  .  .  .  .',
    'サ .  .  │  .  .  □  .  カ',
    '.  .  .  □  □  橋 □  .  サ',
    'カ .  □  □  .  .  □  .  .',
    'サ .  .  .  カ .  □  ◎  カ',
    '.  カ .  サ .  .  .  .  .',
    'カ .  .  カ .  サ .  カ .',
  ],
});
