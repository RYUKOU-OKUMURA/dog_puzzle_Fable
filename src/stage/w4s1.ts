import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W4-1「アメリカの まち 1」8×8 (🦴3: 橋導入・交差1回)
 *
 * 設計意図: 橋1つを南北に1回だけ通る導入。東西の固定道は下を横切る見せ場(正解では使わない)。
 * ダミー1: (5,5)はゴール手前で東へ伸びるおとり。
 * 経路: ★(1,1)→(2,1)(3,1)→(3,2)→橋(3,3)→(3,4)→(3,5)(4,5)→◎(4,6)。
 * 意図解の (4,5) は南へ曲がるコーナー(ゴールが南隣)。
 */
export const w4s1: StageDef = defineStage({
  id: 'w4-s1',
  name: 'アメリカの まち 1',
  world: 'w4',
  encounterDogId: 'chihuahua',
  difficulty: 3,
  palette: ['straight', 'corner', 'tee'],
  map: [
    'サ .  カ .  サ .  カ .',
    '.  ★ □  □  .  .  .  カ',
    'カ .  .  │  .  .  .  .',
    '.  .  ─  橋 ─  .  .  カ',
    'サ .  .  │  .  .  .  .',
    '.  .  .  □  □  □  .  カ',
    'カ .  .  .  ◎  .  サ .',
    '.  サ .  カ .  .  カ .',
  ],
});
