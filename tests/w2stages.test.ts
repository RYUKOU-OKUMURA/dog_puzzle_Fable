import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import { isStageSolvable } from '../src/core/solver';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import {
  expectIntendedSolutionSolves,
  expectNoRevisitShortcut,
  expectNoShorterSolution,
} from './helpers';
import { w2s1 } from '../src/stage/w2s1';
import { w2s2 } from '../src/stage/w2s2';
import { w2s3 } from '../src/stage/w2s3';
import { w2s4 } from '../src/stage/w2s4';

/**
 * W2(イギリス) 新ステージ4種の検証。M11 で全ステージを10×10に大型化した。
 *
 * 各ステージで:
 *  (a) サイズが 10×10
 *  (b) スロット数
 *  (c) メタ情報(id/world/dog/難度/size/treats/palette)
 *  (d) 意図解(全おやつ通過)で complete: helpers の expectIntendedSolutionSolves(おやつも検証)
 *  (e) 総当たりソルバ isStageSolvable でおやつ全部通過の解が存在する
 *  (f) 意図解より短い(枚数が少ない)別解はない: helpers の expectNoShorterSolution
 *  (g) 孤立スロットなし(隣接4近傍に道/スロット/端点が少なくとも1つ)
 * w2-s3 は追加で「最短路でおやつを取りこぼす(complete=false, goalReachable=true)」を検証する。
 */

// ----------------------------------------------------------------------------
// 共用ヘルパ
// ----------------------------------------------------------------------------

/** おやつを取りこぼす配置が「おやつ残り(complete=false, goalReachable=true)」になることを確認 */
function expectTreatsRemaining(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): void {
  const grid = new Grid(stage);
  for (const p of placements) grid.place(p.pos, p.kind, p.rotation);
  const result = findPath(grid);
  expect(result.complete, 'おやつが残るので complete=false').toBe(false);
  expect(result.goalReachable, 'ゴールには届く(goalReachable=true)').toBe(true);
}

/** 孤立スロット判定: 上下左右のいずれにも道/スロット/★/◎が無ければ孤立 */
const N4: ReadonlyArray<GridPos> = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];
function isIsolated(stage: StageDef, slot: GridPos): boolean {
  const connected = new Set<string>();
  for (const s of stage.slots) connected.add(posKey(s));
  for (const r of stage.fixedRoads) connected.add(posKey(r.pos));
  connected.add(posKey(stage.start.pos));
  connected.add(posKey(stage.goal.pos));
  for (const d of N4) {
    if (connected.has(posKey({ x: slot.x + d.x, z: slot.z + d.z }))) return false;
  }
  return true;
}

/** 全スロットが非孤立であることを assert */
function expectNoIsolatedSlots(stage: StageDef): void {
  for (const s of stage.slots) {
    expect(isIsolated(stage, s), `${stage.id}: スロット(${posKey(s)})が孤立していない`).toBe(false);
  }
}

// ============================================================================
// w2-s1「イギリスの まち 1」(🦴2 / おやつ1 / 10×10 / スロット9 / 意図解8)
// ============================================================================
describe('w2-s1「イギリスの まち 1」', () => {
  it('(a) サイズが 10×10', () => {
    expect(w2s1.size).toEqual({ w: 10, h: 10 });
  });

  it('(b) スロット数が 9(ルート8 + ダミー1)', () => {
    expect(w2s1.slots.length).toBe(9);
  });

  it('(c) メタ情報が要件どおり', () => {
    expect(w2s1.id).toBe('w2-s1');
    expect(w2s1.world).toBe('w2');
    expect(w2s1.encounterDogId).toBe('corgi');
    expect(w2s1.difficulty).toBe(2);
    expect(w2s1.size).toEqual({ w: 10, h: 10 });
    expect(w2s1.treats).toEqual([{ x: 3, z: 1 }]);
    expect(w2s1.palette).toEqual(['straight', 'corner', 'tee']);
  });

  it('(d) 意図解(L字1本道・おやつ1)で解ける', () => {
    expectIntendedSolutionSolves(w2s1, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 }, // ─ おやつ
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 5, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 6, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 7, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ S,W
      { pos: { x: 7, z: 2 }, kind: 'straight', rotation: 0 }, // │
      { pos: { x: 7, z: 3 }, kind: 'straight', rotation: 0 }, // │ → ◎(7,4)
    ]);
  });

  it('(e) 総当たりソルバでもおやつ全部通過の解が存在する', () => {
    expect(isStageSolvable(w2s1)).toBe(true);
  });

  it('(f) 意図解(8枚)より短い別解がない', () => {
    expectNoShorterSolution(w2s1, 8);
  });

  it('(f2) 意図解(8枚)より短い再訪ショートカット別解がない(マスク込み網羅探索)', () => {
    expectNoRevisitShortcut(w2s1, 8);
  });

  it('(g) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w2s1);
  });
});

// ============================================================================
// w2-s2「イギリスの まち 2」(🦴3 / おやつ2 / 10×10 / スロット11 / 意図解9)
// ============================================================================
describe('w2-s2「イギリスの まち 2」', () => {
  it('(a) サイズが 10×10', () => {
    expect(w2s2.size).toEqual({ w: 10, h: 10 });
  });

  it('(b) スロット数が 11(ルート9 + ダミー2)', () => {
    expect(w2s2.slots.length).toBe(11);
  });

  it('(c) メタ情報が要件どおり', () => {
    expect(w2s2.id).toBe('w2-s2');
    expect(w2s2.world).toBe('w2');
    expect(w2s2.encounterDogId).toBe('beagle');
    expect(w2s2.difficulty).toBe(3);
    expect(w2s2.size).toEqual({ w: 10, h: 10 });
    expect(w2s2.treats).toEqual([
      { x: 3, z: 1 },
      { x: 6, z: 3 },
    ]);
    expect(w2s2.palette).toEqual(['straight', 'corner', 'tee']);
  });

  it('(d) 意図解(U字遠回り・おやつ2)で解ける', () => {
    expectIntendedSolutionSolves(w2s2, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 }, // ─ おやつ
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 5, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 6, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 7, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ S,W
      { pos: { x: 7, z: 2 }, kind: 'straight', rotation: 0 }, // │
      { pos: { x: 7, z: 3 }, kind: 'corner', rotation: 270 }, // ┘ N,W
      { pos: { x: 6, z: 3 }, kind: 'straight', rotation: 90 }, // ─ おやつ → ◎(5,3)
    ]);
  });

  it('(e) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w2s2)).toBe(true);
  });

  it('(f) 意図解(9枚)より短い別解がない', () => {
    expectNoShorterSolution(w2s2, 9);
  });

  it('(f2) 意図解(9枚)より短い再訪ショートカット別解がない(マスク込み網羅探索)', () => {
    expectNoRevisitShortcut(w2s2, 9);
  });

  it('(g) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w2s2);
  });
});

// ============================================================================
// w2-s3「イギリスの まち 3」(🦴3 / おやつ2 / 10×10 / スロット9 / 意図解8)
// 近道ではおやつを取れないギミック(M12: 再訪ショートカットを潰して再設計)
// ============================================================================
describe('w2-s3「イギリスの まち 3」', () => {
  it('(a) サイズが 10×10', () => {
    expect(w2s3.size).toEqual({ w: 10, h: 10 });
  });

  it('(b) スロット数が 9(ルート8 + 近道1)', () => {
    expect(w2s3.slots.length).toBe(9);
  });

  it('(c) メタ情報が要件どおり', () => {
    expect(w2s3.id).toBe('w2-s3');
    expect(w2s3.world).toBe('w2');
    expect(w2s3.encounterDogId).toBe('bulldog');
    expect(w2s3.difficulty).toBe(3);
    expect(w2s3.size).toEqual({ w: 10, h: 10 });
    expect(w2s3.treats).toEqual([
      { x: 5, z: 1 },
      { x: 5, z: 3 },
    ]);
    expect(w2s3.palette).toEqual(['straight', 'corner', 'tee']);
  });

  it('近道((3,2)経由の4枚)はおやつを取れない(おやつ残り)', () => {
    // ★(1,1)→(2,1)→(3,1)→(3,2)→(3,3)→◎(2,3) の近道。おやつ0個で complete=false。
    // 東側へ迂回しないと (5,1)(5,3) のおやつに届かない。
    expectTreatsRemaining(w2s3, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ S,W
      { pos: { x: 3, z: 2 }, kind: 'straight', rotation: 0 }, // │ N,S
      { pos: { x: 3, z: 3 }, kind: 'corner', rotation: 270 }, // ┘ N,W → ◎
    ]);
  });

  it('(d) 意図解(東へ迂回するU字ルート・おやつ2)で解ける', () => {
    expectIntendedSolutionSolves(w2s3, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ S,W おやつ
      { pos: { x: 5, z: 2 }, kind: 'straight', rotation: 0 }, // │ N,S
      { pos: { x: 5, z: 3 }, kind: 'corner', rotation: 270 }, // ┘ N,W おやつ
      { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 3 }, kind: 'straight', rotation: 90 }, // ─ → ◎(2,3)
    ]);
  });

  it('(e) 総当たりソルバでもおやつ全部通過の解が存在する', () => {
    expect(isStageSolvable(w2s3)).toBe(true);
  });

  it('(f) 意図解(8枚)より短い別解がない(マスク無し探索)', () => {
    expectNoShorterSolution(w2s3, 8);
  });

  it('(f2) 意図解(8枚)より短い再訪ショートカット別解がない(マスク込み網羅探索)', () => {
    // M12追加: findPath は「取ったおやつのビットマスク」を状態に含め再訪を許すため、
    // 従来の expectNoShorterSolution(マスク無し) は「分岐点をスパー往復して別maskで再訪する」
    // ショートカットを見逃していた。この検証はマスク込みで網羅し、別解なしを証明する。
    expectNoRevisitShortcut(w2s3, 8);
  });

  it('(g) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w2s3);
  });
});

// ============================================================================
// w2-s4「イギリスの まち 4」(🦴4 / おやつ3 / 10×10 / スロット14 / 意図解12)
// ============================================================================
describe('w2-s4「イギリスの まち 4」', () => {
  it('(a) サイズが 10×10', () => {
    expect(w2s4.size).toEqual({ w: 10, h: 10 });
  });

  it('(b) スロット数が 14(ルート12 + ダミー2)', () => {
    expect(w2s4.slots.length).toBe(14);
  });

  it('(c) メタ情報が要件どおり', () => {
    expect(w2s4.id).toBe('w2-s4');
    expect(w2s4.world).toBe('w2');
    expect(w2s4.encounterDogId).toBe('golden');
    expect(w2s4.difficulty).toBe(4);
    expect(w2s4.size).toEqual({ w: 10, h: 10 });
    expect(w2s4.treats).toEqual([
      { x: 4, z: 1 },
      { x: 7, z: 2 },
      { x: 5, z: 3 },
    ]);
    expect(w2s4.palette).toEqual(['straight', 'corner', 'tee']);
  });

  it('(d) 意図解(大きいU字経路・おやつ3)で解ける', () => {
    expectIntendedSolutionSolves(w2s4, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // ─ おやつ
      { pos: { x: 5, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 6, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 7, z: 1 }, kind: 'tee', rotation: 180 }, // ┬ W,E,S(E枝はダミー)
      { pos: { x: 7, z: 2 }, kind: 'straight', rotation: 0 }, // │ おやつ
      { pos: { x: 7, z: 3 }, kind: 'corner', rotation: 270 }, // ┘ N,W
      { pos: { x: 6, z: 3 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 5, z: 3 }, kind: 'straight', rotation: 90 }, // ─ おやつ
      { pos: { x: 4, z: 3 }, kind: 'tee', rotation: 180 }, // ┬ W,E,S(S枝はダミー)
      { pos: { x: 3, z: 3 }, kind: 'straight', rotation: 90 }, // ─ → ◎(2,3)
    ]);
  });

  it('(e) 総当たりソルバでもおやつ全部通過の解が存在する', () => {
    expect(isStageSolvable(w2s4)).toBe(true);
  });

  it('(f) 意図解(12枚)より短い別解がない', () => {
    expectNoShorterSolution(w2s4, 12);
  });

  it('(g) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w2s4);
  });
});
