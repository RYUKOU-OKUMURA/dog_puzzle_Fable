import type { StageDef } from '../core/types';
import { w1s1 } from './w1s1';
import { w1s2 } from './w1s2';
import { w1s3 } from './w1s3';
import { w1s4 } from './w1s4';

/**
 * ワールドの定義。5ワールド(にほん→せかいのたび)。
 * 各ワールドは最大4ステージを持つ。未実装ワールド(M5以降)は stages を空配列にし、
 * ワールド選択画面では「もうすぐ とうじょう」のロック扱いにする。
 */
export interface WorldDef {
  id: string;
  /** 表示名(<ruby> を含むHTML可) */
  nameHtml: string;
  /** テーマの絵文字 */
  emoji: string;
  /** 一言サブテキスト(かな中心) */
  sub: string;
  /** 順序付きステージ(最大4)。s1 が新要素の導入ステージ */
  stages: readonly StageDef[];
}

export const WORLDS: readonly WorldDef[] = [
  {
    id: 'w1',
    nameHtml: '<ruby>日本<rt>にほん</rt></ruby>',
    emoji: '🌸',
    sub: 'とりいと さくらの まち',
    stages: [w1s1, w1s2, w1s3, w1s4],
  },
  {
    id: 'w2',
    nameHtml: 'イギリス',
    emoji: '🏰',
    sub: 'れんがの まちと あかい でんわボックス',
    stages: [],
  },
  {
    id: 'w3',
    nameHtml: 'フランス と スイス',
    emoji: '🏔️',
    sub: 'いしだたみと アルプスの まち',
    stages: [],
  },
  {
    id: 'w4',
    nameHtml: 'アメリカ',
    emoji: '🌵',
    sub: 'サボテンと カラフルな まち',
    stages: [],
  },
  {
    id: 'w5',
    nameHtml: 'せかいの たび',
    emoji: '🌍',
    sub: 'ゆきのまち・よるのまち',
    stages: [],
  },
];
