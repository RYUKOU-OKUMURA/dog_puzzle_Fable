import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * ステージ1「にほんの まち」 8×8
 *
 * テキスト地図で定義(plan.md M1 フォーマット)。トークン:
 *   . = 芝生 / □ = 空きスロット / ★ = スタート(おうち) / ◎ = ゴール
 *   │ ─ = 固定のまっすぐ道 / 木 家 ビ 花 池 鳥 = 添景(鳥は鳥居)
 *   ★◎の向きは隣接する道/スロットから自動で決まる
 */
export const stage01: StageDef = defineStage({
  id: 'stage01',
  name: 'にほんの まち',
  world: 'w1',
  encounterDogId: 'akita',
  map: [
    '木 ビ .  家 .  木 ビ 木',
    '花 ★ .  池 .  家 .  木',
    '木 │ 家 .  花 ビ 木 .',
    '花 │ □ 木 │ 家 ビ 木',
    '木 □ ─ ─  □ ─ □ 家',
    '家 .  木 花 □ 木 │ 花',
    '木 ビ .  家 木 花 ◎ 木',
    '花 .  木 .  家 木 鳥 木',
  ],
  treats: [],
  palette: ['straight', 'corner', 'tee'],
});
