import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  migrateStageIds,
  normalizeProfile,
  normalizeSaveData,
  persistSave,
} from '../src/save/storage';
import { emptySave, type SaveData } from '../src/save/convert';
import { DEFAULT_ICON_ID } from '../src/save/profiles';

describe('normalizeProfile: 壊れデータの修復(純粋)', () => {
  const base = {
    id: 'p1',
    name: 'こうへい',
    iconId: 'poodle' as const,
    createdAt: '2026-07-12T00:00:00.000Z',
  };

  it('正しいプロフィールはそのまま通す', () => {
    expect(normalizeProfile(base)).toEqual(base);
  });

  it('null / undefined はすべてデフォルトへ', () => {
    const d = { id: '', name: '', iconId: DEFAULT_ICON_ID, createdAt: '' };
    expect(normalizeProfile(null)).toEqual(d);
    expect(normalizeProfile(undefined)).toEqual(d);
  });

  it('空オブジェクトはすべてデフォルトへ', () => {
    expect(normalizeProfile({})).toEqual({
      id: '',
      name: '',
      iconId: DEFAULT_ICON_ID,
      createdAt: '',
    });
  });

  it('不正な iconId はデフォルト(shiba)へ修復', () => {
    expect(normalizeProfile({ ...base, iconId: 'unknown' as never }).iconId).toBe('shiba');
    expect(normalizeProfile({ ...base, iconId: '' as never }).iconId).toBe('shiba');
  });

  it('id / name / createdAt の欠損は空文字へ', () => {
    expect(normalizeProfile({ name: 'あ', iconId: 'shiba' as const })).toEqual({
      id: '',
      name: 'あ',
      iconId: 'shiba',
      createdAt: '',
    });
  });

  it('文字でない値は無視してデフォルトへ(型が壊れたlocalStorage対策)', () => {
    expect(
      normalizeProfile({ id: 123 as unknown as string, name: null as unknown as string }),
    ).toEqual({ id: '', name: '', iconId: 'shiba', createdAt: '' });
  });
});

describe('migrateStageIds: 古いステージidのクリア記録を現行idへ(純粋・冪等)', () => {
  it('stage01 のクリア記録を w1-s1 に書き換える', () => {
    const save = emptySave();
    save.stages = { stage01: { cleared: true } };
    const migrated = migrateStageIds(save);
    expect(migrated.stages).toEqual({ 'w1-s1': { cleared: true } });
  });

  it('現行idだけのセーブはそのまま(変更なし・同じオブジェクト参照)', () => {
    const save = emptySave();
    save.stages = { 'w1-s1': { cleared: true }, 'w1-s2': { cleared: true } };
    expect(migrateStageIds(save)).toBe(save);
    expect(migrateStageIds(save).stages).toEqual({
      'w1-s1': { cleared: true },
      'w1-s2': { cleared: true },
    });
  });

  it('空のセーブもそのまま', () => {
    const save = emptySave();
    expect(migrateStageIds(save)).toBe(save);
  });

  it('2回流しても同じ結果(冪等)', () => {
    const save = emptySave();
    save.stages = { stage01: { cleared: true } };
    const once = migrateStageIds(save);
    const twice = migrateStageIds(once);
    expect(twice.stages).toEqual({ 'w1-s1': { cleared: true } });
  });

  it('旧idと新idが両方あるとき、どちらかでもクリア済みならクリア済みを残す(ORマージ)', () => {
    // 片方だけクリアの両パターンで、クリアが落ちないことを実値で検証する
    const a = emptySave();
    a.stages = { stage01: { cleared: true }, 'w1-s1': { cleared: false } };
    expect(migrateStageIds(a).stages).toEqual({ 'w1-s1': { cleared: true } });
    const b = emptySave();
    b.stages = { stage01: { cleared: false }, 'w1-s1': { cleared: true } };
    expect(migrateStageIds(b).stages).toEqual({ 'w1-s1': { cleared: true } });
    const c = emptySave();
    c.stages = { stage01: { cleared: false }, 'w1-s1': { cleared: false } };
    expect(migrateStageIds(c).stages).toEqual({ 'w1-s1': { cleared: false } });
  });

  it('zukan は書き換えない', () => {
    const save = emptySave();
    save.zukan = { akita: { metAt: 'x', photo: null } };
    save.stages = { stage01: { cleared: true } };
    const migrated = migrateStageIds(save);
    expect(migrated.zukan).toEqual({ akita: { metAt: 'x', photo: null } });
  });
});

describe('normalizeSaveData: 型の壊れたセーブデータの正規化(純粋)', () => {
  it('正常なデータはそのまま通す', () => {
    const input = {
      version: 2,
      zukan: { shiba: { metAt: '2026-01-01T00:00:00.000Z', photo: 'data:image/jpeg;base64,x' } },
      stages: { 'w1-s1': { cleared: true } },
    };
    expect(normalizeSaveData(input)).toEqual({
      version: 2,
      zukan: { shiba: { metAt: '2026-01-01T00:00:00.000Z', photo: 'data:image/jpeg;base64,x' } },
      stages: { 'w1-s1': { cleared: true } },
      ownedAccessories: [],
      equippedAccessoryId: null,
    });
  });

  it('photo が null のエントリも通す', () => {
    const input = { zukan: { shiba: { metAt: 'x', photo: null } } };
    expect(normalizeSaveData(input).zukan).toEqual({ shiba: { metAt: 'x', photo: null } });
  });

  it('input 自体が null / undefined / 文字列 / 配列 → 空のセーブ', () => {
    expect(normalizeSaveData(null)).toEqual(emptySave());
    expect(normalizeSaveData(undefined)).toEqual(emptySave());
    expect(normalizeSaveData('broken')).toEqual(emptySave());
    expect(normalizeSaveData([1, 2, 3])).toEqual(emptySave());
  });

  it('zukan / stages が文字列や配列 → 空にフォールバック', () => {
    expect(normalizeSaveData({ zukan: 'broken', stages: [] }).zukan).toEqual({});
    expect(normalizeSaveData({ zukan: 'broken', stages: [] }).stages).toEqual({});
  });

  it('zukan の entry が配列や null → そのidは無視', () => {
    const input = {
      zukan: { shiba: [1, 2], akita: null, poodle: { metAt: 'x', photo: null } },
    };
    expect(normalizeSaveData(input).zukan).toEqual({ poodle: { metAt: 'x', photo: null } });
  });

  it('zukan の metAt が型違い(数値)→ そのidは無視', () => {
    const input = { zukan: { shiba: { metAt: 123, photo: null } } };
    expect(normalizeSaveData(input).zukan).toEqual({});
  });

  it('zukan の photo が型違い(数値)→ そのidは無視', () => {
    const input = { zukan: { shiba: { metAt: 'x', photo: 123 } } };
    expect(normalizeSaveData(input).zukan).toEqual({});
  });

  it('stages の entry が型違い(cleared が文字列)→ そのidは無視', () => {
    const input = { stages: { 'w1-s1': { cleared: 'yes' } } };
    expect(normalizeSaveData(input).stages).toEqual({});
  });

  it('一部だけ壊れている場合は有効なエントリだけ残す', () => {
    const input = {
      zukan: { shiba: { metAt: 'x', photo: null }, broken: 'nope' },
      stages: { 'w1-s1': { cleared: true }, 'w1-s2': 'nope' },
    };
    expect(normalizeSaveData(input)).toEqual({
      version: 2,
      zukan: { shiba: { metAt: 'x', photo: null } },
      stages: { 'w1-s1': { cleared: true } },
      ownedAccessories: [],
      equippedAccessoryId: null,
    });
  });
});

describe('normalizeSaveData: きせかえフィールド(M9)', () => {
  it('ownedAccessories / equippedAccessoryId が正しければ通す', () => {
    const input = {
      version: 2,
      ownedAccessories: ['acc-w1', 'acc-w2'],
      equippedAccessoryId: 'acc-w1',
    };
    const save = normalizeSaveData(input);
    expect(save.ownedAccessories).toEqual(['acc-w1', 'acc-w2']);
    expect(save.equippedAccessoryId).toBe('acc-w1');
  });

  it('フィールド無しの旧セーブは空・未装備へ補完', () => {
    const save = normalizeSaveData({ version: 2, zukan: {}, stages: {} });
    expect(save.ownedAccessories).toEqual([]);
    expect(save.equippedAccessoryId).toBeNull();
  });

  it('ownedAccessories が配列でない → 空配列', () => {
    expect(normalizeSaveData({ ownedAccessories: 'broken' }).ownedAccessories).toEqual([]);
    expect(normalizeSaveData({ ownedAccessories: { a: 1 } }).ownedAccessories).toEqual([]);
  });

  it('ownedAccessories の非文字列要素は捨てる', () => {
    expect(
      normalizeSaveData({ ownedAccessories: ['acc-w1', 123, null, '', 'acc-w2'] }).ownedAccessories,
    ).toEqual(['acc-w1', 'acc-w2']);
  });

  it('equippedAccessoryId が不正型 → null', () => {
    expect(normalizeSaveData({ equippedAccessoryId: 1 }).equippedAccessoryId).toBeNull();
    expect(normalizeSaveData({ equippedAccessoryId: '' }).equippedAccessoryId).toBeNull();
    expect(normalizeSaveData({ equippedAccessoryId: ['acc-w1'] }).equippedAccessoryId).toBeNull();
  });

  it('equippedAccessoryId が null はそのまま', () => {
    expect(normalizeSaveData({ equippedAccessoryId: null }).equippedAccessoryId).toBeNull();
  });

  it('equipped が owned に無い → null に落とす', () => {
    const save = normalizeSaveData({
      ownedAccessories: ['acc-w1'],
      equippedAccessoryId: 'acc-w2',
    });
    expect(save.ownedAccessories).toEqual(['acc-w1']);
    expect(save.equippedAccessoryId).toBeNull();
  });

  it('ownedAccessories の重複は1つにまとめる', () => {
    expect(
      normalizeSaveData({ ownedAccessories: ['acc-w1', 'acc-w1', 'acc-w2'] }).ownedAccessories,
    ).toEqual(['acc-w1', 'acc-w2']);
  });
});

describe('persistSave: 容量不足フォールバック', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeSave(): SaveData {
    const save = emptySave();
    save.zukan['shiba'] = { metAt: 'x', photo: 'data:image/jpeg;base64,'.padEnd(500, 'a') };
    return save;
  }

  it('大きい値で1回目 throw → 写真なしのコピーで再試行して成功する', () => {
    const store = new Map<string, string>();
    let calls = 0;
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        calls += 1;
        if (calls === 1) throw new Error('QuotaExceededError');
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    const ok = persistSave('p1', makeSave());

    expect(ok).toBe(true);
    expect(calls).toBe(2);
    const saved = JSON.parse(store.get('save:v2:p1')!) as SaveData;
    expect(saved.zukan['shiba']?.photo).toBeNull();
  });

  it('常に throw → false を返す(クリア進捗も保存できない)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    });

    expect(persistSave('p1', makeSave())).toBe(false);
  });
});
