import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { DIR_OFFSET, OPPOSITE } from '../src/core/panel';
import { findPath } from '../src/core/path';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { w2s1 } from '../src/stage/w2s1';
import { w2s2 } from '../src/stage/w2s2';
import { w2s3 } from '../src/stage/w2s3';
import { w2s4 } from '../src/stage/w2s4';

/**
 * W2 新ステージ4種の検証。おやつ収集(M5)対応。
 * 各ステージで (a) スロット数 (b) 難度 (c) おやつ数 (d) 意図解(全おやつ通過)で解ける
 * (e) 総当たりソルバでおやつ全部通過の解が存在する、を確認する。
 * ソルバはおやつ対応版(findPath.complete で到達判定)を使う。
 */

/** スロットに置ける全パネル選択肢(置かない = 空も含む)。corner/tee は全回転。 */
const PANEL_OPTIONS: Array<[PanelKind, Rotation]> = [
  ['straight', 0],
  ['straight', 90],
  ['corner', 0],
  ['corner', 90],
  ['corner', 180],
  ['corner', 270],
  ['tee', 0],
  ['tee', 90],
  ['tee', 180],
  ['tee', 270],
];

/**
 * おやつ対応ソルバ。スタートから隣接スロットにパネルを置きながらゴールへ到達できるか。
 * ゴール到達時に findPath(grid).complete(= 全おやつ通過ルートがある)で判定する。
 * 近道でおやつを取りこぼす配置は complete=false でバックトラックし、おやつを通る経路を探す。
 */
function isSolvable(stage: StageDef): boolean {
  const grid = new Grid(stage);
  const visited = new Set<string>();
  return solveFrom(grid, stage.start.pos, visited);
}

function solveFrom(grid: Grid, current: GridPos, visited: Set<string>): boolean {
  // ゴール到達 → 全おやつを通過しているかで判定
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
        if (solveFrom(grid, next, visited)) return true;
      } else if (grid.isSlot(next) && !grid.panelAt(next)) {
        for (const [kind, rot] of PANEL_OPTIONS) {
          grid.place(next, kind, rot);
          const placed = grid.connectionsAt(next)!;
          if (placed.includes(OPPOSITE[dir])) {
            if (solveFrom(grid, next, visited)) {
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

/** 意図解を検証: 渡された配置で findPath が complete になり、全おやつマスをルートが通る */
function expectIntendedSolutionSolves(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): void {
  const grid = new Grid(stage);
  for (const p of placements) {
    expect(grid.place(p.pos, p.kind, p.rotation), `${posKey(p.pos)} に配置できる`).toBe(true);
  }
  const result = findPath(grid);
  expect(result.complete, '意図解で 全おやつを通って ★→◎ がつながる').toBe(true);
  expect(result.route[0], 'ルートはスタートから').toEqual(stage.start.pos);
  expect(result.route[result.route.length - 1], 'ルートはゴールへ').toEqual(stage.goal.pos);
  const routeKeys = new Set(result.route.map(posKey));
  for (const t of stage.treats ?? []) {
    expect(routeKeys.has(posKey(t)), `おやつ(${posKey(t)}) をルートが通る`).toBe(true);
  }
}

/** おやつを取りこぼす配置が「おやつ残り(complete=false, goalReachable=true)」になることを確認 */
function expectTreatsRemaining(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): void {
  const grid = new Grid(stage);
  for (const p of placements) grid.place(p.pos, p.kind, p.rotation);
  const result = findPath(grid);
  expect(result.complete).toBe(false);
  expect(result.goalReachable).toBe(true);
}

// ============================================================================
// w2-s1「イギリスの まち 1」(🦴2 / おやつ1・空き6 / 導入)
// ============================================================================
describe('w2-s1「イギリスの まち 1」', () => {
  it('(a) スロット数が 6', () => {
    expect(w2s1.slots.length).toBe(6);
  });

  it('(b) 難度が 2', () => {
    expect(w2s1.difficulty).toBe(2);
  });

  it('メタ情報が要件どおり', () => {
    expect(w2s1.id).toBe('w2-s1');
    expect(w2s1.world).toBe('w2');
    expect(w2s1.encounterDogId).toBe('corgi');
    expect(w2s1.treats).toEqual([{ x: 4, z: 1 }]);
  });

  it('(d) 意図解(L字1本道・おやつ1)で解ける', () => {
    expectIntendedSolutionSolves(w2s1, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // おやつ
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ S,W
      { pos: { x: 5, z: 2 }, kind: 'straight', rotation: 0 }, // │
      { pos: { x: 5, z: 3 }, kind: 'straight', rotation: 0 }, // │
    ]);
  });

  it('(e) 総当たりソルバでもおやつ全部通過の解が存在する', () => {
    expect(isSolvable(w2s1)).toBe(true);
  });
});

// ============================================================================
// w2-s2「イギリスの まち 2」(🦴3 / おやつ2・空き8)
// ============================================================================
describe('w2-s2「イギリスの まち 2」', () => {
  it('(a) スロット数が 8', () => {
    expect(w2s2.slots.length).toBe(8);
  });

  it('(b) 難度が 3', () => {
    expect(w2s2.difficulty).toBe(3);
  });

  it('メタ情報が要件どおり', () => {
    expect(w2s2.id).toBe('w2-s2');
    expect(w2s2.world).toBe('w2');
    expect(w2s2.encounterDogId).toBe('beagle');
    expect(w2s2.treats).toEqual([
      { x: 3, z: 1 },
      { x: 4, z: 3 },
    ]);
  });

  it('(d) 意図解(U字遠回り・おやつ2)で解ける', () => {
    expectIntendedSolutionSolves(w2s2, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 }, // おやつ
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 }, // ┐
      { pos: { x: 5, z: 2 }, kind: 'straight', rotation: 0 }, // │
      { pos: { x: 5, z: 3 }, kind: 'corner', rotation: 270 }, // ┘ N,W
      { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 90 }, // ─ おやつ
    ]);
  });

  it('(e) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w2s2)).toBe(true);
  });
});

// ============================================================================
// w2-s3「イギリスの まち 3」(🦴3 / おやつ2 / 最短路では取れない)
// ============================================================================
describe('w2-s3「イギリスの まち 3」', () => {
  it('(a) スロット数が 8', () => {
    expect(w2s3.slots.length).toBe(8);
  });

  it('(b) 難度が 3', () => {
    expect(w2s3.difficulty).toBe(3);
  });

  it('メタ情報が要件どおり', () => {
    expect(w2s3.id).toBe('w2-s3');
    expect(w2s3.world).toBe('w2');
    expect(w2s3.encounterDogId).toBe('bulldog');
    expect(w2s3.treats).toEqual([
      { x: 3, z: 2 },
      { x: 4, z: 3 },
    ]);
  });

  it('最短路(1行目をまっすぐ)はおやつを取れない(おやつ残り)', () => {
    // ★(1,1)→(2,1)(3,1)(4,1)→◎(5,1) の近道。おやつ0個。
    expectTreatsRemaining(w2s3, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 },
    ]);
  });

  it('(d) 意図解(南へ降りて回る遠回りループ・おやつ2)で解ける', () => {
    expectIntendedSolutionSolves(w2s3, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 1 }, kind: 'tee', rotation: 180 }, // ┬ W,E,S
      { pos: { x: 3, z: 2 }, kind: 'straight', rotation: 0 }, // │ おやつ
      { pos: { x: 3, z: 3 }, kind: 'corner', rotation: 0 }, // └ N,E
      { pos: { x: 4, z: 3 }, kind: 'corner', rotation: 270 }, // ┘ N,W おやつ
      { pos: { x: 4, z: 2 }, kind: 'straight', rotation: 0 }, // │
      { pos: { x: 4, z: 1 }, kind: 'corner', rotation: 90 }, // ┌ E,S
    ]);
  });

  it('(e) 総当たりソルバでもおやつ全部通過の解が存在する', () => {
    expect(isSolvable(w2s3)).toBe(true);
  });
});

// ============================================================================
// w2-s4「イギリスの まち 4」(🦴4 / おやつ3・空き10)
// ============================================================================
describe('w2-s4「イギリスの まち 4」', () => {
  it('(a) スロット数が 10', () => {
    expect(w2s4.slots.length).toBe(10);
  });

  it('(b) 難度が 4', () => {
    expect(w2s4.difficulty).toBe(4);
  });

  it('メタ情報が要件どおり', () => {
    expect(w2s4.id).toBe('w2-s4');
    expect(w2s4.world).toBe('w2');
    expect(w2s4.encounterDogId).toBe('golden');
    expect(w2s4.treats).toEqual([
      { x: 4, z: 1 },
      { x: 5, z: 2 },
      { x: 4, z: 3 },
    ]);
  });

  it('(d) 意図解(U字経路・おやつ3)で解ける', () => {
    expectIntendedSolutionSolves(w2s4, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // おやつ
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 }, // ┐
      { pos: { x: 5, z: 2 }, kind: 'straight', rotation: 0 }, // │ おやつ
      { pos: { x: 5, z: 3 }, kind: 'corner', rotation: 270 }, // ┘
      { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 90 }, // ─ おやつ
      { pos: { x: 3, z: 3 }, kind: 'straight', rotation: 90 }, // ─ → ◎(2,3)
    ]);
  });

  it('(e) 総当たりソルバでもおやつ全部通過の解が存在する', () => {
    expect(isSolvable(w2s4)).toBe(true);
  });
});
