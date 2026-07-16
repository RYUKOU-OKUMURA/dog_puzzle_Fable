import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { isStageSolvable } from '../src/core/solver';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { w3s1 } from '../src/stage/w3s1';
import { w3s2 } from '../src/stage/w3s2';
import { w3s3 } from '../src/stage/w3s3';
import { w3s4 } from '../src/stage/w3s4';
import { expectIntendedSolutionSolves, expectRouteIsMinimal } from './helpers';

/**
 * W3 ステージ4種の検証(M11 大型化・難化)。
 * どのステージも「ダミーは正解ルートから1マス分岐する行き止まりで合流しない」設計で、
 * (a) 意図解が ★→◎ の唯一の単純経路(おやつがあれば全通過)
 * (f) 意図解より短い別解が存在しないことを expectRouteIsMinimal(ルート各マス必須判定)で検証する。
 * ソルバは stage.palette を尊重する(tee なしの w3-s2 を誤判定しない)。
 */

/** 4近傍。隣接マスが「道になり得るマス(スロット/固定道/★/◎)」を含まなければ孤立 */
const N4: GridPos[] = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];

function isIsolated(stage: StageDef, slot: GridPos): boolean {
  const cells = new Set<string>();
  for (const s of stage.slots) cells.add(posKey(s));
  for (const r of stage.fixedRoads) cells.add(posKey(r.pos));
  cells.add(posKey(stage.start.pos));
  cells.add(posKey(stage.goal.pos));
  for (const d of N4) {
    if (cells.has(posKey({ x: slot.x + d.x, z: slot.z + d.z }))) return false;
  }
  return true;
}

/** 全スロットが孤立していないことを assert */
function expectNoIsolatedSlots(stage: StageDef): void {
  const isolated = stage.slots.filter((s) => isIsolated(stage, s));
  expect(
    isolated.map((s) => posKey(s)),
    `${stage.id}: 孤立スロットがない`,
  ).toEqual([]);
}

// w3-s1: 正解10 + ダミー3 = 13スロット
const W3S1_INTENDED: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }> = [
  { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 5, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 6, z: 1 }, kind: 'corner', rotation: 180 },
  { pos: { x: 6, z: 2 }, kind: 'straight', rotation: 0 },
  { pos: { x: 6, z: 3 }, kind: 'straight', rotation: 0 },
  { pos: { x: 6, z: 4 }, kind: 'corner', rotation: 0 },
  { pos: { x: 7, z: 4 }, kind: 'straight', rotation: 90 },
  { pos: { x: 8, z: 4 }, kind: 'straight', rotation: 90 },
];

// w3-s2: 正解12 + ダミー3 = 15スロット(直進・曲がりのみ)
const W3S2_INTENDED: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }> = [
  { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 5, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 6, z: 1 }, kind: 'corner', rotation: 180 },
  { pos: { x: 6, z: 2 }, kind: 'straight', rotation: 0 },
  { pos: { x: 6, z: 3 }, kind: 'corner', rotation: 270 },
  { pos: { x: 5, z: 3 }, kind: 'straight', rotation: 90 },
  { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 90 },
  { pos: { x: 3, z: 3 }, kind: 'corner', rotation: 90 },
  { pos: { x: 3, z: 4 }, kind: 'straight', rotation: 0 },
  { pos: { x: 3, z: 5 }, kind: 'straight', rotation: 0 },
];

// w3-s3: 正解12 + ダミー3 = 15スロット(おやつ2)
const W3S3_INTENDED: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }> = [
  { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 5, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 6, z: 1 }, kind: 'corner', rotation: 180 },
  { pos: { x: 6, z: 2 }, kind: 'straight', rotation: 0 },
  { pos: { x: 6, z: 3 }, kind: 'straight', rotation: 0 },
  { pos: { x: 6, z: 4 }, kind: 'corner', rotation: 270 },
  { pos: { x: 5, z: 4 }, kind: 'straight', rotation: 90 },
  { pos: { x: 4, z: 4 }, kind: 'straight', rotation: 90 },
  { pos: { x: 3, z: 4 }, kind: 'straight', rotation: 90 },
  { pos: { x: 2, z: 4 }, kind: 'straight', rotation: 90 },
];

// w3-s4: 正解13 + ダミー4 = 17スロット(外周の最長ルート)
const W3S4_INTENDED: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }> = [
  { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 5, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 6, z: 1 }, kind: 'straight', rotation: 90 },
  { pos: { x: 7, z: 1 }, kind: 'corner', rotation: 180 },
  { pos: { x: 7, z: 2 }, kind: 'straight', rotation: 0 },
  { pos: { x: 7, z: 3 }, kind: 'straight', rotation: 0 },
  { pos: { x: 7, z: 4 }, kind: 'straight', rotation: 0 },
  { pos: { x: 7, z: 5 }, kind: 'corner', rotation: 270 },
  { pos: { x: 6, z: 5 }, kind: 'straight', rotation: 90 },
  { pos: { x: 5, z: 5 }, kind: 'straight', rotation: 90 },
  { pos: { x: 4, z: 5 }, kind: 'straight', rotation: 90 },
];

// ============================================================================
// w3-s1「フランスの まち 1」(🦴3 / 10×10・ダミー3)
// ============================================================================
describe('w3-s1「フランスの まち 1」', () => {
  it('(a) 10×10 でスロット数が 13(正解10+ダミー3)', () => {
    expect(w3s1.size).toEqual({ w: 10, h: 10 });
    expect(w3s1.slots.length).toBe(13);
  });

  it('(b) 難度が 3', () => {
    expect(w3s1.difficulty).toBe(3);
  });

  it('メタ情報が要件どおり(id/world/dog/treats/palette)', () => {
    expect(w3s1.id).toBe('w3-s1');
    expect(w3s1.world).toBe('w3');
    expect(w3s1.encounterDogId).toBe('poodle');
    expect(w3s1.treats).toBeUndefined();
    expect(w3s1.palette).toEqual(['straight', 'corner', 'tee']);
  });

  it('(c) 意図解(階段状10枚・ダミー3未使用)で ★→◎ がつながる', () => {
    expectIntendedSolutionSolves(w3s1, W3S1_INTENDED);
  });

  it('(d) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w3s1)).toBe(true);
  });

  it('(f) 意図解(10枚)より短い別解がない', () => {
    expectRouteIsMinimal(w3s1, W3S1_INTENDED);
  });

  it('(g) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w3s1);
  });
});

// ============================================================================
// w3-s2「フランスの まち 2」(🦴3 / 11×11・T字なし + ダミー3)
// ============================================================================
describe('w3-s2「フランスの まち 2」', () => {
  it('(a) 11×11 でスロット数が 15(正解12+ダミー3)', () => {
    expect(w3s2.size).toEqual({ w: 11, h: 11 });
    expect(w3s2.slots.length).toBe(15);
  });

  it('(b) 難度が 3', () => {
    expect(w3s2.difficulty).toBe(3);
  });

  it('メタ情報と palette(T字なし)が要件どおり', () => {
    expect(w3s2.id).toBe('w3-s2');
    expect(w3s2.world).toBe('w3');
    expect(w3s2.encounterDogId).toBe('papillon');
    expect(w3s2.treats).toBeUndefined();
    expect(w3s2.palette).toEqual(['straight', 'corner']);
  });

  it('(c) 意図解(S字12枚・tee 不使用)で ★→◎ がつながる', () => {
    expectIntendedSolutionSolves(w3s2, W3S2_INTENDED);
  });

  it('palette 外(tee)はスロットに置けない(core が palette を尊重)', () => {
    const grid = new Grid(w3s2);
    expect(grid.place({ x: 2, z: 1 }, 'tee')).toBe(false);
  });

  it('(d) 総当たりソルバでも解が存在する(tee を使わずに解ける)', () => {
    expect(isStageSolvable(w3s2)).toBe(true);
  });

  it('(f) 意図解(12枚)より短い別解がない', () => {
    expectRouteIsMinimal(w3s2, W3S2_INTENDED);
  });

  it('(g) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w3s2);
  });
});

// ============================================================================
// w3-s3「スイスの まち 1」(🦴4 / 11×11・おやつ2 + ダミー3)
// ============================================================================
describe('w3-s3「スイスの まち 1」', () => {
  it('(a) 11×11 でスロット数が 15(正解12+ダミー3)', () => {
    expect(w3s3.size).toEqual({ w: 11, h: 11 });
    expect(w3s3.slots.length).toBe(15);
  });

  it('(b) 難度が 4', () => {
    expect(w3s3.difficulty).toBe(4);
  });

  it('メタ情報が要件どおり(おやつ2・palette 全種)', () => {
    expect(w3s3.id).toBe('w3-s3');
    expect(w3s3.world).toBe('w3');
    expect(w3s3.encounterDogId).toBe('saintBernard');
    expect(w3s3.treats).toEqual([
      { x: 4, z: 1 },
      { x: 3, z: 4 },
    ]);
    expect(w3s3.palette).toEqual(['straight', 'corner', 'tee']);
  });

  it('(c) 意図解(∩字12枚・おやつ2つ全通過)で ★→◎ がつながる', () => {
    expectIntendedSolutionSolves(w3s3, W3S3_INTENDED);
  });

  it('(d) 総当たりソルバでもおやつ全部通過の解が存在する', () => {
    expect(isStageSolvable(w3s3)).toBe(true);
  });

  it('(f) 意図解(12枚)より短い別解がない(おやつ短絡ルートもない)', () => {
    expectRouteIsMinimal(w3s3, W3S3_INTENDED);
  });

  it('(g) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w3s3);
  });
});

// ============================================================================
// w3-s4「スイスの まち 2」(🦴4 / 11×11・最長ルート + ダミー4)
// ============================================================================
describe('w3-s4「スイスの まち 2」', () => {
  it('(a) 11×11 でスロット数が 17(正解13+ダミー4)', () => {
    expect(w3s4.size).toEqual({ w: 11, h: 11 });
    expect(w3s4.slots.length).toBe(17);
  });

  it('(b) 難度が 4', () => {
    expect(w3s4.difficulty).toBe(4);
  });

  it('メタ情報が要件どおり(treats なし・palette 全種)', () => {
    expect(w3s4.id).toBe('w3-s4');
    expect(w3s4.world).toBe('w3');
    expect(w3s4.encounterDogId).toBe('bernese');
    expect(w3s4.treats).toBeUndefined();
    expect(w3s4.palette).toEqual(['straight', 'corner', 'tee']);
  });

  it('(c) 意図解(外周3辺の最長13枚)で ★→◎ がつながる', () => {
    expectIntendedSolutionSolves(w3s4, W3S4_INTENDED);
  });

  it('(d) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w3s4)).toBe(true);
  });

  it('(f) 意図解(13枚)より短い別解がない(内側ダミーは近道にならない)', () => {
    expectRouteIsMinimal(w3s4, W3S4_INTENDED);
  });

  it('(g) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w3s4);
  });
});
