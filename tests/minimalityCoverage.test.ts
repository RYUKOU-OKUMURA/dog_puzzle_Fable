import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/stage/catalog';

/**
 * ステージごとの「意図解より短い別解がないこと」の検証手段カバレッジ台帳。
 *
 * これは証明ではなくチェックリストである。実際の検証は各 tests/wNstages.test.ts /
 * tests/revisitShortcut.slow.test.ts の中にあり、ここではステージidごとに「どの検証手段を
 * 使っているか」を記録するだけ。新ステージを追加したら、まず該当テストファイルに検証を書き、
 * それからここに検証手段を登録すること(登録を忘れると本ファイルのテストが落ちる)。
 *
 * 背景: expectNoShorterSolution / expectRouteIsMinimal / expectNoRevisitShortcut は各
 * wNstages.test.ts で手動で呼び出されており、新ステージで呼び忘れても機械検出されなかった
 * (M11 で w2-s3・w5-s2 の再訪ショートカット検証漏れが実際に起きた。docs/plan.md M11 註参照)。
 */

/** 「意図解より短い(マスクなし)別解がない」ことの検証手段 */
type MinimalityCheck =
  /** helpers.expectNoShorterSolution: マスクなし総当たり(canSolveWithAtMost)。短ルート向け */
  | 'no-shorter-solution'
  /** helpers.expectRouteIsMinimal: ルート各マスを外すと解けなくなることを個別に確認(線形・大型盤面向け) */
  | 'route-minimal'
  /** 機械検証テストが無い。テスト内コメント等の構造的な理由づけのみ(既知のギャップ) */
  | 'unverified-legacy';

/**
 * 「おやつマスクを使った再訪ショートカット(分岐点を別maskで再訪して手数を減らす別解)がない」
 * ことの検証手段。おやつのないステージは原理的に再訪ショートカットが起きないため 'not-applicable'。
 */
type RevisitShortcutCheck =
  /** おやつが無いステージ。マスクが常に0なので再訪ショートカットは原理的に発生しない */
  | 'not-applicable'
  /** helpers.expectNoRevisitShortcut を通常テスト(npm run test)内で実行 */
  | 'revisit-shortcut'
  /** helpers.expectNoRevisitShortcut を tests/revisitShortcut.slow.test.ts(SLOW=1 限定)で実行 */
  | 'revisit-shortcut-slow'
  /** マスク込み網羅探索が予算超過で完遂しないため、テスト内コメントの構造的保証で運用 */
  | 'structural-comment';

interface StageVerification {
  minimality: MinimalityCheck;
  revisitShortcut: RevisitShortcutCheck;
}

/**
 * ステージid → 検証手段。tests/w1〜w5stages.test.ts と tests/revisitShortcut.slow.test.ts を
 * 実際に読んで手で台帳化したもの(2026-07 時点)。
 */
const COVERAGE: Record<string, StageVerification> = {
  // W1: おやつなし。w1-s1 は expectNoShorterSolution(意図解3枚)で最小性を保証。
  'w1-s1': { minimality: 'no-shorter-solution', revisitShortcut: 'not-applicable' },
  'w1-s2': { minimality: 'no-shorter-solution', revisitShortcut: 'not-applicable' },
  'w1-s3': { minimality: 'no-shorter-solution', revisitShortcut: 'not-applicable' },
  'w1-s4': { minimality: 'no-shorter-solution', revisitShortcut: 'not-applicable' },

  // W2: 全ステージおやつあり。w2-s4 のみ再訪ショートカット網羅証明が slow(revisitShortcut.slow.test.ts)。
  'w2-s1': { minimality: 'no-shorter-solution', revisitShortcut: 'revisit-shortcut' },
  'w2-s2': { minimality: 'no-shorter-solution', revisitShortcut: 'revisit-shortcut' },
  'w2-s3': { minimality: 'no-shorter-solution', revisitShortcut: 'revisit-shortcut' },
  'w2-s4': { minimality: 'no-shorter-solution', revisitShortcut: 'revisit-shortcut-slow' },

  // W3: w3-s3 のみおやつあり(再訪ショートカット証明は slow)。他はおやつなし。
  'w3-s1': { minimality: 'route-minimal', revisitShortcut: 'not-applicable' },
  'w3-s2': { minimality: 'route-minimal', revisitShortcut: 'not-applicable' },
  'w3-s3': { minimality: 'route-minimal', revisitShortcut: 'revisit-shortcut-slow' },
  'w3-s4': { minimality: 'route-minimal', revisitShortcut: 'not-applicable' },

  // W4: w4-s2 はおやつありで再訪ショートカット証明が通常テストで完遂。
  // w4-s4 はおやつ4つで予算超過のため構造的保証(次数2鎖・橋飾りが行き止まり)で運用。
  'w4-s1': { minimality: 'route-minimal', revisitShortcut: 'not-applicable' },
  'w4-s2': { minimality: 'route-minimal', revisitShortcut: 'revisit-shortcut' },
  'w4-s3': { minimality: 'route-minimal', revisitShortcut: 'not-applicable' },
  'w4-s4': { minimality: 'route-minimal', revisitShortcut: 'structural-comment' },

  // W5: w5-s1(slow)・w5-s3(通常)は網羅証明が完遂。w5-s2・w5-s4 は純粋チェーン等の構造的保証で運用。
  // w5-s2 は M12 でおやつ5個(次数2鎖上)に拡張。再訪は引き続き構造的保証。
  'w5-s1': { minimality: 'route-minimal', revisitShortcut: 'revisit-shortcut-slow' },
  'w5-s2': { minimality: 'route-minimal', revisitShortcut: 'structural-comment' },
  'w5-s3': { minimality: 'route-minimal', revisitShortcut: 'revisit-shortcut' },
  'w5-s4': { minimality: 'route-minimal', revisitShortcut: 'structural-comment' },
};

describe('ステージ最小性検証のカバレッジ台帳', () => {
  it('WORLDS の全ステージが台帳に載っている(新ステージ追加時は検証手段の登録が必要)', () => {
    const missing: string[] = [];
    for (const world of WORLDS) {
      for (const stage of world.stages) {
        if (!(stage.id in COVERAGE)) missing.push(stage.id);
      }
    }
    expect(missing, '台帳未登録のステージ(検証手段を決めて COVERAGE に追加すること)').toEqual([]);
  });

  it('台帳に存在しないステージidが残っていない(ステージ削除・リネーム後の掃除漏れ検出)', () => {
    const liveIds = new Set(WORLDS.flatMap((w) => w.stages.map((s) => s.id)));
    const stale = Object.keys(COVERAGE).filter((id) => !liveIds.has(id));
    expect(stale, '台帳に残っている削除済み/リネーム済みステージid').toEqual([]);
  });

  it('おやつがあるステージは revisitShortcut が not-applicable ではない', () => {
    const wrong: string[] = [];
    for (const world of WORLDS) {
      for (const stage of world.stages) {
        const hasTreats = (stage.treats?.length ?? 0) > 0;
        const entry = COVERAGE[stage.id];
        if (hasTreats && entry?.revisitShortcut === 'not-applicable') wrong.push(stage.id);
      }
    }
    expect(wrong, 'おやつがあるのに revisitShortcut 未検証扱いのステージ').toEqual([]);
  });

  it('おやつが無いステージは revisitShortcut が not-applicable', () => {
    const wrong: string[] = [];
    for (const world of WORLDS) {
      for (const stage of world.stages) {
        const hasTreats = (stage.treats?.length ?? 0) > 0;
        const entry = COVERAGE[stage.id];
        if (!hasTreats && entry && entry.revisitShortcut !== 'not-applicable') wrong.push(stage.id);
      }
    }
    expect(
      wrong,
      'おやつが無いのに revisitShortcut 検証ありになっているステージ(台帳の誤記)',
    ).toEqual([]);
  });
});
