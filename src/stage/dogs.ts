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
  chin: {
    id: 'chin',
    nameHtml: '<ruby>狆<rt>ちん</rt></ruby>',
    shortName: 'ちん',
    originHtml: '<ruby>日本<rt>にほん</rt></ruby>',
    personality: 'おだやかで あいきょうが ある',
    size: 'ちいさい (たいじゅう 2〜5kg くらい)',
    trivia:
      'むかしの にほんの おうさまの そばで かわいがられていたんだよ。たかい ところに のぼるのが すき。',
    furColor: 0x9c7b5a,
    scale: 0.72,
  },
  spitz: {
    id: 'spitz',
    nameHtml: '<ruby>日本<rt>にほん</rt></ruby>スピッツ',
    shortName: 'スピッツ',
    originHtml: '<ruby>日本<rt>にほん</rt></ruby>',
    personality: 'あかるくて ひとなつっこい',
    size: 'ややちいさい (たいじゅう 5〜10kg くらい)',
    trivia: 'まっしろで ふわふわの けが じまん。ぴんと みみが たって とっても カワイイよ。',
    furColor: 0xeef2ef,
    scale: 0.9,
  },
  kai: {
    id: 'kai',
    nameHtml: '<ruby>甲斐犬<rt>かいけん</rt></ruby>',
    shortName: 'かいけん',
    originHtml: '<ruby>日本<rt>にほん</rt></ruby>(<ruby>山梨<rt>やまなし</rt></ruby>)',
    personality: 'かいぬしに とっても ちゅうじつな せいかく',
    size: 'ふつう (たいじゅう 11〜18kg くらい)',
    trivia:
      'とらみたいな しまもようの けが トレードマーク。<ruby>山梨<rt>やまなし</rt></ruby>の やまで そだった、にほんの てんねんきねんぶつだよ。',
    furColor: 0x7a5a3e,
    scale: 1.05,
  },
  corgi: {
    id: 'corgi',
    nameHtml: 'コーギー',
    shortName: 'コーギー',
    originHtml: 'イギリス(ウェールズ)',
    personality: 'あたまが よくて げんきいっぱい',
    size: 'ちいさめ (たいじゅう 10〜14kg くらい)',
    trivia:
      'イギリスの <ruby>女王<rt>じょおう</rt></ruby>に なんねんも あいされた ゆうめいな いぬ。みじかい あしで うしを あつめる <ruby>牧牛犬<rt>ぼくぎゅうけん</rt></ruby> だったよ。',
    furColor: 0xe09a55,
    scale: 0.82,
  },
  beagle: {
    id: 'beagle',
    nameHtml: 'ビーグル',
    shortName: 'ビーグル',
    originHtml: 'イギリス',
    personality: 'なかまづきで こうきしんが つよい',
    size: 'ふつう (たいじゅう 9〜11kg くらい)',
    trivia:
      'はなの ききが ばつぐん。<ruby>元<rt>もと</rt></ruby>は うさぎを おう <ruby>猟犬<rt>りょうけん</rt></ruby> だったよ。スヌーピーの モデル。',
    furColor: 0xb07a45,
    scale: 0.95,
  },
  bulldog: {
    id: 'bulldog',
    nameHtml: 'ブルドッグ',
    shortName: 'ブルドッグ',
    originHtml: 'イギリス',
    personality: 'おだやかで ゆうかん',
    size: 'ふつう (たいじゅう 18〜25kg くらい)',
    trivia:
      'イギリスを だいひょうする いぬ。がんこうに みえるけれど おとなしくて とっても やさしいよ。',
    furColor: 0xd9b08c,
    scale: 0.92,
  },
  golden: {
    id: 'golden',
    nameHtml: 'ゴールデンレトリバー',
    shortName: 'ゴールデン',
    originHtml: 'イギリス(スコットランド)',
    personality: 'おとなしくて かしこく やさしい',
    size: 'おおきい (たいじゅう 25〜34kg くらい)',
    trivia:
      '<ruby>水鳥<rt>みずどり</rt></ruby>を とる <ruby>猟犬<rt>りょうけん</rt></ruby>。およぐのが とくいで、ひとの てつだいを する やさしい いぬ なんだ。',
    furColor: 0xe8c478,
    scale: 1.3,
  },
};

/** 図鑑に載る順番(相棒の柴犬 → ワールド1 → ワールド2の出会い順) */
export const DOG_ORDER = ['shiba', 'akita', 'chin', 'spitz', 'kai', 'corgi', 'beagle', 'bulldog', 'golden'];
