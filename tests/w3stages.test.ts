import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { findPath } from '../src/core/path';
import { isStageSolvable } from '../src/core/solver';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { w3s1 } from '../src/stage/w3s1';
import { w3s2 } from '../src/stage/w3s2';
import { w3s3 } from '../src/stage/w3s3';
import { w3s4 } from '../src/stage/w3s4';
import { expectIntendedSolutionSolves, expectNoShorterSolution } from './helpers';
import { DIR_OFFSET, OPPOSITE, PLAYER_PANEL_KINDS } from '../src/core/panel';

/**
 * W3 ステージ4種の検証(M6 / M8.1)。ダミースロット・palette 制限・9×9・近道なし。
 * ソルバは stage.palette を尊重する(tee なしの w3-s2 を誤判定しない)。
 */

/** palette(未指定なら全種)から置けるパネル選択肢を作る */
function panelOptionsFor(stage: StageDef): Array<[PanelKind, Rotation]> {
  const kinds = stage.palette ?? PLAYER_PANEL_KINDS;
  const options: Array<[PanelKind, Rotation]> = [];
  for (const kind of kinds) {
    if (kind === 'straight') {
      options.push(['straight', 0], ['straight', 90]);
    } else if (kind === 'corner') {
      options.push(['corner', 0], ['corner', 90], ['corner', 180], ['corner', 270]);
    } else if (kind === 'tee') {
      options.push(['tee', 0], ['tee', 90], ['tee', 180], ['tee', 270]);
    }
  }
  return options;
}

function isSolvable(stage: StageDef): boolean {
  const grid = new Grid(stage);
  const visited = new Set<string>();
  return solveFrom(grid, stage.start.pos, visited, panelOptionsFor(stage));
}

function solveFrom(
  grid: Grid,
  current: GridPos,
  visited: Set<string>,
  options: Array<[PanelKind, Rotation]>,
): boolean {
  if (posKey(current) === posKey(grid.stage.goal.pos)) {
    return findPath(grid).complete;
  }
  visited.add(posKey(current));
  try {
    const conns = grid.connectionsAt(current);
    if (!conns) return false;
    for (const dir of conns) {
      const offset = DIR_OFFSET[dir];
      const next: GridPos = { x: current.x + offset.x, z: current.z + offset.z };
      if (!grid.inBounds(next)) continue;
      const nk = posKey(next);
      if (visited.has(nk)) continue;
      const nextConns = grid.connectionsAt(next);
      if (nextConns && nextConns.includes(OPPOSITE[dir])) {
        if (solveFrom(grid, next, visited, options)) return true;
      } else if (grid.isSlot(next) && !grid.panelAt(next)) {
        for (const [kind, rot] of options) {
          grid.place(next, kind, rot);
          const placed = grid.connectionsAt(next)!;
          if (placed.includes(OPPOSITE[dir])) {
            if (solveFrom(grid, next, visited, options)) {
              grid.remove(next);
              return true;
            }
          }
          grid.remove(next);
        }
      }
    }
    return false;
  } finally {
    visited.delete(posKey(current));
  }
}

const W3S1_INTENDED = [
  { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 4, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 5, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
  { pos: { x: 5, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
  { pos: { x: 5, z: 3 }, kind: 'corner' as const, rotation: 0 as const },
];

const W3S2_INTENDED = [
  { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 4, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
  { pos: { x: 4, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
  { pos: { x: 4, z: 3 }, kind: 'corner' as const, rotation: 270 as const },
  { pos: { x: 3, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 2, z: 3 }, kind: 'corner' as const, rotation: 90 as const },
  { pos: { x: 2, z: 4 }, kind: 'straight' as const, rotation: 0 as const },
  { pos: { x: 2, z: 5 }, kind: 'corner' as const, rotation: 0 as const },
  { pos: { x: 3, z: 5 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 4, z: 5 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 5, z: 5 }, kind: 'straight' as const, rotation: 90 as const },
];

const W3S3_INTENDED = [
  { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 3, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 4, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 5, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
  { pos: { x: 5, z: 2 }, kind: 'straight' as const, rotation: 0 as const },
  { pos: { x: 5, z: 3 }, kind: 'corner' as const, rotation: 270 as const },
  { pos: { x: 4, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
  { pos: { x: 3, z: 3 }, kind: 'straight' as const, rotation: 90 as const },
];

const W3S4_INTENDED = [
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

// ============================================================================
// w3-s1「フランスの まち 1」(🦴3 / ダミー2)
// ============================================================================
describe('w3-s1「フランスの まち 1」', () => {
  it('(a) スロット数が 8(正解6+ダミー2)', () => {
    expect(w3s1.slots.length).toBe(8);
  });

  it('(b) 難度が 3', () => {
    expect(w3s1.difficulty).toBe(3);
  });

  it('メタ情報が要件どおり', () => {
    expect(w3s1.id).toBe('w3-s1');
    expect(w3s1.world).toBe('w3');
    expect(w3s1.encounterDogId).toBe('poodle');
    expect(w3s1.treats).toBeUndefined();
  });

  it('(d) 意図解(L字・ダミー2未使用)で解ける', () => {
    expectIntendedSolutionSolves(w3s1, W3S1_INTENDED);
  });

  it('(e) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w3s1)).toBe(true);
  });

  it('(f) 意図解より短い別解がない', () => {
    expectNoShorterSolution(w3s1, W3S1_INTENDED.length);
  });
});

// ============================================================================
// w3-s2「フランスの まち 2」(🦴3 / T字なし + ダミー2)
// ============================================================================
describe('w3-s2「フランスの まち 2」', () => {
  it('(a) スロット数が 14(正解12+ダミー2)', () => {
    expect(w3s2.slots.length).toBe(14);
  });

  it('(b) 難度が 3', () => {
    expect(w3s2.difficulty).toBe(3);
  });

  it('メタ情報と palette(T字なし)が要件どおり', () => {
    expect(w3s2.id).toBe('w3-s2');
    expect(w3s2.world).toBe('w3');
    expect(w3s2.encounterDogId).toBe('papillon');
    expect(w3s2.palette).toEqual(['straight', 'corner']);
    expect(w3s2.palette?.includes('tee')).toBe(false);
  });

  it('(d) 意図解(S字・tee 不使用)で解ける', () => {
    expectIntendedSolutionSolves(w3s2, W3S2_INTENDED);
  });

  it('palette 外(tee)を使わないと成立する解がある(ソルバが palette を尊重)', () => {
    expect(isSolvable(w3s2)).toBe(true);
    const grid = new Grid(w3s2);
    expect(grid.place({ x: 2, z: 1 }, 'tee')).toBe(false);
  });

  it('(f) 意図解より短い別解がない', () => {
    expectNoShorterSolution(w3s2, W3S2_INTENDED.length);
  });

  it('旧近道( x=3 縦貫通 )はスロット欠損で成立しない', () => {
    const grid = new Grid(w3s2);
    // (3,2)(3,4) は再設計で削除済み
    expect(grid.isSlot({ x: 3, z: 2 })).toBe(false);
    expect(grid.isSlot({ x: 3, z: 4 })).toBe(false);
    const placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }> = [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 1 }, kind: 'corner', rotation: 180 },
      { pos: { x: 3, z: 5 }, kind: 'corner', rotation: 0 },
      { pos: { x: 4, z: 5 }, kind: 'straight', rotation: 90 },
      { pos: { x: 5, z: 5 }, kind: 'straight', rotation: 90 },
    ];
    for (const p of placements) {
      expect(grid.place(p.pos, p.kind, p.rotation)).toBe(true);
    }
    expect(findPath(grid).complete).toBe(false);
  });
});

// ============================================================================
// w3-s3「スイスの まち 1」(🦴4 / おやつ2 + ダミー3)
// ============================================================================
describe('w3-s3「スイスの まち 1」', () => {
  it('(a) スロット数が 11(正解8+ダミー3)', () => {
    expect(w3s3.slots.length).toBe(11);
  });

  it('(b) 難度が 4', () => {
    expect(w3s3.difficulty).toBe(4);
  });

  it('メタ情報が要件どおり', () => {
    expect(w3s3.id).toBe('w3-s3');
    expect(w3s3.world).toBe('w3');
    expect(w3s3.encounterDogId).toBe('saintBernard');
    expect(w3s3.treats).toEqual([
      { x: 3, z: 1 },
      { x: 4, z: 3 },
    ]);
  });

  it('(d) 意図解(U字・おやつ2)で解ける', () => {
    expectIntendedSolutionSolves(w3s3, W3S3_INTENDED);
  });

  it('(e) 総当たりソルバでもおやつ全部通過の解が存在する', () => {
    expect(isSolvable(w3s3)).toBe(true);
  });

  it('(f) 意図解より短い別解がない', () => {
    expectNoShorterSolution(w3s3, W3S3_INTENDED.length);
  });
});

// ============================================================================
// w3-s4「スイスの まち 2」(🦴4 / 9×9・最長ルート + ダミー4)
// ============================================================================
describe('w3-s4「スイスの まち 2」', () => {
  it('(a) 9×9 でスロット数が 18(正解14+ダミー4)', () => {
    expect(w3s4.size).toEqual({ w: 9, h: 9 });
    expect(w3s4.slots.length).toBe(18);
  });

  it('(b) 難度が 4', () => {
    expect(w3s4.difficulty).toBe(4);
  });

  it('メタ情報が要件どおり', () => {
    expect(w3s4.id).toBe('w3-s4');
    expect(w3s4.world).toBe('w3');
    expect(w3s4.encounterDogId).toBe('bernese');
  });

  it('(d) 意図解(外周寄りの最長ルート)で解ける', () => {
    expectIntendedSolutionSolves(w3s4, W3S4_INTENDED);
  });

  it('(e) 総当たりソルバでも解が存在する', () => {
    expect(isStageSolvable(w3s4)).toBe(true);
  });

  it('旧近道 (3,4)→(3,5)→(3,6) はスロット欠損で成立しない', () => {
    const grid = new Grid(w3s4);
    expect(grid.isSlot({ x: 3, z: 5 })).toBe(false);
    expect(grid.isSlot({ x: 4, z: 5 })).toBe(false);
    const placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }> = [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 },
      { pos: { x: 5, z: 2 }, kind: 'straight', rotation: 0 },
      { pos: { x: 5, z: 3 }, kind: 'straight', rotation: 0 },
      { pos: { x: 5, z: 4 }, kind: 'corner', rotation: 270 },
      { pos: { x: 4, z: 4 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 4 }, kind: 'corner', rotation: 90 },
      { pos: { x: 3, z: 6 }, kind: 'corner', rotation: 0 },
      { pos: { x: 4, z: 6 }, kind: 'straight', rotation: 90 },
    ];
    for (const p of placements) {
      expect(grid.place(p.pos, p.kind, p.rotation)).toBe(true);
    }
    expect(findPath(grid).complete).toBe(false);
  });
});
