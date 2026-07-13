import type { Dir, GridPos, PanelKind, Rotation } from './types';

/** プレイヤーが配置できるパネル種(types から再エクスポート。既存の panel import 互換) */
export { PLAYER_PANEL_KINDS } from './types';

/** 回転 0 のときの接続方向 */
const BASE_CONNECTIONS: Record<PanelKind, Dir[]> = {
  straight: ['N', 'S'],
  corner: ['N', 'E'],
  tee: ['W', 'N', 'E'],
  end: ['N'],
};

/** 時計回り(真上から見て N→E→S→W)の並び */
const CLOCKWISE: Dir[] = ['N', 'E', 'S', 'W'];

export const DIR_OFFSET: Record<Dir, GridPos> = {
  N: { x: 0, z: -1 },
  E: { x: 1, z: 0 },
  S: { x: 0, z: 1 },
  W: { x: -1, z: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { N: 'S', E: 'W', S: 'N', W: 'E' };

export function rotateDir(dir: Dir, rotation: Rotation): Dir {
  const steps = rotation / 90;
  const index = (CLOCKWISE.indexOf(dir) + steps) % 4;
  return CLOCKWISE[index]!;
}

/** パネル種と回転から実際の接続方向を得る */
export function connectionsOf(kind: PanelKind, rotation: Rotation): Dir[] {
  return BASE_CONNECTIONS[kind]!.map((dir) => rotateDir(dir, rotation));
}

export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}
