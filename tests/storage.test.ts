import { describe, expect, it } from 'vitest';
import { migrateStageIds, normalizeProfile } from '../src/save/storage';
import { emptySave } from '../src/save/convert';
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
