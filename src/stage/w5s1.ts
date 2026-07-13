import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W5-1「ゆきの まち」10×10 (🦴4: 全要素ひかえめ複合)
 *
 * 設計意図: 最大盤面で橋1+おやつ1+ダミー1。W4導入〜中級の複合をひかえめに。
 * 経路: ★(1,1)→(2,1)(3,1)[おやつ](4,1)→(4,2)(4,3)→橋(4,4)→(4,5)(4,6)
 *       →(5,6)(6,6)→(6,7)(6,8)→◎(7,8)。
 * ダミー: (5,3)は橋手前の東へのおとり。
 */
export const w5s1: StageDef = defineStage({
  id: 'w5-s1',
  name: 'ゆきの まち',
  world: 'w5',
  encounterDogId: 'husky',
  difficulty: 4,
  theme: 'snow',
  palette: ['straight', 'corner', 'tee'],
  treats: ['3,1'],
  map: [
    '山 .  木 .  山 .  木 .  山 .',
    '.  ★ □  □  □  .  .  .  .  木',
    '木 .  .  .  □  .  .  .  .  山',
    '山 .  .  .  □  □  .  .  .  木',
    '.  .  .  ─  橋 ─  .  .  .  山',
    '木 .  .  .  │  .  .  .  .  .',
    '山 .  .  .  □  □  □  .  .  山',
    '.  木 .  .  .  .  □  .  .  .',
    '木 .  .  .  .  .  □  ◎  .  山',
    '山 .  木 .  山 .  .  .  山 .',
  ],
});
