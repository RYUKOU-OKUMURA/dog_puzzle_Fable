import { describe, it } from 'vitest';
import { expectNoRevisitShortcut } from './helpers';
import { w2s4 } from '../src/stage/w2s4';
import { w3s3 } from '../src/stage/w3s3';
import { w5s1 } from '../src/stage/w5s1';

/** Node の process.env。@types/node なしで参照するため globalThis 経由 */
function envFlag(name: string): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return Boolean(env?.[name]);
}

/**
 * 再訪ショートカット網羅証明のうち実行が長い3件(M11.1)。
 *
 * 通常の `npm run test` を数秒以内に保つため、環境変数 SLOW があるときだけ実行する。
 * 実行: `npm run test:slow`(SLOW=1 + 本ファイル)。
 *
 * 実測(予算20M・意図解−1枚): w2-s4≈30秒 / w3-s3≈80秒 / w5-s1≈100秒。
 */
describe.skipIf(!envFlag('SLOW'))('再訪ショートカット網羅証明(slow)', () => {
  it('w2-s4: 意図解(12枚)より短い再訪ショートカット別解がない', () => {
    expectNoRevisitShortcut(w2s4, 12);
  }, 300_000);

  it('w3-s3: 意図解(12枚)より短い再訪ショートカット別解がない', () => {
    expectNoRevisitShortcut(w3s3, 12);
  }, 300_000);

  it('w5-s1: 意図解(14枚)より短い再訪ショートカット別解がない', () => {
    expectNoRevisitShortcut(w5s1, 14);
  }, 300_000);
});
