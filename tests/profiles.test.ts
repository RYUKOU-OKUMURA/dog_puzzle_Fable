import { describe, expect, it } from 'vitest';
import { emptySave } from '../src/save/storage';
import {
  MAX_NAME_LENGTH,
  MAX_PROFILES,
  MIGRATED_DEFAULT_NAME,
  PROFILE_ICON_IDS,
  addProfile,
  createProfile,
  findProfile,
  isValidIconId,
  migrateFromV1,
  nextProfileId,
  removeProfile,
  updateProfile,
  validateName,
} from '../src/save/profiles';
import type { Profile } from '../src/save/profiles';

const NOW = '2026-07-12T00:00:00.000Z';

function profile(id: string, name = 'ためし', icon: Profile['iconId'] = 'shiba'): Profile {
  return createProfile({ id, name, iconId: icon, createdAt: NOW });
}

describe('定数', () => {
  it('プロフィールは最大4、なまえは最大8もじ、アイコンは6種', () => {
    expect(MAX_PROFILES).toBe(4);
    expect(MAX_NAME_LENGTH).toBe(8);
    expect(PROFILE_ICON_IDS.length).toBe(6);
  });
});

describe('validateName: ひらがな1〜8文字', () => {
  it('ひらがな1文字はOK', () => {
    expect(validateName('あ')).toEqual({ ok: true, name: 'あ' });
  });

  it('ひらがな8文字(上限)はOK', () => {
    const name = 'あいうえおかきく';
    expect(name.length).toBe(8);
    expect(validateName(name)).toEqual({ ok: true, name });
  });

  it('小書き・促音・濁点を含むひらがなはOK', () => {
    expect(validateName('きょうへい')).toEqual({ ok: true, name: 'きょうへい' });
    expect(validateName('きっちょう')).toEqual({ ok: true, name: 'きっちょう' });
    expect(validateName('がく')).toEqual({ ok: true, name: 'がく' });
  });

  it('前後の空白は詰めてOK', () => {
    expect(validateName('  こうへい  ')).toEqual({ ok: true, name: 'こうへい' });
  });

  it('空文字・空白のみ → なまえをいれてね', () => {
    const empty = validateName('');
    expect(empty.ok).toBe(false);
    expect(empty.ok === false && empty.reason).toMatch(/なまえを いれてね/);
    expect(validateName('   ').ok).toBe(false);
  });

  it('9文字 → 8もじまで', () => {
    const result = validateName('あいうえおかきくけ');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/8もじまで/);
  });

  it('カタカナ・漢字・英数字・記号は却下 → ひらがなで', () => {
    const ngCases = ['カイ', '太郎', 'taro', 'たろう1', 'あ-い', 'あ い', '★'];
    for (const name of ngCases) {
      const result = validateName(name);
      expect(result.ok, `「${name}」`).toBe(false);
      expect(result.ok === false && result.reason).toMatch(/ひらがなで/);
    }
  });
});

describe('isValidIconId', () => {
  it('既知のidはtrue、未知はfalse', () => {
    expect(isValidIconId('shiba')).toBe(true);
    expect(isValidIconId('paw')).toBe(true);
    expect(isValidIconId('unknown')).toBe(false);
    expect(isValidIconId('')).toBe(false);
  });
});

describe('nextProfileId: 既存と衝突しない最小の p{n}', () => {
  it('空なら p1', () => {
    expect(nextProfileId([])).toBe('p1');
  });
  it('連番の末尾を返す', () => {
    expect(nextProfileId(['p1'])).toBe('p2');
    expect(nextProfileId(['p1', 'p2', 'p3'])).toBe('p4');
  });
  it('欠番があればその最小を埋める(削除後の再利用)', () => {
    expect(nextProfileId(['p1', 'p3'])).toBe('p2');
    expect(nextProfileId(['p2', 'p3', 'p4'])).toBe('p1');
  });
  it('4つ埋まっていれば p5(addProfile 側で例外にする前提)', () => {
    expect(nextProfileId(['p1', 'p2', 'p3', 'p4'])).toBe('p5');
  });
});

describe('プロフィール一覧の操作(純粋・非破壊)', () => {
  it('addProfile は末尾に追加し元配列を壊さない', () => {
    const list = [profile('p1')];
    const next = addProfile(list, profile('p2'));
    expect(next.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(list.map((p) => p.id)).toEqual(['p1']); // 元は不変
  });

  it('addProfile は4つ目まで。5つ目で例外', () => {
    const full = [profile('p1'), profile('p2'), profile('p3'), profile('p4')];
    expect(() => addProfile(full, profile('p5'))).toThrow(/4つまで/);
  });

  it('removeProfile はidで抜く', () => {
    const list = [profile('p1'), profile('p2'), profile('p3')];
    expect(removeProfile(list, 'p2').map((p) => p.id)).toEqual(['p1', 'p3']);
    // 存在しないidならそのまま
    expect(removeProfile(list, 'p9').map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('updateProfile はなまえ/アイコンを差し替え、他はそのまま', () => {
    const list = [profile('p1', 'あいう', 'shiba'), profile('p2')];
    const updated = updateProfile(list, 'p1', { name: 'さぶろう', iconId: 'poodle' });
    expect(updated[0]).toMatchObject({ id: 'p1', name: 'さぶろう', iconId: 'poodle' });
    expect(updated[1]).toEqual(list[1]);
  });

  it('findProfile はidで探し、nullにはundefined', () => {
    const list = [profile('p1')];
    expect(findProfile(list, 'p1')?.id).toBe('p1');
    expect(findProfile(list, 'p9')).toBeUndefined();
    expect(findProfile(list, null)).toBeUndefined();
  });
});

describe('migrateFromV1: 最初のプロフィールへの自動移行', () => {
  const v1Json = JSON.stringify({
    version: 1,
    zukan: {
      shiba: { metAt: '2026-01-01T00:00:00.000Z', photo: 'data:shiba' },
      akita: { metAt: '2026-02-01T00:00:00.000Z', photo: 'data:akita' },
    },
    stages: { stage01: { cleared: true } },
  });

  it('有効なv1 → 最初のプロフィール(p1/わたし/shiba)と保存データを返す', () => {
    const result = migrateFromV1(v1Json, NOW);
    expect(result).not.toBeNull();
    expect(result!.profile).toEqual({
      id: 'p1',
      name: MIGRATED_DEFAULT_NAME,
      iconId: 'shiba',
      createdAt: NOW,
    });
  });

  it('zukan/stages はそのまま引き継がれ version 2 になる', () => {
    const result = migrateFromV1(v1Json, NOW)!;
    expect(result.save.version).toBe(2);
    expect(result.save.zukan['akita']).toMatchObject({ photo: 'data:akita' });
    expect(result.save.stages['stage01']).toEqual({ cleared: true });
  });

  it('柴犬エントリが無くても保証される', () => {
    const noShiba = JSON.stringify({
      version: 1,
      zukan: { akita: { metAt: NOW, photo: null } },
      stages: {},
    });
    const result = migrateFromV1(noShiba, NOW)!;
    expect(result.save.zukan['shiba']).toBeDefined();
    expect(result.save.zukan['shiba']!.photo).toBeNull();
  });

  it('zukan/stages が欠けていても壊れない(空扱い)', () => {
    const result = migrateFromV1(JSON.stringify({ version: 1 }), NOW)!;
    expect(result.save.zukan).toEqual({ shiba: expect.objectContaining({ photo: null }) });
    expect(result.save.stages).toEqual({});
  });

  it('null / 不正JSON / version非1 → null(移行しない)', () => {
    expect(migrateFromV1(null, NOW)).toBeNull();
    expect(migrateFromV1('{これはjsonでない', NOW)).toBeNull();
    expect(migrateFromV1(JSON.stringify({ version: 2 }), NOW)).toBeNull();
    expect(migrateFromV1(JSON.stringify({ version: 99 }), NOW)).toBeNull();
  });

  it('emptySave は version 2 の空セーブ', () => {
    const save = emptySave();
    expect(save.version).toBe(2);
    expect(save.zukan).toEqual({});
    expect(save.stages).toEqual({});
  });
});
