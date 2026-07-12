import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W1-1「にほんの まち 1」8×8 (🦴1: チュートリアル)
 *
 * フェーズ1の stage01 を w1-s1 にリネームしたもの。地図・スロット・固定道・添景は
 * 移行前と完全一致(tests/stageMap.test.ts が照合)。M1の判断メモ参照。
 *
 * テキスト地図で定義(plan.md M1 フォーマット)。トークン:
 *   . = 芝生 / □ = 空きスロット / ★ = スタート(おうち) / ◎ = ゴール
 *   │ ─ = 固定のまっすぐ道 / 木 家 ビ 花 池 鳥 = 添景(鳥は鳥居)
 *   ★◎の向きは隣接する道/スロットから自動で決まる
 */
export const w1s1: StageDef = defineStage({
  id: 'w1-s1',
  name: 'にほんの まち 1',
  world: 'w1',
  encounterDogId: 'akita',
  difficulty: 1,
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
