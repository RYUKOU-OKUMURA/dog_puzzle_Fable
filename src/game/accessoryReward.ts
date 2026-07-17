import type { SaveData } from '../save/convert';
import { accessoryIdForWorld } from '../stage/accessories';

/**
 * ワールド初回クリア時だけ対応アクセサリーを付与する(純粋・再クリアでは付与しない)。
 * 未装備なら自動装備する(既に何か着ている場合は上書きしない)。
 */
export function grantWorldClearAccessory(
  save: SaveData,
  worldId: string,
  firstWorldClear: boolean,
): { save: SaveData; grantedId: string | null } {
  if (!firstWorldClear) return { save, grantedId: null };

  const id = accessoryIdForWorld(worldId);
  if (!id) return { save, grantedId: null };
  if (save.ownedAccessories.includes(id)) return { save, grantedId: null };

  save.ownedAccessories = [...save.ownedAccessories, id];
  if (save.equippedAccessoryId === null) {
    save.equippedAccessoryId = id;
  }
  return { save, grantedId: id };
}
