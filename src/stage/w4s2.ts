import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W4-2「アメリカの まち 2」8×8 (🦴4: 橋1+おやつ2)
 *
 * 設計意図: 橋を南北に通り、橋の前後におやつ2つ。遠回りしないとおやつを取りこぼす。
 * ダミー1: (4,2)は橋の北東のおとり(東西固定道に隣接)。
 * 経路: ★(1,1)→(2,1)[おやつ](3,1)→(3,2)→橋(3,3)→(3,4)[おやつ]→(3,5)(4,5)→◎(5,5)。
 */
export const w4s2: StageDef = defineStage({
  id: 'w4-s2',
  name: 'アメリカの まち 2',
  world: 'w4',
  encounterDogId: 'bostonTerrier',
  difficulty: 4,
  palette: ['straight', 'corner', 'tee'],
  treats: ['2,1', '3,4'],
  map: [
    'サ .  カ .  サ .  カ .',
    '.  ★ □  □  .  .  .  カ',
    'カ .  .  │  □  .  .  .',
    '.  .  ─  橋 ─  .  .  カ',
    'サ .  .  │  .  .  .  .',
    '.  .  .  □  □  ◎  .  カ',
    'カ .  サ .  .  .  サ .',
    '.  カ .  .  カ .  カ .',
  ],
});
