import type { StageDef } from '../core/types';
import type { WorldDef } from './catalog';

/**
 * クリア状況に基づく「解放」判定。純粋(localStorage も DOM も触らない)。
 * 呼び元は save.stages(Record<id,{cleared}>) から cleared:Set<string> を作って渡す。
 *
 * 解放ルール(requirements 5.2):
 * - ワールドは「前ワールドのステージをすべてクリア」で解放。w1 は常時解放。
 * - ワールド内は s1 がクリアされると s2〜s4 が解放。s2〜s4 は自由順。
 */

/** クリア済みステージidの集合 */
export type ClearedSet = ReadonlySet<string>;

/** ワールド内のステージ位置(0始まり) */
export interface StageLocation {
  world: WorldDef;
  stage: StageDef;
  ordinal: number;
}

/** 前のワールド(同じカタログ内で1つ前)。w1 なら null */
export function prevWorld(worlds: readonly WorldDef[], worldId: string): WorldDef | null {
  const i = worlds.findIndex((w) => w.id === worldId);
  if (i <= 0) return null;
  return worlds[i - 1]!;
}

/** ワールド内のクリア済みステージ数 */
export function clearedCountInWorld(world: WorldDef, cleared: ClearedSet): number {
  return world.stages.filter((s) => cleared.has(s.id)).length;
}

/** ワールドのステージをすべてクリアしたか。空ワールド(未実装)はfalse扱いで次を開けない */
export function isWorldCleared(world: WorldDef, cleared: ClearedSet): boolean {
  return world.stages.length > 0 && world.stages.every((s) => cleared.has(s.id));
}

/** ワールドが解放されているか。w1(先頭)は常時解放。不明idはfalse */
export function isWorldUnlocked(
  worlds: readonly WorldDef[],
  worldId: string,
  cleared: ClearedSet,
): boolean {
  const i = worlds.findIndex((w) => w.id === worldId);
  if (i < 0) return false;
  if (i === 0) return true;
  return isWorldCleared(worlds[i - 1]!, cleared);
}

/**
 * ワールド内の指定ステージ(0始まりの順序)が解放されているか。
 * s1(ordinal 0)は常時解放、s2以降は s1 クリアで解放。範囲外はfalse。
 * ※「ワールド自体が解放されているか」は呼び元で別途 isWorldUnlocked で確認すること。
 */
export function isStageUnlocked(world: WorldDef, ordinal: number, cleared: ClearedSet): boolean {
  if (ordinal < 0 || ordinal >= world.stages.length) return false;
  if (ordinal === 0) return true;
  return cleared.has(world.stages[0]!.id);
}

/** ステージidの所在(ワールド・順序)を検索 */
export function locateStage(worlds: readonly WorldDef[], stageId: string): StageLocation | null {
  for (const world of worlds) {
    const ordinal = world.stages.findIndex((s) => s.id === stageId);
    if (ordinal >= 0) return { world, stage: world.stages[ordinal]!, ordinal };
  }
  return null;
}

/**
 * クリア直後の「つぎのステージ」。同ワールド内の次の順序のステージ。
 * なければ(ワールド最後、または存在しないid) null。
 * ※直前のステージをクリアしたなら次の順序は必ず解放済み(s1を通っていれば s2.. も解放)。
 */
export function nextStageInWorld(
  worlds: readonly WorldDef[],
  stageId: string,
): StageLocation | null {
  const loc = locateStage(worlds, stageId);
  if (!loc) return null;
  const next = loc.world.stages[loc.ordinal + 1];
  return next ? { world: loc.world, stage: next, ordinal: loc.ordinal + 1 } : null;
}
