import { describe, expect, it } from 'vitest';
import { isStageSolvable } from '../src/core/solver';
import type { GridPos, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { w1s2 } from '../src/stage/w1s2';
import { w1s3 } from '../src/stage/w1s3';
import { w1s4 } from '../src/stage/w1s4';
import { expectIntendedSolutionSolves, expectNoShorterSolution } from './helpers';

/**
 * W1 新ステージ3種(M11 大型化・難化版)の検証。
 * 各ステージで (a) スロット数 (b) 難度 (c) 意図解での解可能性
 * (d) 総当たりソルバで解あり (f) 意図解より短い別解なし
 * (g) 孤立スロットなし を確認する。
 *
 * 設計原則: ★→◎ の正解ルートは唯一の単純経路で、dummy はすべて
 * 「正解ルートから分岐する行き止まり・どこにも合流しない」構造。
 * これにより検証が高速かつ健全になる。
 */

// ----------------------------------------------------------------------------
// 孤立スロット判定(スニペット)。隣接4マスのいずれかが
// スロット/固定道/スタート/ゴールなら非孤立。
// ----------------------------------------------------------------------------
const N4 = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];
function isIsolated(stage: StageDef, slot: GridPos): boolean {
  const c = new Set<string>();
  for (const s of stage.slots) c.add(posKey(s));
  for (const r of stage.fixedRoads) c.add(posKey(r.pos));
  c.add(posKey(stage.start.pos));
  c.add(posKey(stage.goal.pos));
  for (const d of N4) {
    if (c.has(posKey({ x: slot.x + d.x, z: slot.z + d.z }))) return false;
  }
  return true;
}

/** ステージの全スロットが孤立していないことを assert */
function expectNoIsolatedSlots(stage: StageDef): void {
  const isolated = stage.slots.filter((s) => isIsolated(stage, s)).map(posKey);
  expect(isolated, `${stage.id}: 孤立スロットなし`).toEqual([]);
}

// ============================================================================
// w1-s2「にほんの まち 2」(🦴2 / 曲がり角めいろ / 9×9 / スロット7 = 意図解6 + おとり1)
// ============================================================================
describe('w1-s2「にほんの まち 2」', () => {
  it('(a) スロット数が 7(意図解6 + おとり1)', () => {
    expect(w1s2.slots.length).toBe(7);
  });

  it('(b) 難度が 2', () => {
    expect(w1s2.difficulty).toBe(2);
  });

  it('メタ情報が要件どおり', () => {
    expect(w1s2.id).toBe('w1-s2');
    expect(w1s2.world).toBe('w1');
    expect(w1s2.encounterDogId).toBe('chin');
    expect(w1s2.size).toEqual({ w: 9, h: 9 });
    expect(w1s2.palette).toEqual(['straight', 'corner', 'tee']);
    expect(w1s2.treats).toEqual([]);
  });

  it('(c) 意図解(階段状に角を繰り返す)で解ける', () => {
    // ★(1,1) → (2,1)直線 → (3,1)┐南折れ → (3,2)└東折れ → (4,2)直線
    // → (5,2)┐南折れ → (5,3)└東折れ → 固定─(6,3) → ◎(7,3)
    expectIntendedSolutionSolves(w1s2, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─ 東西
      { pos: { x: 3, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ 南・西
      { pos: { x: 3, z: 2 }, kind: 'corner', rotation: 0 }, // └ 北・東
      { pos: { x: 4, z: 2 }, kind: 'straight', rotation: 90 }, // ─ 東西
      { pos: { x: 5, z: 2 }, kind: 'corner', rotation: 180 }, // ┐ 南・西
      { pos: { x: 5, z: 3 }, kind: 'corner', rotation: 0 }, // └ 北・東 → 固定─(6,3) → ◎(7,3)
    ]);
  });

  it('(d) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w1s2)).toBe(true);
  });

  it('(f) 意図解(6枚)より短い別解がない', () => {
    expectNoShorterSolution(w1s2, 6);
  });

  it('(g) 孤立スロットなし', () => {
    expectNoIsolatedSlots(w1s2);
  });
});

// ============================================================================
// w1-s3「にほんの まち 3」(🦴2 / T字路 + 行き止まりデコイ / 9×9 / スロット9 = 意図解7 + デコイ2)
// ============================================================================
describe('w1-s3「にほんの まち 3」', () => {
  it('(a) スロット数が 9(意図解7 + デコイ2)', () => {
    expect(w1s3.slots.length).toBe(9);
  });

  it('(b) 難度が 2', () => {
    expect(w1s3.difficulty).toBe(2);
  });

  it('メタ情報が要件どおり', () => {
    expect(w1s3.id).toBe('w1-s3');
    expect(w1s3.world).toBe('w1');
    expect(w1s3.encounterDogId).toBe('spitz');
    expect(w1s3.size).toEqual({ w: 9, h: 9 });
    expect(w1s3.palette).toEqual(['straight', 'corner', 'tee']);
    expect(w1s3.treats).toEqual([]);
  });

  it('T字路の釣り分岐デコイ(3,2)(3,3)がスロットとして存在', () => {
    const slotKeys = new Set(w1s3.slots.map(posKey));
    expect(slotKeys.has('3,2')).toBe(true);
    expect(slotKeys.has('3,3')).toBe(true);
  });

  it('(c) 意図解(T字路で東へ進み、南枝は行き止まりデコイ)で解ける', () => {
    // ★(1,1) → 固定─(2,1) → (3,1)┬で分岐(南枝はデコイのまま) → 東へ →
    // (6,1)┐南折れ → (6,2)│ → (6,3)└東折れ → (7,3)─ → ◎(8,3)
    expectIntendedSolutionSolves(w1s3, [
      { pos: { x: 3, z: 1 }, kind: 'tee', rotation: 180 }, // ┬ 西・東・南(南は空デコイ)
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 5, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 6, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ 南・西
      { pos: { x: 6, z: 2 }, kind: 'straight', rotation: 0 }, // │ 南北
      { pos: { x: 6, z: 3 }, kind: 'corner', rotation: 0 }, // └ 北・東
      { pos: { x: 7, z: 3 }, kind: 'straight', rotation: 90 }, // ─ → ◎(8,3)
    ]);
  });

  it('(d) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w1s3)).toBe(true);
  });

  it('(f) 意図解(7枚)より短い別解がない', () => {
    expectNoShorterSolution(w1s3, 7);
  });

  it('(g) 孤立スロットなし', () => {
    expectNoIsolatedSlots(w1s3);
  });
});

// ============================================================================
// w1-s4「にほんの まち 4」(🦴3 / ぐるっと遠回り / 9×9 / スロット10 = 意図解9 + おとり1)
// ============================================================================
describe('w1-s4「にほんの まち 4」', () => {
  it('(a) スロット数が 10(意図解9 + おとり1)', () => {
    expect(w1s4.slots.length).toBe(10);
  });

  it('(b) 難度が 3', () => {
    expect(w1s4.difficulty).toBe(3);
  });

  it('メタ情報が要件どおり', () => {
    expect(w1s4.id).toBe('w1-s4');
    expect(w1s4.world).toBe('w1');
    expect(w1s4.encounterDogId).toBe('kai');
    expect(w1s4.size).toEqual({ w: 9, h: 9 });
    expect(w1s4.palette).toEqual(['straight', 'corner', 'tee']);
    expect(w1s4.treats).toEqual([]);
  });

  it('近道を塞ぐ壁(★と◎の間と内側)がスロットでない', () => {
    // ★(1,1)と◎(1,3)の縦近道 (1,2) と、内側の縦抜け近道 (2,2)(3,2)(4,2) が塞がれていること
    const slotKeys = new Set(w1s4.slots.map(posKey));
    for (const key of ['1,2', '2,2', '3,2', '4,2']) {
      expect(slotKeys.has(key), `${key} は近道防止の壁(スロットでない)`).toBe(false);
    }
  });

  it('(c) 意図解(U字の遠回り: 東→南→西)で解ける', () => {
    // ★(1,1) → 東へ(2,1)(3,1)(4,1) → (5,1)┐南折れ → (5,2)│ → (5,3)┤西折れ(南はおとり)
    // → 西へ(4,3)(3,3)(2,3) → ◎(1,3)
    expectIntendedSolutionSolves(w1s4, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ 南・西
      { pos: { x: 5, z: 2 }, kind: 'straight', rotation: 0 }, // │ 南北
      { pos: { x: 5, z: 3 }, kind: 'tee', rotation: 270 }, // ┤ 北・南・西(南はおとり)
      { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 3 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 2, z: 3 }, kind: 'straight', rotation: 90 }, // ─ → ◎(1,3)
    ]);
  });

  it('(d) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w1s4)).toBe(true);
  });

  it('(f) 意図解(9枚)より短い別解がない', () => {
    expectNoShorterSolution(w1s4, 9);
  });

  it('(g) 孤立スロットなし', () => {
    expectNoIsolatedSlots(w1s4);
  });
});
