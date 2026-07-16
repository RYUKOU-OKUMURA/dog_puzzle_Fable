import type { DogInfo } from '../stage/dogs';

/** 出会いカードと図鑑カードで共通の、犬プロフィール行のHTML。表示項目を増やすときはここ1箇所 */
export function dogInfoLinesHtml(dog: DogInfo, opts?: { triviaClass?: string }): string {
  const triviaAttr = opts?.triviaClass ? ` class="${opts.triviaClass}"` : '';
  return (
    `<div>🌏 うまれたくに: ${dog.originHtml}</div>` +
    `<div>💗 せいかく: ${dog.personality}</div>` +
    `<div>📏 おおきさ: ${dog.size}</div>` +
    `<div${triviaAttr}>💡 ${dog.trivia}</div>`
  );
}
