import { describe, expect, it } from 'vitest';
import { normalizeProfile } from '../src/save/storage';
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
