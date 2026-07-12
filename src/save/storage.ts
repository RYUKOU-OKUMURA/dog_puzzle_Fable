import { DEFAULT_ICON_ID, isValidIconId, type Profile, type ProfileIconId } from './profiles';
// 純粋な型・変換は convert から再エクスポート(既存の import 元が壊れないように)
export {
  emptySave,
  ensureShiba,
  migrateStageIds,
  parseV1Save,
  type SaveData,
  type ZukanEntry,
} from './convert';
import { emptySave, ensureShiba, migrateStageIds, type SaveData } from './convert';

/** フェーズ1の単一セーブ(プロフィール導入前)。移行元としてのみ参照する */
const V1_KEY = 'shiba-osanpo-save-v1';
/** プロフィール一覧 + 誰が遊んでいるか(activeId) */
const PROFILE_INDEX_KEY = 'shiba-osanpo-profiles-v2';

function saveKey(profileId: string): string {
  return `save:v2:${profileId}`;
}

/** プロフィール別セーブを読み込む。柴犬エントリを保証して返す */
export function loadSave(profileId: string): SaveData {
  const save = emptySave();
  try {
    const raw = localStorage.getItem(saveKey(profileId));
    if (raw) {
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed && parsed.version === 2) {
        save.zukan = parsed.zukan ?? {};
        save.stages = parsed.stages ?? {};
      }
    }
  } catch {
    // 壊れたデータは捨てて新規スタート
  }
  // 古いステージid(stage01等)のクリア記録を現行idへ移行(リネーム履歴を吸収)
  const migrated = migrateStageIds(save);
  ensureShiba(migrated);
  return migrated;
}

/**
 * セーブを書き込む。成否を返す(移行で「保存できたのに古いデータを消す」事故を防ぐため)。
 */
export function persistSave(profileId: string, save: SaveData): boolean {
  try {
    localStorage.setItem(saveKey(profileId), JSON.stringify(save));
    return true;
  } catch {
    // 容量不足などで保存できなくてもゲームは続行できる
    return false;
  }
}

/** プロフィール削除時にセーブも消す。成否を返す */
export function deleteSave(profileId: string): boolean {
  try {
    localStorage.removeItem(saveKey(profileId));
    return true;
  } catch {
    return false;
  }
}

/** 移行元 v1 セーブの生文字列を取り出す(無ければ null) */
export function readV1Raw(): string | null {
  try {
    return localStorage.getItem(V1_KEY);
  } catch {
    return null;
  }
}

/** 移行成功後に v1 セーブを消す(二重移行を防ぐ) */
export function deleteV1(): void {
  try {
    localStorage.removeItem(V1_KEY);
  } catch {
    // 無視
  }
}

/** プロフィール一覧と「いま遊んでいる人」 */
export interface ProfileIndex {
  version: 2;
  activeId: string | null;
  profiles: Profile[];
}

export function emptyProfileIndex(): ProfileIndex {
  return { version: 2, activeId: null, profiles: [] };
}

/**
 * 不正なアイコンid等はデフォルトへ修復してから読み込む(壊れデータに強くする)。
 * 純粋(localStorage を触らない)なので直接ユニットテストする。
 */
export function normalizeProfile(p: Partial<Profile> | null | undefined): Profile {
  return {
    id: p && typeof p.id === 'string' ? p.id : '',
    name: p && typeof p.name === 'string' ? p.name : '',
    iconId: p && isValidIconId(p.iconId as string) ? (p.iconId as ProfileIconId) : DEFAULT_ICON_ID,
    createdAt: p && typeof p.createdAt === 'string' ? p.createdAt : '',
  };
}

export function loadProfileIndex(): ProfileIndex {
  try {
    const raw = localStorage.getItem(PROFILE_INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProfileIndex>;
      if (parsed && parsed.version === 2 && Array.isArray(parsed.profiles)) {
        return {
          version: 2,
          activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
          profiles: parsed.profiles.map(normalizeProfile),
        };
      }
    }
  } catch {
    // 壊れていたら空からやり直し
  }
  return emptyProfileIndex();
}

/** プロフィール一覧を書き込む。成否を返す(移行時のデータ喪失防止用) */
export function persistProfileIndex(index: ProfileIndex): boolean {
  try {
    localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

export function registerDog(
  profileId: string,
  save: SaveData,
  dogId: string,
  photo: string | null,
): void {
  if (!save.zukan[dogId]) {
    save.zukan[dogId] = { metAt: new Date().toISOString(), photo };
  } else if (photo) {
    save.zukan[dogId]!.photo = photo;
  }
  persistSave(profileId, save);
}

export function setDogPhoto(profileId: string, save: SaveData, dogId: string, photo: string): void {
  const entry = save.zukan[dogId];
  if (entry && !entry.photo) {
    entry.photo = photo;
    persistSave(profileId, save);
  }
}

export function markCleared(profileId: string, save: SaveData, stageId: string): void {
  save.stages[stageId] = { cleared: true };
  persistSave(profileId, save);
}

export function countCollected(save: SaveData): number {
  return Object.keys(save.zukan).length;
}
