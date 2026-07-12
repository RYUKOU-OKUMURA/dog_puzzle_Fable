import type { GridPos, StageDef } from '../core/types';

/**
 * グリッド座標 ⇄ ワールド座標の変換。
 * 街の中心がワールド原点に来るように配置する。1マス = 1ユニット、地面の上面が y=0。
 */
export function gridToWorld(pos: GridPos, stage: StageDef): { x: number; z: number } {
  return {
    x: pos.x - (stage.size.w - 1) / 2,
    z: pos.z - (stage.size.h - 1) / 2,
  };
}

export function worldToGrid(x: number, z: number, stage: StageDef): GridPos {
  return {
    x: Math.round(x + (stage.size.w - 1) / 2),
    z: Math.round(z + (stage.size.h - 1) / 2),
  };
}
