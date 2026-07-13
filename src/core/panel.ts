import type { Dir, GridPos, PanelKind, Rotation } from './types';

/** プレイヤーが配置できるパネル種(types から再エクスポート。既存の panel import 互換) */
export { PLAYER_PANEL_KINDS } from './types';

/** 回転 0 のときの接続方向。橋は回転しても同じ(上下独立の十字) */
const BASE_CONNECTIONS: Record<PanelKind, Dir[]> = {
  straight: ['N', 'S'],
  corner: ['N', 'E'],
  tee: ['W', 'N', 'E'],
  end: ['N'],
  bridge: ['N', 'S', 'E', 'W'],
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
  // 橋は回転しても接続が同じなので、回転適用を省略(見た目も1種)
  if (kind === 'bridge') return [...BASE_CONNECTIONS.bridge];
  return BASE_CONNECTIONS[kind]!.map((dir) => rotateDir(dir, rotation));
}

/**
 * マスに enteredFrom 方向から入ったとき、出られる方向。
 * - 通常パネル: 持っている接続は全部行き来できる(従来と同値)
 * - 橋: N↔S と E↔W が独立。進入方向と同じ軸にしか出られない
 * - enteredFrom=null はスタート(進入なし)→ 全接続が出口
 */
export function exitsFrom(kind: PanelKind, rotation: Rotation, enteredFrom: Dir | null): Dir[] {
  const conns = connectionsOf(kind, rotation);
  if (kind !== 'bridge' || enteredFrom === null) return conns;
  if (enteredFrom === 'N' || enteredFrom === 'S') {
    return conns.filter((d) => d === 'N' || d === 'S');
  }
  return conns.filter((d) => d === 'E' || d === 'W');
}

export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}
