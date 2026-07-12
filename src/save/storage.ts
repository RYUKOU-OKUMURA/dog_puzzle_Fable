const STORAGE_KEY = 'shiba-osanpo-save-v1';

export interface ZukanEntry {
  metAt: string; // ISO日時
  photo: string | null; // 記念写真 (JPEG dataURL)
}

export interface SaveData {
  version: 1;
  zukan: Record<string, ZukanEntry>;
  stages: Record<string, { cleared: boolean }>;
}

function emptySave(): SaveData {
  return { version: 1, zukan: {}, stages: {} };
}

/** セーブを読み込む。相棒の柴犬は最初から図鑑に登録済み */
export function loadSave(): SaveData {
  let save = emptySave();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed && parsed.version === 1) save = parsed;
    }
  } catch {
    // 壊れたデータは捨てて新規スタート
  }

  if (!save.zukan['shiba']) {
    save.zukan['shiba'] = { metAt: new Date().toISOString(), photo: null };
    persist(save);
  }
  return save;
}

export function persist(save: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // 容量不足などで保存できなくてもゲームは続行できる
  }
}

export function registerDog(save: SaveData, dogId: string, photo: string | null): void {
  if (!save.zukan[dogId]) {
    save.zukan[dogId] = { metAt: new Date().toISOString(), photo };
  } else if (photo) {
    save.zukan[dogId].photo = photo;
  }
  persist(save);
}

export function setDogPhoto(save: SaveData, dogId: string, photo: string): void {
  const entry = save.zukan[dogId];
  if (entry && !entry.photo) {
    entry.photo = photo;
    persist(save);
  }
}

export function markCleared(save: SaveData, stageId: string): void {
  save.stages[stageId] = { cleared: true };
  persist(save);
}

export function countCollected(save: SaveData): number {
  return Object.keys(save.zukan).length;
}
