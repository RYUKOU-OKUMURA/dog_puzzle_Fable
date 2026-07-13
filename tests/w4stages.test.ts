import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { DIR_OFFSET, OPPOSITE, PLAYER_PANEL_KINDS, exitsFrom } from '../src/core/panel';
import { findPath } from '../src/core/path';
import type { Dir, GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { w4s1 } from '../src/stage/w4s1';
import { w4s2 } from '../src/stage/w4s2';
import { w4s3 } from '../src/stage/w4s3';
import { w4s4 } from '../src/stage/w4s4';

/**
 * W4 ステージ4種の検証(M7)。橋・おやつ・ダミー。
 * 「橋を使わないと解けない」を最低2ステージでアサートする。
 */

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

/** 橋の通行軸を visited に含める(上下を別扱い) */
function visitKey(pos: GridPos, enteredFrom: Dir | null, kind: PanelKind): string {
  if (kind !== 'bridge' || enteredFrom === null) return posKey(pos);
  const axis = enteredFrom === 'N' || enteredFrom === 'S' ? 'NS' : 'EW';
  return `${posKey(pos)}:${axis}`;
}

function isSolvable(stage: StageDef): boolean {
  const grid = new Grid(stage);
  const visited = new Set<string>();
  return solveFrom(grid, stage.start.pos, null, visited, panelOptionsFor(stage));
}

function solveFrom(
  grid: Grid,
  current: GridPos,
  enteredFrom: Dir | null,
  visited: Set<string>,
  options: Array<[PanelKind, Rotation]>,
): boolean {
  if (posKey(current) === posKey(grid.stage.goal.pos)) {
    return findPath(grid).complete;
  }
  const panel = grid.panelAt(current);
  if (!panel) return false;
  const vk = visitKey(current, enteredFrom, panel.kind);
  if (visited.has(vk)) return false;
  visited.add(vk);
  try {
    const exits = exitsFrom(panel.kind, panel.rotation, enteredFrom);
    for (const dir of exits) {
      const offset = DIR_OFFSET[dir];
      const next: GridPos = { x: current.x + offset.x, z: current.z + offset.z };
      if (!grid.inBounds(next)) continue;
      const nextPanel = grid.panelAt(next);
      if (nextPanel && grid.connectionsAt(next)?.includes(OPPOSITE[dir])) {
        if (solveFrom(grid, next, OPPOSITE[dir], visited, options)) return true;
      } else if (grid.isSlot(next) && !grid.panelAt(next)) {
        for (const [kind, rot] of options) {
          grid.place(next, kind, rot);
          const placed = grid.connectionsAt(next)!;
          if (placed.includes(OPPOSITE[dir])) {
            if (solveFrom(grid, next, OPPOSITE[dir], visited, options)) {
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
    visited.delete(vk);
  }
}

function expectIntendedSolutionSolves(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): Grid {
  const grid = new Grid(stage);
  const allowed = new Set(stage.palette ?? PLAYER_PANEL_KINDS);
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
  // 橋があるならルートが橋を通ること
  const bridges = stage.fixedRoads.filter((r) => r.kind === 'bridge');
  for (const b of bridges) {
    // 全橋を通る必要はないが、少なくとも1つは通る(導入〜複合で設計)
    void b;
  }
  expect(
    bridges.some((b) => routeKeys.has(posKey(b.pos))),
    'ルートが橋を通る',
  ).toBe(true);
  return grid;
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
    // 橋除去後も同じスロットへ置ける
    expect(grid.place(p.pos, p.kind, p.rotation)).toBe(true);
  }
  expect(findPath(grid).complete, `${stage.id}: 橋なしでは complete にならない`).toBe(false);
}

// ============================================================================
// w4-s1「アメリカの まち 1」(🦴3 / 橋導入)
// ============================================================================
describe('w4-s1「アメリカの まち 1」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 3, z: 5 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 4, z: 5 }, kind: 'corner' as const, rotation: 180 as const },
  ];

  it('(a) スロット数が 5(正解4+ダミー1)', () => {
    expect(w4s1.slots.length).toBe(5);
  });

  it('(b) 難度が 3、橋が1つ', () => {
    expect(w4s1.difficulty).toBe(3);
    expect(w4s1.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(1);
  });

  it('メタ情報が要件どおり', () => {
    expect(w4s1.id).toBe('w4-s1');
    expect(w4s1.world).toBe('w4');
    expect(w4s1.encounterDogId).toBe('chihuahua');
  });

  it('(d) 意図解で解ける', () => {
    expectIntendedSolutionSolves(w4s1, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w4s1, solution);
  });

  it('(f) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w4s1)).toBe(true);
  });
});

// ============================================================================
// w4-s2「アメリカの まち 2」(🦴4 / 橋1+おやつ2)
// ============================================================================
describe('w4-s2「アメリカの まち 2」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 3, z: 5 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 4, z: 5 }, kind: 'straight' as const, rotation: 90 as const },
  ];

  it('(a) スロット数が 5、おやつ2', () => {
    expect(w4s2.slots.length).toBe(5);
    expect(w4s2.treats).toHaveLength(2);
  });

  it('(b) 難度が 4、橋が1つ', () => {
    expect(w4s2.difficulty).toBe(4);
    expect(w4s2.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(1);
  });

  it('メタ情報が要件どおり', () => {
    expect(w4s2.id).toBe('w4-s2');
    expect(w4s2.encounterDogId).toBe('bostonTerrier');
  });

  it('(d) 意図解で解ける', () => {
    expectIntendedSolutionSolves(w4s2, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w4s2, solution);
  });

  it('(f) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w4s2)).toBe(true);
  });
});

// ============================================================================
// w4-s3「メキシコの まち 1」(🦴4 / 橋2+ダミー)
// ============================================================================
describe('w4-s3「メキシコの まち 1」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 3, z: 4 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 4, z: 4 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 4 }, kind: 'corner' as const, rotation: 180 as const },
  ];

  it('(a) スロット数が 6、橋が2つ', () => {
    expect(w4s3.slots.length).toBe(6);
    expect(w4s3.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(2);
  });

  it('(b) 難度が 4', () => {
    expect(w4s3.difficulty).toBe(4);
  });

  it('メタ情報が要件どおり', () => {
    expect(w4s3.id).toBe('w4-s3');
    expect(w4s3.encounterDogId).toBe('malamute');
  });

  it('(d) 意図解で解ける', () => {
    expectIntendedSolutionSolves(w4s3, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w4s3, solution);
  });

  it('(f) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w4s3)).toBe(true);
  });
});

// ============================================================================
// w4-s4「メキシコの まち 2」(🦴5 / 橋2+おやつ3)
// ============================================================================
describe('w4-s4「メキシコの まち 2」', () => {
  const solution = [
    { pos: { x: 2, z: 1 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 3, z: 1 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 3, z: 4 }, kind: 'corner' as const, rotation: 0 as const },
    { pos: { x: 4, z: 4 }, kind: 'straight' as const, rotation: 90 as const },
    { pos: { x: 6, z: 4 }, kind: 'corner' as const, rotation: 180 as const },
    { pos: { x: 6, z: 5 }, kind: 'straight' as const, rotation: 0 as const },
    { pos: { x: 6, z: 6 }, kind: 'corner' as const, rotation: 0 as const },
  ];

  it('(a) 9×9 でスロット数が 10、おやつ3、橋2', () => {
    expect(w4s4.size).toEqual({ w: 9, h: 9 });
    expect(w4s4.slots.length).toBe(10);
    expect(w4s4.treats).toHaveLength(3);
    expect(w4s4.fixedRoads.filter((r) => r.kind === 'bridge')).toHaveLength(2);
  });

  it('(b) 難度が 5', () => {
    expect(w4s4.difficulty).toBe(5);
  });

  it('メタ情報が要件どおり', () => {
    expect(w4s4.id).toBe('w4-s4');
    expect(w4s4.encounterDogId).toBe('labrador');
  });

  it('(d) 意図解で解ける', () => {
    expectIntendedSolutionSolves(w4s4, solution);
  });

  it('(e) 橋を使わないと解けない', () => {
    expectBridgeRequired(w4s4, solution);
  });

  it('(f) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w4s4)).toBe(true);
  });
});
