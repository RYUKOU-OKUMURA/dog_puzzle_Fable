import { describe, expect, it } from 'vitest';
import type { GridPos, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { WORLDS } from '../src/stage/catalog';

/**
 * 全ステージの「孤立スロット」検証(M5.1)。
 *
 * 孤立スロット = 4近傍のどれにも 道/スロット/スタート/ゴール がない空きスロット。
 * どこにもつなげないので、どんなパネルを置いても経路に組み込めず「置く意味のないマス」に
 * なってしまう。catalog に登録された全ステージで1つもないことを保証する。
 */

/** core/panel と同じ方向オフセット(stage/ からは import できないので局所定義) */
const DIR_OFFSET: ReadonlyArray<GridPos> = [
  { x: 0, z: -1 }, // N
  { x: 1, z: 0 }, // E
  { x: 0, z: 1 }, // S
  { x: -1, z: 0 }, // W
];

/** スロットが孤立しているか(=隣接マスに 道/スロット/スタート/ゴール がない) */
function isIsolated(stage: StageDef, slot: GridPos): boolean {
  const connectable = new Set<string>();
  for (const s of stage.slots) connectable.add(posKey(s));
  for (const r of stage.fixedRoads) connectable.add(posKey(r.pos));
  connectable.add(posKey(stage.start.pos));
  connectable.add(posKey(stage.goal.pos));

  for (const d of DIR_OFFSET) {
    const n: GridPos = { x: slot.x + d.x, z: slot.z + d.z };
    if (connectable.has(posKey(n))) return false; // つながり先が1つでもあれば非孤立
  }
  return true;
}

/** 検証対象の全ステージ(WORLDS に登録済みのもの)。未実装ワールドは stages が空配列 */
const ALL_STAGES: ReadonlyArray<StageDef> = WORLDS.flatMap((w) => w.stages);

describe('全ステージ: 孤立スロットなし(M5.1)', () => {
  // ステージごとに it を分け、失敗時にどのステージのどのスロットか分かるようにする
  for (const stage of ALL_STAGES) {
    it(`${stage.id}: 全スロットが 道/スロット/スタート/ゴール のいずれかに隣接する`, () => {
      const isolated = stage.slots.filter((slot) => isIsolated(stage, slot));
      expect(isolated.map(posKey), `${stage.id} に孤立スロットがある`).toEqual([]);
    });
  }

  it('検証対象のステージ数が 16(w1=4 + w2=4 + w3=4 + w4=4)。新ワールド追加時にこのテストも増える', () => {
    expect(ALL_STAGES.length).toBe(16);
  });
});
