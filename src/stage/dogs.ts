export interface DogInfo {
  id: string;
  /** ふりがな付き表示名(<ruby> を含むHTML) */
  nameHtml: string;
  /** ひらがなだけの短い呼び名 */
  shortName: string;
  originHtml: string;
  personality: string;
  size: string;
  trivia: string;
  /** 3Dモデルの毛色 */
  furColor: number;
  /** モデルの大きさ(柴犬=1) */
  scale: number;
}

export const DOGS: Record<string, DogInfo> = {
  shiba: {
    id: 'shiba',
    nameHtml: '<ruby>柴犬<rt>しばいぬ</rt></ruby>',
    shortName: 'しばちゃん',
    originHtml: '<ruby>日本<rt>にほん</rt></ruby>',
    personality: 'かいぬしに とっても ちゅうじつ',
    size: 'ちいさめ (たいじゅう 8〜10kg くらい)',
    trivia: 'しっぽが くるんと まいているのが チャームポイント。にほんの てんねんきねんぶつだよ。',
    furColor: 0xe8a05c,
    scale: 1,
  },
  akita: {
    id: 'akita',
    nameHtml: '<ruby>秋田犬<rt>あきたけん</rt></ruby>',
    shortName: 'あきたけん',
    originHtml: '<ruby>日本<rt>にほん</rt></ruby>',
    personality: 'おとなしくて がまんづよい',
    size: 'おおきい (たいじゅう 35〜50kg くらい)',
    trivia: 'ゆうめいな「ハチこう」も あきたけん。ゆきの さむさにも つよいんだ。',
    furColor: 0xf0cba8,
    scale: 1.35,
  },
};

/** 図鑑に載る順番 */
export const DOG_ORDER = ['shiba', 'akita'];
