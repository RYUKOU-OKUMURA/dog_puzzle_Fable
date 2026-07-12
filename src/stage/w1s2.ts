import { defineStage } from './stageMap';
import type { StageDef } from '../core/types';

/**
 * W1-2「にほんの まち 2」8×8 (🦴2: 曲がり角めいろ)
 *
 * 設計意図: 曲がり角(corner)を多用する「階段状」の経路をあてる。
 * ★(1,1)から◎(6,4)まで、固定道2マス(┐と─)を挟んで5回曲がる。
 * スロット6マスのうち5マスが経路上の corner、残り1マス(3,5)は釣り用デコイ。
 *
 * テキスト地図で定義(plan.md M1 フォーマット)。トークン:
 *   . = 芝生 / □ = 空きスロット / ★ = スタート(おうち) / ◎ = ゴール
 *   ┐ ─ = 固定道 / 木 家 ビ 花 池 鳥 = 添景(鳥は鳥居)
 *   ★◎の向きは隣接する道/スロットから自動で決まる
 */
export const w1s2: StageDef = defineStage({
  id: 'w1-s2',
  name: 'にほんの まち 2',
  world: 'w1',
  encounterDogId: 'chin',
  difficulty: 2,
  palette: ['straight', 'corner', 'tee'],
  treats: [],
  map: [
    '木 .  .  家 .  木 .  鳥',
    '花 ★ ┐  家 .  ビ .  木',
    '木 池 □  □  花 .  家 .',
    '花 .  木 □  □  .  花 ビ',
    '木 家 .  池 □  ─  ◎  家',
    '花 .  .  □  .  .  木 花',
    '木 .  ビ .  .  鳥 .  木',
    '花 .  .  木 .  家 .  木',
  ],
});
