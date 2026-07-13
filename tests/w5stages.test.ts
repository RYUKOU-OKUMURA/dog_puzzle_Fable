import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import { isStageSolvable } from '../src/core/solver';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { w5s1 } from '../src/stage/w5s1';
import { w5s2 } from '../src/stage/w5s2';
import { w5s3 } from '../src/stage/w5s3';
import { w5s4 } from '../src/stage/w5s4';

/**
 * W5 ステージ4種の検証(M8)。全ギミック複合。ソルバは core/solver を使用。
 */

function expectIntendedSolutionSolves(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): Grid {
  const grid = new Grid(stage);
  const allowed = new Set(stage.palette ?? ['straight', 'corner', 'tee']);
  for (const p of placements) {
    expect(allowed.has(p.kind), `${p.kind} は palette 内`).toBe(true);
    expect(grid.place(p.pos, p.kind, p.rotation), `${posKey(p.pos)} に配置できる`).toBe(true);
  }
  const result = findPath(grid);
  expect(result.complete, '意図解で ★→◎ がつながる(全おやつ通過)').toBe(true);
  expect(result.route[0], 'ルートはスタートから').toEqual(stage.start.pos);
  expect(result.route[result.route.length - 1], 'ルートはゴールへ').toEqual(stage.goal.pos);
  const routeKeys = new Set(result.route.map(posKey));
  for (const t of stage.treats ?? []) {
    expect(routeKeys.has(posKey(t)), `おやつ(${posKey(t)}) をルートが通る`).toBe(true);
  }
  return grid;
}

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

// ============================================================================
// w5-s1「ゆきの まち」(🦴4 / 10×10・ひかえめ複合)
// ============================================================================
describe('w5-s1「ゆきの まち」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 4, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 4, z: 3 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 4, z: 6 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 5, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 6 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 6, z: 7 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 6, z: 8 }, kind: 'corner' as const, rotation: 0 as const },
  ];

  it('(a) 10×10、スロット11(正解10+ダミー1)、おやつ1、橋1', () => {
    expect(w5s1.size).toEqual({ w: 10, h: 10 });
    expect(w5s1.slots.length).toBe(11);
    expect(w5s1.treats).toHaveLength(1);
    expect(w5s1.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(1);
  });

  it('(b) 難度が 4、theme が snow', () => {
    expect(w5s1.difficulty).toBe(4);
    expect(w5s1.theme).toBe('snow');
  });

  it('メタ情報が要件どおり', () => {
    expect(w5s1.id).toBe('w5-s1');
    expect(w5s1.world).toBe('w5');
    expect(w5s1.encounterDogId).toBe('husky');
  });

  it('(d) 意図解で解ける', () => {
    expectIntendedSolutionSolves(w5s1, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w5s1, solution);
  });

  it('(f) core ソルバでも解が存在する', () => {
    expect(isStageSolvable(w5s1)).toBe(true);
  });
});

// ============================================================================
// w5-s2「あたたかい よるの まち」(🦴4 / おやつ+ダミー多め)
// ============================================================================
describe('w5-s2「あたたかい よるの まち」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 5, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 5, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 5, z: 3 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 5, z: 4 }, kind: 'corner' as const, rotation: 270 as const },
    { pos: { x: 4, z: 4 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 4 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 2, z: 4 }, kind: 'corner' as const, rotation: 90 as const },
    { pos: { x: 2, z: 5 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 2, z: 6 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 3, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 4, z: 6 }, kind: 'straight' as const, rotation: 90 as const },
  ];

  it('(a) スロット18(正解14+ダミー4)、おやつ2', () => {
    expect(w5s2.slots.length).toBe(18);
    expect(w5s2.treats).toHaveLength(2);
  });

  it('(b) 難度が 4、theme が night', () => {
    expect(w5s2.difficulty).toBe(4);
    expect(w5s2.theme).toBe('night');
  });

  it('メタ情報が要件どおり', () => {
    expect(w5s2.id).toBe('w5-s2');
    expect(w5s2.encounterDogId).toBe('samoyed');
  });

  it('(d) 意図解で解ける', () => {
    expectIntendedSolutionSolves(w5s2, solution);
  });

  it('(f) core ソルバでも解が存在する', () => {
    expect(isStageSolvable(w5s2)).toBe(true);
  });
});

// ============================================================================
// w5-s3「ちゅうかがい」(🦴5 / 全部乗せ)
// ============================================================================
describe('w5-s3「ちゅうかがい」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 3, z: 4 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 4, z: 4 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 4 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 6, z: 5 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 6, z: 6 }, kind: 'corner' as const, rotation: 0 as const },
  ];

  it('(a) スロット10、おやつ2、橋2、palette に tee なし', () => {
    expect(w5s3.slots.length).toBe(10);
    expect(w5s3.treats).toHaveLength(2);
    expect(w5s3.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(2);
    expect(w5s3.palette).toEqual(['straight', 'corner']);
  });

  it('(b) 難度が 5、theme が chinatown', () => {
    expect(w5s3.difficulty).toBe(5);
    expect(w5s3.theme).toBe('chinatown');
  });

  it('メタ情報が要件どおり', () => {
    expect(w5s3.id).toBe('w5-s3');
    expect(w5s3.encounterDogId).toBe('shihTzu');
  });

  it('(d) 意図解で解ける', () => {
    expectIntendedSolutionSolves(w5s3, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w5s3, solution);
  });

  it('(f) core ソルバでも解が存在する', () => {
    expect(isStageSolvable(w5s3)).toBe(true);
  });
});

// ============================================================================
// w5-s4「フィナーレの おまつり」(🦴5 / 最大盤面・最難関)
// ============================================================================
describe('w5-s4「フィナーレの おまつり」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 3, z: 4 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 4, z: 4 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 4 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 6, z: 5 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 6, z: 6 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 6, z: 7 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 7, z: 7 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 8, z: 7 }, kind: 'corner' as const, rotation: 180 as const },
  ];

  it('(a) 10×10、スロット14、おやつ3、橋2', () => {
    expect(w5s4.size).toEqual({ w: 10, h: 10 });
    expect(w5s4.slots.length).toBe(14);
    expect(w5s4.treats).toHaveLength(3);
    expect(w5s4.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(2);
  });

  it('(b) 難度が 5、theme が festival', () => {
    expect(w5s4.difficulty).toBe(5);
    expect(w5s4.theme).toBe('festival');
  });

  it('メタ情報が要件どおり', () => {
    expect(w5s4.id).toBe('w5-s4');
    expect(w5s4.encounterDogId).toBe('dachshund');
  });

  it('(d) 意図解で解ける', () => {
    expectIntendedSolutionSolves(w5s4, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w5s4, solution);
  });

  it('(f) core ソルバでも解が存在する', () => {
    expect(isStageSolvable(w5s4)).toBe(true);
  });
});
