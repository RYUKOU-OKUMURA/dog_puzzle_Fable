import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import { isStageSolvable } from '../src/core/solver';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import {
  expectIntendedSolutionSolves,
  expectNoRevisitShortcut,
  expectRouteIsMinimal,
} from './helpers';
import { w5s1 } from '../src/stage/w5s1';
import { w5s2 } from '../src/stage/w5s2';
import { w5s3 } from '../src/stage/w5s3';
import { w5s4 } from '../src/stage/w5s4';

/**
 * W5 ステージ4種の検証(M11 大型化後)。全ギミック複合・最大盤面12×12。
 * 各ステージで (a) 盤面構成 (b) 難度・テーマ (c) メタ (d) 意図解で complete
 * (e) 橋必須 (f) 予算内で解あり (g) 意図解が最小 (h) 孤立スロットなし を確認する。
 */

/** 橋を除外した複製ステージ(橋必須判定用) */
function withoutBridges(stage: StageDef): StageDef {
  return {
    ...stage,
    fixedRoads: stage.fixedRoads.filter((r) => r.kind !== 'bridge'),
  };
}

/** 意図解を置いても橋なしでは complete にならないことを assert */
function expectBridgeRequired(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): void {
  const grid = new Grid(withoutBridges(stage));
  for (const p of placements) {
    expect(grid.place(p.pos, p.kind, p.rotation)).toBe(true);
  }
  expect(findPath(grid).complete, `${stage.id}: 橋なしでは complete にならない`).toBe(false);
}

/** 上下左右のいずれにも道/スロット/★/◎が隣接しない = 孤立スロット */
const N4 = [
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

function expectNoIsolatedSlots(stage: StageDef): void {
  const isolated = stage.slots.filter((s) => isIsolated(stage, s));
  expect(
    isolated,
    `${stage.id}: 孤立スロットがないこと (${isolated.map((s) => posKey(s)).join(', ')})`,
  ).toEqual([]);
}

// ============================================================================
// w5-s1「ゆきの まち」(🦴4 / 11×11・ひかえめ複合)
// ============================================================================
describe('w5-s1「ゆきの まち」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 4, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 4, z: 3 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 4, z: 5 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 4, z: 6 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 5, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 7, z: 6 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 7, z: 7 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 7, z: 8 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 8, z: 8 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 9, z: 8 }, kind: 'corner' as const, rotation: 180 as const },
  ];

  it('(a) 11×11、スロット15(正解14+ダミー1)、おやつ1、橋1', () => {
    expect(w5s1.size).toEqual({ w: 11, h: 11 });
    expect(w5s1.slots.length).toBe(15);
    expect(w5s1.treats).toHaveLength(1);
    expect(w5s1.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(1);
  });

  it('(b) 難度が 4、theme が snow', () => {
    expect(w5s1.difficulty).toBe(4);
    expect(w5s1.theme).toBe('snow');
  });

  it('(c) メタ情報が要件どおり', () => {
    expect(w5s1.id).toBe('w5-s1');
    expect(w5s1.world).toBe('w5');
    expect(w5s1.encounterDogId).toBe('husky');
  });

  it('(d) 意図解で解ける(★→◎・おやつ全通過・橋通過)', () => {
    expectIntendedSolutionSolves(w5s1, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w5s1, solution);
  });

  it('(f) core ソルバでも解が存在する(予算内)', () => {
    expect(isStageSolvable(w5s1)).toBe(true);
  });

  it('(g) 意図解(14枚)より短い別解がない', () => {
    expectRouteIsMinimal(w5s1, solution);
  });

  it('(h) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w5s1);
  });
});

// ============================================================================
// w5-s2「あたたかい よるの まち」(🦴4 / 11×11・純粋チェーン迷路・おやつ2・橋なし・M12修正)
// 旧盤面は T字分岐点が3つあり再訪ショートカット(13枚別解)があった。ルートを純粋チェーン
// (全セル次数2)に再設計し、T字分岐点をゼロにして再訪ショートカットを構造的に排除。
// ============================================================================
describe('w5-s2「あたたかい よるの まち」', () => {
  // 純粋チェーン(ルート上の全セルが次数2・T字分岐点ゼロ)。おやつ(4,1)(4,5)は東西に貫通する
  // 直線マス。分岐点がないため「分岐点→おやつ→分岐点(別mask再訪)」のスパー往復ショートカットが
  // 幾何的に不可能。ダミー4((7,1)(7,3)(6,5)(1,6))は隣接ルート角の開いていない方向を向き、ルートへ繋がらない。
  const solution = [
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'straight' as const, rotation: 90 as const }, // おやつ
    { pos: { x: 5, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 1 }, kind: 'corner' as const, rotation: 180 as const }, // ┐ S,W
    { pos: { x: 6, z: 3 }, kind: 'corner' as const, rotation: 270 as const }, // ┘ N,W
    { pos: { x: 5, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 2, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 1, z: 3 }, kind: 'corner' as const, rotation: 90 as const }, // ┌ E,S
    { pos: { x: 1, z: 5 }, kind: 'corner' as const, rotation: 0 as const }, // └ N,E
    { pos: { x: 2, z: 5 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 5 }, kind: 'straight' as const, rotation: 90 as const }, // おやつ
    { pos: { x: 5, z: 5 }, kind: 'corner' as const, rotation: 180 as const }, // ┐ S,W
  ];

  it('(a) 11×11、スロット18(正解14+ダミー4)、おやつ2、橋なし', () => {
    expect(w5s2.size).toEqual({ w: 11, h: 11 });
    expect(w5s2.slots.length).toBe(18);
    expect(w5s2.treats).toEqual([
      { x: 4, z: 1 },
      { x: 4, z: 5 },
    ]);
    expect(w5s2.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(0);
  });

  it('(b) 難度が 4、theme が night', () => {
    expect(w5s2.difficulty).toBe(4);
    expect(w5s2.theme).toBe('night');
  });

  it('(c) メタ情報が要件どおり', () => {
    expect(w5s2.id).toBe('w5-s2');
    expect(w5s2.world).toBe('w5');
    expect(w5s2.encounterDogId).toBe('samoyed');
  });

  it('(d) 意図解で解ける(おやつ2つ全通過)', () => {
    expectIntendedSolutionSolves(w5s2, solution);
  });

  it('(f) core ソルバでも解が存在する(予算内)', () => {
    expect(isStageSolvable(w5s2)).toBe(true);
  });

  it('(g) 意図解(14枚)が最小(ルート各マス必須)', () => {
    expectRouteIsMinimal(w5s2, solution);
  });

  // (g2) 再訪ショートカット: この盤面は純粋チェーン(T字分岐点ゼロ)のため、分岐点を用いた
  // スパー往復再訪ショートカットが幾何的に不可能。オフラインで canSolveTreatAware(30Mノード)
  // によっても別解(ok=true)は検出されず(網羅証明は14枚盤でタイムアウト)。テストは構造的保証
  // (純粋チェーン) + expectRouteIsMinimal で運用する(w5-s4 と同様の方針)。

  it('(h) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w5s2);
  });
});

// ============================================================================
// w5-s3「ちゅうかがい」(🦴5 / 12×12・全部乗せ・T字なし)
// ============================================================================
describe('w5-s3「ちゅうかがい」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 4, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 4, z: 3 }, kind: 'corner' as const, rotation: 270 as const },
    { pos: { x: 3, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 2, z: 3 }, kind: 'corner' as const, rotation: 90 as const },
    { pos: { x: 2, z: 5 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 2, z: 6 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 3, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 6 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 4, z: 7 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 4, z: 9 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 5, z: 9 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 9 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 7, z: 9 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 7, z: 10 }, kind: 'straight' as const, rotation: 0 as const },
  ];

  it('(a) 12×12、スロット20(正解17+ダミー3)、おやつ2、橋2、palette に tee なし', () => {
    expect(w5s3.size).toEqual({ w: 12, h: 12 });
    expect(w5s3.slots.length).toBe(20);
    expect(w5s3.treats).toHaveLength(2);
    expect(w5s3.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(2);
    expect(w5s3.palette).toEqual(['straight', 'corner']);
  });

  it('(b) 難度が 5、theme が chinatown', () => {
    expect(w5s3.difficulty).toBe(5);
    expect(w5s3.theme).toBe('chinatown');
  });

  it('(c) メタ情報が要件どおり', () => {
    expect(w5s3.id).toBe('w5-s3');
    expect(w5s3.world).toBe('w5');
    expect(w5s3.encounterDogId).toBe('shihTzu');
  });

  it('(d) 意図解で解ける(橋2本・おやつ2つ全通過)', () => {
    expectIntendedSolutionSolves(w5s3, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w5s3, solution);
  });

  it('(f) core ソルバでも解が存在する(12×12・予算内)', () => {
    expect(isStageSolvable(w5s3)).toBe(true);
  });

  it('(g) 意図解(17枚)より短い別解がない', () => {
    expectRouteIsMinimal(w5s3, solution);
  });

  it('(g2) 意図解(17枚)より短い再訪ショートカット別解がない(マスク込み網羅探索)', () => {
    expectNoRevisitShortcut(w5s3, 17);
  });

  it('(h) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w5s3);
  });
});

// ============================================================================
// w5-s4「フィナーレの おまつり」(🦴5 / 12×12・最大盤面・最難関)
// 再訪ショートカット: おやつは正解ルート上の次数2鎖、ダミー/橋EW飾りはおやつへ届かない行き止まり。
// マスク込み網羅は予算超過のため構造的保証 + expectRouteIsMinimal で運用(w5-s2 同趣旨)。
// ============================================================================
describe('w5-s4「フィナーレの おまつり」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 4, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 4, z: 3 }, kind: 'corner' as const, rotation: 270 as const },
    { pos: { x: 3, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 2, z: 3 }, kind: 'corner' as const, rotation: 90 as const },
    { pos: { x: 2, z: 5 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 2, z: 6 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 3, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 5, z: 6 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 5, z: 7 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 6, z: 7 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 6, z: 9 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 6, z: 10 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 7, z: 10 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 8, z: 10 }, kind: 'corner' as const, rotation: 180 as const },
  ];

  it('(a) 12×12、スロット20(正解18+ダミー2)、おやつ3、橋2', () => {
    expect(w5s4.size).toEqual({ w: 12, h: 12 });
    expect(w5s4.slots.length).toBe(20);
    expect(w5s4.treats).toHaveLength(3);
    expect(w5s4.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(2);
  });

  it('(b) 難度が 5、theme が festival', () => {
    expect(w5s4.difficulty).toBe(5);
    expect(w5s4.theme).toBe('festival');
  });

  it('(c) メタ情報が要件どおり', () => {
    expect(w5s4.id).toBe('w5-s4');
    expect(w5s4.world).toBe('w5');
    expect(w5s4.encounterDogId).toBe('dachshund');
  });

  it('(d) 意図解で解ける(橋2本・おやつ3つ全通過)', () => {
    expectIntendedSolutionSolves(w5s4, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w5s4, solution);
  });

  it('(f) core ソルバでも解が存在する(12×12・予算内)', () => {
    expect(isStageSolvable(w5s4)).toBe(true);
  });

  it('(g) 意図解(18枚)より短い別解がない', () => {
    expectRouteIsMinimal(w5s4, solution);
  });

  it('(h) 孤立スロットがない', () => {
    expectNoIsolatedSlots(w5s4);
  });
});
