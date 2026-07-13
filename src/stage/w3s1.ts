import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W3-1「フランスの まち 1」8×8 (🦴3: ダミースロット導入・ダミー2)
 *
 * 設計意図: おやつなし。東へ進んで南下しゴールへ至る L字経路(スロット6)。
 * (4,2) は途中で西へ曲がるおとり、(5,4) はゴール手前で南へ伸びるおとり。
 * どちらも正解ルートに隣接し、途中まで同じに見える偽ルートの入口になる。
 * 経路: ★(1,1)→(2,1)(3,1)(4,1)(5,1)→(5,2)(5,3)→◎(6,3)。
 */
export const w3s1: StageDef = defineStage({
  id: 'w3-s1',
  name: 'フランスの まち 1',
  world: 'w3',
  encounterDogId: 'poodle',
  difficulty: 3,
  palette: ['straight', 'corner', 'tee'],
  map: [
    '噴 .  家 .  山 .  噴 .',
    '家 ★ □  □  □  □  .  家',
    '.  .  .  .  □  □  .  山',
    '噴 .  .  .  .  □  ◎  家',
    '家 .  .  .  .  □  .  噴',
    '山 噴 .  家 .  .  .  .',
    '.  .  家 .  山 噴 .  家',
    '家 .  .  噴 .  .  山 .',
  ],
});
