/**
 * きせかえ(M9)アクセサリーのカタログ。データのみ(Three.js 禁止)。
 * 見た目メッシュは scene/accessory.ts 側。
 */

export type AccessoryAttach = 'head' | 'body';

export interface AccessoryDef {
  id: string;
  /** 入手条件のワールドid(w1..w5) */
  worldId: string;
  /** UI表示名(ひらがな中心) */
  name: string;
  /** 装着先: 帽子・リボンは head、バンダナ・スカーフ・バッジは body */
  attach: AccessoryAttach;
}

export const ACCESSORIES: readonly AccessoryDef[] = [
  { id: 'acc-w1', worldId: 'w1', name: 'さくらバンダナ', attach: 'body' },
  { id: 'acc-w2', worldId: 'w2', name: 'あかいぼうし', attach: 'head' },
  { id: 'acc-w3', worldId: 'w3', name: 'あおいリボン', attach: 'head' },
  { id: 'acc-w4', worldId: 'w4', name: 'みどりのスカーフ', attach: 'body' },
  { id: 'acc-w5', worldId: 'w5', name: 'ほしのバッジ', attach: 'body' },
];

const BY_ID: ReadonlyMap<string, AccessoryDef> = new Map(
  ACCESSORIES.map((a) => [a.id, a]),
);

const BY_WORLD: ReadonlyMap<string, string> = new Map(
  ACCESSORIES.map((a) => [a.worldId, a.id]),
);

export function getAccessory(id: string): AccessoryDef | undefined {
  return BY_ID.get(id);
}

/** ワールドid → アクセサリーid。不明ワールドは null */
export function accessoryIdForWorld(worldId: string): string | null {
  return BY_WORLD.get(worldId) ?? null;
}
