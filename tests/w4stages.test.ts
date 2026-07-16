import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import { isStageSolvable } from '../src/core/solver';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { w4s1 } from '../src/stage/w4s1';
import { w4s2 } from '../src/stage/w4s2';
import { w4s3 } from '../src/stage/w4s3';
import { w4s4 } from '../src/stage/w4s4';
import {
  expectIntendedSolutionSolves,
  expectNoRevisitShortcut,
  expectRouteIsMinimal,
} from './helpers';

/**
 * W4 ステージ4種の検証(M11: 11×11 大型化・難化)。
 * 橋ギミックが主役: 各ステージ「橋を使わないと解けない」をアサートする。
 * ソルバは core/solver、別解抑制は helpers(expectRouteIsMinimal: ルート各マス必須判定)を使用。
 */

/** 意図解で complete かつ橋を通過していることを assert */
function expectSolvesWithBridge(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): void {
  expectIntendedSolutionSolves(stage, placements);
  const grid = new Grid(stage);
  for (const p of placements) grid.place(p.pos, p.kind, p.rotation);
  const route = findPath(grid).route;
  const routeKeys = new Set(route.map(posKey));
  const bridges = stage.fixedRoads.filter((r) => r.kind === 'bridge');
  expect(
    bridges.some((b) => routeKeys.has(posKey(b.pos))),
    `${stage.id}: ルートが橋を通る`,
  ).toBe(true);
}

/** 橋を取り除いたステージ(「橋なしでは解けない」検証用) */
function withoutBridges(stage: StageDef): StageDef {
  return {
    ...stage,
    fixedRoads: stage.fixedRoads.filter((r) => r.kind !== 'bridge'),
  };
}

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

// 孤立スロット判定(隣接4マスに道/スロット/端点が一つも無いもの)
const N4 = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];
function findIsolatedSlots(stage: StageDef): GridPos[] {
  const cells = new Set<string>();
  for (const s of stage.slots) cells.add(posKey(s));
  for (const r of stage.fixedRoads) cells.add(posKey(r.pos));
  cells.add(posKey(stage.start.pos));
  cells.add(posKey(stage.goal.pos));
  const isolated: GridPos[] = [];
  for (const slot of stage.slots) {
    const hasNeighbor = N4.some((d) => cells.has(posKey({ x: slot.x + d.x, z: slot.z + d.z })));
    // 隣接マスが「同じスロット集合内」にあっても、それが道になり得ない添景同士隣接は除外済み(cells は道になり得るマスのみ)
    if (!hasNeighbor) isolated.push(slot);
  }
  return isolated;
}

// ============================================================================
// w4-s1「アメリカの まち 1」(🦴3 / 橋導入・交差1回)
// ============================================================================
describe('w4-s1「アメリカの まち 1」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 5, z: 1 }, kind: 'corner' as const, rotation: 180 as const }, // ┐{S,W}
    { pos: { x: 5, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 5, z: 3 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 5, z: 7 }, kind: 'corner' as const, rotation: 0 as const }, // └{N,E}
    { pos: { x: 6, z: 7 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 7, z: 7 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 8, z: 7 }, kind: 'straight' as const, rotation: 90 as const },
  ];

  it('(a) 11×11・スロット11(正解10+ダミー1)・橋1・おやつ0', () => {
    expect(w4s1.size).toEqual({ w: 11, h: 11 });
    expect(w4s1.slots.length).toBe(11);
    expect(w4s1.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(1);
    expect(w4s1.treats ?? []).toHaveLength(0);
  });

  it('(b) 難度3・メタ情報', () => {
    expect(w4s1.difficulty).toBe(3);
    expect(w4s1.id).toBe('w4-s1');
    expect(w4s1.world).toBe('w4');
    expect(w4s1.encounterDogId).toBe('chihuahua');
  });

  it('(c) 意図解で解ける(橋も通過)', () => {
    expectSolvesWithBridge(w4s1, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w4s1, solution);
  });

  it('(f) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w4s1)).toBe(true);
  });

  it('(g) 意図解(10枚)より短い別解がない', () => {
    expectRouteIsMinimal(w4s1, solution);
  });

  it('(h) 孤立スロットがない', () => {
    expect(findIsolatedSlots(w4s1)).toEqual([]);
  });
});

// ============================================================================
// w4-s2「アメリカの まち 2」(🦴4 / 橋1+おやつ2)
// ============================================================================
describe('w4-s2「アメリカの まち 2」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 5, z: 1 }, kind: 'corner' as const, rotation: 180 as const }, // ┐{S,W}
    { pos: { x: 5, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 5, z: 3 }, kind: 'straight' as const, rotation: 0 as const }, // おやつ
    { pos: { x: 5, z: 7 }, kind: 'straight' as const, rotation: 0 as const }, // おやつ
    { pos: { x: 5, z: 8 }, kind: 'corner' as const, rotation: 0 as const }, // └{N,E}
    { pos: { x: 6, z: 8 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 7, z: 8 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 8, z: 8 }, kind: 'straight' as const, rotation: 90 as const },
  ];

  it('(a) 11×11・スロット13(正解11+ダミー2)・橋1・おやつ2', () => {
    expect(w4s2.size).toEqual({ w: 11, h: 11 });
    expect(w4s2.slots.length).toBe(13);
    expect(w4s2.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(1);
    expect(w4s2.treats ?? []).toHaveLength(2);
  });

  it('(b) 難度4・メタ情報', () => {
    expect(w4s2.difficulty).toBe(4);
    expect(w4s2.id).toBe('w4-s2');
    expect(w4s2.encounterDogId).toBe('bostonTerrier');
  });

  it('(c) 意図解で解ける(橋も通過)', () => {
    expectSolvesWithBridge(w4s2, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w4s2, solution);
  });

  it('(f) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w4s2)).toBe(true);
  });

  it('(g) 意図解(11枚)より短い別解がない', () => {
    expectRouteIsMinimal(w4s2, solution);
  });

  it('(g2) 意図解(11枚)より短い再訪ショートカット別解がない(マスク込み網羅探索)', () => {
    // 実測 ~5秒・約46万ノード。既定 timeout(5秒)ぎりぎりなので余裕を持たせる
    expectNoRevisitShortcut(w4s2, 11);
  }, 30_000);

  it('(h) 孤立スロットがない', () => {
    expect(findIsolatedSlots(w4s2)).toEqual([]);
  });
});

// ============================================================================
// w4-s3「メキシコの まち 1」(🦴4 / 橋2+ダミー・S字)
// ============================================================================
describe('w4-s3「メキシコの まち 1」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'corner' as const, rotation: 180 as const }, // ┐{S,W}
    // │(4,2) → 橋(4,3) → │(4,4)
    { pos: { x: 4, z: 5 }, kind: 'corner' as const, rotation: 0 as const }, // └{N,E}
    { pos: { x: 5, z: 5 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 5 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 7, z: 5 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 8, z: 5 }, kind: 'corner' as const, rotation: 180 as const }, // ┐{S,W}
    // │(8,6) → 橋(8,7) → │(8,8)
    { pos: { x: 8, z: 9 }, kind: 'corner' as const, rotation: 270 as const }, // ┘{N,W}
    { pos: { x: 7, z: 9 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 9 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 5, z: 9 }, kind: 'straight' as const, rotation: 90 as const },
  ];

  it('(a) 11×11・スロット15(正解12+ダミー3)・橋2・おやつ0', () => {
    expect(w4s3.size).toEqual({ w: 11, h: 11 });
    expect(w4s3.slots.length).toBe(15);
    expect(w4s3.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(2);
    expect(w4s3.treats ?? []).toHaveLength(0);
  });

  it('(b) 難度4・メタ情報', () => {
    expect(w4s3.difficulty).toBe(4);
    expect(w4s3.id).toBe('w4-s3');
    expect(w4s3.encounterDogId).toBe('malamute');
  });

  it('(c) 意図解で解ける(橋も通過)', () => {
    expectSolvesWithBridge(w4s3, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w4s3, solution);
  });

  it('(f) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w4s3)).toBe(true);
  });

  it('(g) 意図解(12枚)より短い別解がない', () => {
    expectRouteIsMinimal(w4s3, solution);
  });

  it('(h) 孤立スロットがない', () => {
    expect(findIsolatedSlots(w4s3)).toEqual([]);
  });
});

// ============================================================================
// w4-s4「メキシコの まち 2」(🦴5 / 橋2+おやつ3・総仕上げ)
// 再訪ショートカット: おやつは正解ルート上の次数2鎖、ダミーは橋EW飾りの行き止まりでおやつへ
// 届かない。マスク込み網羅は予算超過のため構造的保証 + expectRouteIsMinimal で運用(w5-s2 同趣旨)。
// ============================================================================
describe('w4-s4「メキシコの まち 2」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'straight' as const, rotation: 90 as const }, // おやつ
    { pos: { x: 5, z: 1 }, kind: 'corner' as const, rotation: 180 as const }, // ┐{S,W}
    { pos: { x: 5, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
    // │(5,3) → 橋(5,4) → │(5,5)
    { pos: { x: 5, z: 6 }, kind: 'corner' as const, rotation: 0 as const }, // └{N,E}
    { pos: { x: 6, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 7, z: 6 }, kind: 'straight' as const, rotation: 90 as const }, // おやつ
    { pos: { x: 8, z: 6 }, kind: 'corner' as const, rotation: 180 as const }, // ┐{S,W}
    // │(8,7) → 橋(8,8) → │(8,9)
    { pos: { x: 8, z: 10 }, kind: 'corner' as const, rotation: 270 as const }, // ┘{N,W}
    { pos: { x: 7, z: 10 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 10 }, kind: 'straight' as const, rotation: 90 as const }, // おやつ
    { pos: { x: 5, z: 10 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 10 }, kind: 'straight' as const, rotation: 90 as const },
  ];

  it('(a) 11×11・スロット17(正解14+ダミー3)・橋2・おやつ3', () => {
    expect(w4s4.size).toEqual({ w: 11, h: 11 });
    expect(w4s4.slots.length).toBe(17);
    expect(w4s4.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(2);
    expect(w4s4.treats ?? []).toHaveLength(3);
  });

  it('(b) 難度5・メタ情報', () => {
    expect(w4s4.difficulty).toBe(5);
    expect(w4s4.id).toBe('w4-s4');
    expect(w4s4.encounterDogId).toBe('labrador');
  });

  it('(c) 意図解で解ける(橋も通過)', () => {
    expectSolvesWithBridge(w4s4, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w4s4, solution);
  });

  it('(f) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w4s4)).toBe(true);
  });

  it('(g) 意図解(14枚)より短い別解がない', () => {
    expectRouteIsMinimal(w4s4, solution);
  });

  it('(h) 孤立スロットがない', () => {
    expect(findIsolatedSlots(w4s4)).toEqual([]);
  });
});
