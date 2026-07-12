/**
 * セーブデータの純粋な変換・構築(localStorage に触れない)。
 * profiles.ts(純粋層)と storage.ts(I/O層)の両方から使われるので、
 * 依存が一方向(convert ← profiles, convert ← storage)になるようにここに置く。
 */

export interface ZukanEntry {
  metAt: string; // ISO日時
  photo: string | null; // 記念写真 (JPEG dataURL)
}

/**
 * プロフィール別セーブ。v1 と同じ中身 + version 2。
 * きせかえ(M9)・設定はプロフィールごとに保存する想定だが、
 * プロフィール導入時点では構造を変えず version だけ上げる(破壊的変更なし)。
 */
export interface SaveData {
  version: 2;
  zukan: Record<string, ZukanEntry>;
  stages: Record<string, { cleared: boolean }>;
}

export function emptySave(): SaveData {
  return { version: 2, zukan: {}, stages: {} };
}

/** 相棒の柴犬はどのプロフィールでも最初から図鑑に登録済みにする */
export function ensureShiba(save: SaveData): void {
  if (!save.zukan['shiba']) {
    save.zukan['shiba'] = { metAt: new Date().toISOString(), photo: null };
  }
}

/**
 * v1 セーブ(raw JSON)を v2 セーブに変換する(純粋)。
 * 不正・version不一致・パース失敗・無し → null。
 * zukan/stages はそのまま引き継ぎ、柴犬エントリを保証する。
 */
export function parseV1Save(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<{
      version: number;
      zukan: unknown;
      stages: unknown;
    }>;
    if (!parsed || parsed.version !== 1) return null;
    const save = emptySave();
    if (parsed.zukan && typeof parsed.zukan === 'object') {
      save.zukan = parsed.zukan as Record<string, ZukanEntry>;
    }
    if (parsed.stages && typeof parsed.stages === 'object') {
      save.stages = parsed.stages as Record<string, { cleared: boolean }>;
    }
    ensureShiba(save);
    return save;
  } catch {
    return null;
  }
}

/**
 * ステージidのリネーム履歴(旧id → 現行id)。
 * M4で stage01 を w1-s1 に統一したため、古いセーブのクリア記録を現行idへ書き換える。
 * v1由来的な「stage01」も、M3時代のv2セーブの「stage01」もどちらもここで現行化される。
 */
const STAGE_ID_RENAMES: Readonly<Record<string, string>> = {
  stage01: 'w1-s1',
};

/**
 * クリア記録のステージidを現行idへ書き換える(冪等・純粋)。
 * loadSave で毎回呼ぶことで、いつリネームが入っても古い記録が消えない。
 * 変更がなければ同じオブジェクトを返す(無駄な再描画を避ける)。
 */
export function migrateStageIds(save: SaveData): SaveData {
  let changed = false;
  const next: Record<string, { cleared: boolean }> = {};
  for (const [id, record] of Object.entries(save.stages)) {
    const mapped = STAGE_ID_RENAMES[id] ?? id;
    if (mapped !== id) changed = true;
    // 旧id(例: stage01)と現行id(例: w1-s1)が両方記録されていた場合、
    // どちらかでもクリア済みならクリア済みとして残す(書き戻しでクリアを落とし、
    // 次ワールドを誤ってロックするのを防ぐ)。
    const prev = next[mapped];
    next[mapped] = { cleared: prev ? prev.cleared || record.cleared : record.cleared };
  }
  return changed ? { ...save, stages: next } : save;
}
