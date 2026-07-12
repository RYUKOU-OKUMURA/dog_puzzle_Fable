import { parseV1Save, type SaveData } from './convert';

/** 1端末で遊べるプロフィールの最大数(子供の人数を想定) */
export const MAX_PROFILES = 4;

/** なまえの最大文字数 */
export const MAX_NAME_LENGTH = 8;

/**
 * プロフィール作成時にえらぶ犬アイコンのid(固定セット)。
 * emoji/ラベルは ui/icons.ts の PROFILE_ICONS と対応する。
 */
export const PROFILE_ICON_IDS = [
  'shiba',
  'puppy',
  'poodle',
  'shepherd',
  'paw',
  'bone',
] as const;
export type ProfileIconId = (typeof PROFILE_ICON_IDS)[number];

/** デフォルトのアイコン(v1移行プロフィール等) */
export const DEFAULT_ICON_ID: ProfileIconId = 'shiba';

/** v1 から自動移行したプロフィールのデフォルトなまえ(あとで子が編集できる) */
export const MIGRATED_DEFAULT_NAME = 'わたし';

export interface Profile {
  id: string;
  /** ひらがな1〜8文字 */
  name: string;
  iconId: ProfileIconId;
  /** 作成日時(ISO)。一覧の並び順の安定用 */
  createdAt: string;
}

export function isValidIconId(id: string): id is ProfileIconId {
  return (PROFILE_ICON_IDS as readonly string[]).includes(id);
}

export type NameValidation = { ok: true; name: string } | { ok: false; reason: string };

/**
 * なまえのバリデーション。ひらがな(小書き・濁点・繰返符号含む)1〜8文字。
 * 空白・0文字・9文字以上・ひらがな以外は却下。子が一人で入力できるように優しい文言。
 */
export function validateName(input: string): NameValidation {
  const name = input.trim();
  if (name.length === 0) {
    return { ok: false, reason: 'なまえを いれてね' };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, reason: `なまえは ${MAX_NAME_LENGTH}もじまでだよ` };
  }
  for (const ch of name) {
    if (!isHiragana(ch)) {
      return { ok: false, reason: 'ひらがなで いれてね' };
    }
  }
  return { ok: true, name };
}

/** ひらがなブロック(U+3040〜U+309F)。小書き・濁点・半濁点・繰返符号を含む */
function isHiragana(ch: string): boolean {
  const code = ch.codePointAt(0);
  return code !== undefined && code >= 0x3040 && code <= 0x309f;
}

/**
 * 既存idと衝突しない最小のプロフィールid(p1, p2, ...)を決定的に作る。
 * 乱数・時刻に依存しないのでテストが安定し、リロードでidがぶれない。
 */
export function nextProfileId(existingIds: readonly string[]): string {
  const used = new Set(existingIds);
  for (let n = 1; n <= MAX_PROFILES; n++) {
    const id = `p${n}`;
    if (!used.has(id)) return id;
  }
  // 4つすべて埋まっている場合は addProfile で例外にするので、ここには来ない
  return `p${MAX_PROFILES + 1}`;
}

export function createProfile(args: {
  name: string;
  iconId: ProfileIconId;
  id: string;
  createdAt: string;
}): Profile {
  return {
    id: args.id,
    name: args.name,
    iconId: args.iconId,
    createdAt: args.createdAt,
  };
}

/** プロフィール一覧に追加。満杯なら例外。純粋(新しい配列を返す) */
export function addProfile(list: readonly Profile[], profile: Profile): Profile[] {
  if (list.length >= MAX_PROFILES) {
    throw new Error(`プロフィールは ${MAX_PROFILES}つまでです`);
  }
  return [...list, profile];
}

export function removeProfile(list: readonly Profile[], id: string): Profile[] {
  return list.filter((p) => p.id !== id);
}

export function updateProfile(
  list: readonly Profile[],
  id: string,
  patch: Partial<Pick<Profile, 'name' | 'iconId'>>,
): Profile[] {
  return list.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

export function findProfile(
  list: readonly Profile[],
  id: string | null,
): Profile | undefined {
  if (id === null) return undefined;
  return list.find((p) => p.id === id);
}

export interface MigrationResult {
  /** 新規に作る最初のプロフィール */
  profile: Profile;
  /** そのプロフィールへ保存すべき移行済みセーブ */
  save: SaveData;
}

/**
 * v1 セーブ(raw JSON文字列)があれば「最初のプロフィール」へ自動移行する。
 * 初回起動時(プロフィール一覧が空)にだけ呼ぶ前提で、profile.id は 'p1' で固定。
 * 純粋(localStorage に触らない)なのでユニットテスト可能。
 * 不正な v1 / v1 なし → null(移行しない)。
 */
export function migrateFromV1(v1Raw: string | null, now: string): MigrationResult | null {
  const save = parseV1Save(v1Raw);
  if (!save) return null;
  const profile = createProfile({
    id: 'p1',
    name: MIGRATED_DEFAULT_NAME,
    iconId: DEFAULT_ICON_ID,
    createdAt: now,
  });
  return { profile, save };
}
