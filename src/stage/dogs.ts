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
    personality: 'なかまが だいすきで こうきしんが つよい',
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
      'イギリスを だいひょうする いぬ。がんこそうに みえるけれど おとなしくて とっても やさしいよ。',
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
  poodle: {
    id: 'poodle',
    nameHtml: 'プードル',
    shortName: 'プードル',
    originHtml: 'フランス(げんしゅは ドイツ)',
    personality: 'あたまが よくて かいてき すき',
    size: 'ちいさい〜おおきい (トイ〜スタンダード)',
    trivia:
      'もとは <ruby>水鳥<rt>みずどり</rt></ruby>を とる <ruby>猟犬<rt>りょうけん</rt></ruby>。カットした けが ゆうめいだけど、おとなしくて かしこい いぬ だよ。',
    furColor: 0xf5e6d3,
    scale: 0.85,
  },
  papillon: {
    id: 'papillon',
    nameHtml: 'パピヨン',
    shortName: 'パピヨン',
    originHtml: 'フランス(ベルギーとも)',
    personality: 'あかるくて ひとなつっこい',
    size: 'とても ちいさい (たいじゅう 2〜5kg くらい)',
    trivia:
      'なまえは フランスごで「ちょうちょ」。おおきた みみが ちょうちょの はねみたいで かわいいよ。',
    furColor: 0xe8d4b8,
    scale: 0.7,
  },
  saintBernard: {
    id: 'saintBernard',
    nameHtml: 'セントバーナード',
    shortName: 'セントバーナード',
    originHtml: 'スイス',
    personality: 'おとなしくて やさしい きょじん',
    size: 'とても おおきい (たいじゅう 65〜120kg くらい)',
    trivia:
      'アルプスの <ruby>雪山<rt>ゆきやま</rt></ruby>で まよった ひとを たすけていた いぬ。おおきな たるを くびから さげた えが ゆうめいだよ。',
    furColor: 0xc48a5a,
    scale: 1.35,
  },
  bernese: {
    id: 'bernese',
    nameHtml: 'バーニーズマウンテンドッグ',
    shortName: 'バーニーズ',
    originHtml: 'スイス',
    personality: 'おだやかで かぞくに ちゅうじつ',
    size: 'おおきい (たいじゅう 35〜55kg くらい)',
    trivia:
      'スイスの <ruby>山<rt>やま</rt></ruby>で <ruby>農作業<rt>のうさぎょう</rt></ruby>を てつだっていた いぬ。くろ・しろ・ちゃいろの さんしょくが トレードマークだよ。',
    furColor: 0x3d2e28,
    scale: 1.28,
  },
  chihuahua: {
    id: 'chihuahua',
    nameHtml: 'チワワ',
    shortName: 'チワワ',
    originHtml: 'メキシコ',
    personality: 'ちいさくても きあいが じゅうぶん',
    size: 'とても ちいさい (たいじゅう 1.5〜3kg くらい)',
    trivia:
      'せかいで いちばん ちいさい いぬの ひとつ。なまえは メキシコの <ruby>州<rt>しゅう</rt></ruby>「チワワ」から ついたよ。',
    furColor: 0xe8b888,
    scale: 0.65,
  },
  bostonTerrier: {
    id: 'bostonTerrier',
    nameHtml: 'ボストンテリア',
    shortName: 'ボストン',
    originHtml: '<ruby>アメリカ<rt>あめりか</rt></ruby>',
    personality: 'あかるくて ひとなつっこい',
    size: 'ちいさめ (たいじゅう 5〜11kg くらい)',
    trivia:
      'アメリカの <ruby>マサチューセッツ州<rt>まさちゅーせっつしゅう</rt></ruby>・ボストンで うまれた いぬ。くろと しろの ほうせきみたいな もようが かわいいよ。',
    furColor: 0x4a3a35,
    scale: 0.8,
  },
  malamute: {
    id: 'malamute',
    nameHtml: 'アラスカンマラミュート',
    shortName: 'マラミュート',
    originHtml: '<ruby>アメリカ<rt>あめりか</rt></ruby>(アラスカ)',
    personality: 'ちからもちで なかよし',
    size: 'おおきい (たいじゅう 34〜45kg くらい)',
    trivia:
      'アラスカの <ruby>先住民<rt>せんじゅうみん</rt></ruby>と いっしょに そりを ひいていた いぬ。ハスキーに にてるけど、もっと おおきくて がっしりしているよ。',
    furColor: 0xc5cdd4,
    scale: 1.3,
  },
  labrador: {
    id: 'labrador',
    nameHtml: 'ラブラドールレトリバー',
    shortName: 'ラブラドール',
    originHtml:
      '<ruby>カナダ<rt>かなだ</rt></ruby>(げんしゅ) / <ruby>アメリカ<rt>あめりか</rt></ruby>で にんき',
    personality: 'おとなしくて かしこく やさしい',
    size: 'おおきい (たいじゅう 25〜36kg くらい)',
    trivia:
      '<ruby>盲導犬<rt>もうどうけん</rt></ruby>や <ruby>介助犬<rt>かいじょけん</rt></ruby>としても がんばる いぬ。およぐのが とくいで、しっぽは カヌーの オールみたいだよ。',
    furColor: 0xd4a06a,
    scale: 1.22,
  },
  husky: {
    id: 'husky',
    nameHtml: 'シベリアンハスキー',
    shortName: 'ハスキー',
    originHtml: '<ruby>ロシア<rt>ろしあ</rt></ruby>(シベリア)',
    personality: 'げんきで なかまおもい',
    size: 'おおきめ (たいじゅう 16〜27kg くらい)',
    trivia:
      'さむい ちほうで そりを ひいていた いぬ。あおくて きれいな めや、くろと しろの けが チャームポイントだよ。',
    furColor: 0xc8d0d8,
    scale: 1.15,
  },
  samoyed: {
    id: 'samoyed',
    nameHtml: 'サモエド',
    shortName: 'サモエド',
    originHtml: '<ruby>ロシア<rt>ろしあ</rt></ruby>(シベリア)',
    personality: 'あかるくて ひとなつっこい',
    size: 'ふつう〜おおきめ (たいじゅう 16〜30kg くらい)',
    trivia:
      'まっしろで ふわふわの けと、「サモエドスマイル」と よばれる わらいがおが ゆうめい。さむさに とっても つよいよ。',
    furColor: 0xf4f2ee,
    scale: 1.1,
  },
  shihTzu: {
    id: 'shihTzu',
    nameHtml: 'シーズー',
    shortName: 'シーズー',
    originHtml: '<ruby>中国<rt>ちゅうごく</rt></ruby>(チベットとも)',
    personality: 'おだやかで あいそが いい',
    size: 'ちいさい (たいじゅう 4〜7kg くらい)',
    trivia:
      'ながい けが ライオンの たてがみみたい。むかしの <ruby>中国<rt>ちゅうごく</rt></ruby>の きゅうでんで かわいがられていた いぬ だよ。',
    furColor: 0xe8dcc8,
    scale: 0.72,
  },
  dachshund: {
    id: 'dachshund',
    nameHtml: 'ダックスフンド',
    shortName: 'ダックス',
    originHtml: 'ドイツ',
    personality: 'ゆうかんで こうきしんが つよい',
    size: 'ちいさめ (あしが みじかくて どうが ながい)',
    trivia:
      'ドイツごで「アナグマの いぬ」。みじかい あしで あなに もぐって かりを てつだっていたんだ。いまは かぞくの アイドル。',
    furColor: 0xb87333,
    scale: 0.78,
  },
};

/** 図鑑に載る順番(相棒の柴犬 → ワールド順の出会い)。全21種 */
export const DOG_ORDER = [
  'shiba',
  'akita',
  'chin',
  'spitz',
  'kai',
  'corgi',
  'beagle',
  'bulldog',
  'golden',
  'poodle',
  'papillon',
  'saintBernard',
  'bernese',
  'chihuahua',
  'bostonTerrier',
  'malamute',
  'labrador',
  'husky',
  'samoyed',
  'shihTzu',
  'dachshund',
];
