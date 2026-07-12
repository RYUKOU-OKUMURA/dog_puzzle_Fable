import { describe, expect, it } from 'vitest';
import { Grid } from '../src/core/grid';
import { DIR_OFFSET, OPPOSITE } from '../src/core/panel';
import { findPath } from '../src/core/path';
import type { GridPos, PanelKind, Rotation, StageDef } from '../src/core/types';
import { posKey } from '../src/core/types';
import { w1s2 } from '../src/stage/w1s2';
import { w1s3 } from '../src/stage/w1s3';
import { w1s4 } from '../src/stage/w1s4';

/**
 * W1 新ステージ3種の検証。
 * 各ステージで (a) スロット数 (b) 難度 (c) 意図解での解可能性 (d) 総当たりソルバ
 * を確認する。(d) は意図解に依存せず「いずれかの配置で complete になる」ことを保証する。
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
 * 経路拡張 DFS によるソルバ。スタートから始め、隣接スロットにパネルを置きながら
 * ゴールへ到達できるかを探索する。置いたパネルはバックトラック時に取り除くので
 * グリッドは探索後も初期状態に戻る(固定道と端点のみ)。
 * 「接続が相手を向している」延長だけを再帰するので分枝が小さく、9スロットでも一瞬。
 */
function isSolvable(stage: StageDef): boolean {
  const grid = new Grid(stage);
  const visited = new Set<string>();
  return solveFrom(grid, stage.start.pos, visited);
}

function solveFrom(grid: Grid, current: GridPos, visited: Set<string>): boolean {
  if (posKey(current) === posKey(grid.stage.goal.pos)) return true;
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
        // 固定道・既置パネルで既につながっている → そのまま進む
        if (solveFrom(grid, next, visited)) return true;
      } else if (grid.isSlot(next) && !grid.panelAt(next)) {
        // 空きスロット → 相手を向くパネルだけを試す
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

/** 意図解を検証: 渡された配置で findPath が complete になり、端点が正しい。 */
function expectIntendedSolutionSolves(
  stage: StageDef,
  placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }>,
): void {
  const grid = new Grid(stage);
  for (const p of placements) {
    expect(grid.place(p.pos, p.kind, p.rotation), `${posKey(p.pos)} に配置できる`).toBe(true);
  }
  const result = findPath(grid);
  expect(result.complete, '意図解で ★→◎ がつながる').toBe(true);
  expect(result.route[0], 'ルートはスタートから').toEqual(stage.start.pos);
  expect(result.route[result.route.length - 1], 'ルートはゴールへ').toEqual(stage.goal.pos);
}

// ============================================================================
// w1-s2「にほんの まち 2」(🦴2 / 曲がり角めいろ / スロット5〜6)
// ============================================================================
describe('w1-s2「にほんの まち 2」', () => {
  it('(a) スロット数が 5〜6', () => {
    expect(w1s2.slots.length).toBeGreaterThanOrEqual(5);
    expect(w1s2.slots.length).toBeLessThanOrEqual(6);
  });

  it('(b) 難度が 2', () => {
    expect(w1s2.difficulty).toBe(2);
  });

  it('メタ情報が要件どおり', () => {
    expect(w1s2.id).toBe('w1-s2');
    expect(w1s2.world).toBe('w1');
    expect(w1s2.encounterDogId).toBe('chin');
    expect(w1s2.size).toEqual({ w: 8, h: 8 });
    expect(w1s2.palette).toEqual(['straight', 'corner', 'tee']);
    expect(w1s2.treats).toEqual([]);
  });

  it('(c) 意図解(階段状に5回曲がる)で解ける', () => {
    // ★(1,1) → 固定┐(2,1) → 以下の5スロットを corner で階段状に
    expectIntendedSolutionSolves(w1s2, [
      { pos: { x: 2, z: 2 }, kind: 'corner', rotation: 0 }, // └ N,E
      { pos: { x: 3, z: 2 }, kind: 'corner', rotation: 180 }, // ┐ S,W
      { pos: { x: 3, z: 3 }, kind: 'corner', rotation: 0 }, // └ N,E
      { pos: { x: 4, z: 3 }, kind: 'corner', rotation: 180 }, // ┐ S,W
      { pos: { x: 4, z: 4 }, kind: 'corner', rotation: 0 }, // └ N,E → 固定─(5,4) → ◎(6,4)
    ]);
  });

  it('(d) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w1s2)).toBe(true);
  });
});

// ============================================================================
// w1-s3「にほんの まち 3」(🦴2 / T字路 + 行き止まりデコイ / スロット7)
// ============================================================================
describe('w1-s3「にほんの まち 3」', () => {
  it('(a) スロット数が 7', () => {
    expect(w1s3.slots.length).toBe(7);
  });

  it('(b) 難度が 2', () => {
    expect(w1s3.difficulty).toBe(2);
  });

  it('メタ情報が要件どおり', () => {
    expect(w1s3.id).toBe('w1-s3');
    expect(w1s3.world).toBe('w1');
    expect(w1s3.encounterDogId).toBe('spitz');
    expect(w1s3.size).toEqual({ w: 8, h: 8 });
    expect(w1s3.palette).toEqual(['straight', 'corner', 'tee']);
    expect(w1s3.treats).toEqual([]);
  });

  it('T字路の釣り分岐デコイ(3,2)(3,3)がスロットとして存在', () => {
    const slotKeys = new Set(w1s3.slots.map(posKey));
    expect(slotKeys.has('3,2')).toBe(true);
    expect(slotKeys.has('3,3')).toBe(true);
  });

  it('(c) 意図解(T字路で東へ進み、南枝は行き止まりデコイ)で解ける', () => {
    // ★(1,1) → 固定─(2,1) → (3,1)で┬に分岐(南枝はデコイのまま) → 東へ
    expectIntendedSolutionSolves(w1s3, [
      { pos: { x: 3, z: 1 }, kind: 'tee', rotation: 180 }, // ┬ W,E,S(Sは空デコイ)
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ S,W
      { pos: { x: 5, z: 2 }, kind: 'corner', rotation: 0 }, // └ N,E
      { pos: { x: 6, z: 2 }, kind: 'straight', rotation: 90 }, // ─ → ◎(7,2)
    ]);
  });

  it('(d) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w1s3)).toBe(true);
  });
});

// ============================================================================
// w1-s4「にほんの まち 4」(🦴3 / ぐるっと遠回り / スロット8〜9)
// ============================================================================
describe('w1-s4「にほんの まち 4」', () => {
  it('(a) スロット数が 8〜9', () => {
    expect(w1s4.slots.length).toBeGreaterThanOrEqual(8);
    expect(w1s4.slots.length).toBeLessThanOrEqual(9);
  });

  it('(b) 難度が 3', () => {
    expect(w1s4.difficulty).toBe(3);
  });

  it('メタ情報が要件どおり', () => {
    expect(w1s4.id).toBe('w1-s4');
    expect(w1s4.world).toBe('w1');
    expect(w1s4.encounterDogId).toBe('kai');
    expect(w1s4.size).toEqual({ w: 8, h: 8 });
    expect(w1s4.palette).toEqual(['straight', 'corner', 'tee']);
    expect(w1s4.treats).toEqual([]);
  });

  it('近道を塞ぐ壁((1,2)とその周辺)がスロットでない', () => {
    // ★(1,1)と◎(1,3)の間の縦方向近道と、その東側の横抜け近道が塞がれていること
    const slotKeys = new Set(w1s4.slots.map(posKey));
    for (const key of ['1,2', '2,2', '3,2', '4,2']) {
      expect(slotKeys.has(key), `${key} は近道防止の壁(スロットでない)`).toBe(false);
    }
  });

  it('(c) 意図解(U字の遠回り: 東→南→西)で解ける', () => {
    expectIntendedSolutionSolves(w1s4, [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 }, // ┐ S,W
      { pos: { x: 5, z: 2 }, kind: 'straight', rotation: 0 }, // │
      { pos: { x: 5, z: 3 }, kind: 'corner', rotation: 270 }, // ┘ N,W
      { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 3, z: 3 }, kind: 'straight', rotation: 90 }, // ─
      { pos: { x: 2, z: 3 }, kind: 'straight', rotation: 90 }, // ─ → ◎(1,3)
    ]);
  });

  it('(d) 総当たりソルバでも解が存在する', () => {
    expect(isSolvable(w1s4)).toBe(true);
  });

  it('意図解の経路は「ぐるっと遠回り」(直接距離より十分長い)', () => {
    const grid = new Grid(w1s4);
    const placements: Array<{ pos: GridPos; kind: PanelKind; rotation: Rotation }> = [
      { pos: { x: 2, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 4, z: 1 }, kind: 'straight', rotation: 90 },
      { pos: { x: 5, z: 1 }, kind: 'corner', rotation: 180 },
      { pos: { x: 5, z: 2 }, kind: 'straight', rotation: 0 },
      { pos: { x: 5, z: 3 }, kind: 'corner', rotation: 270 },
      { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 90 },
      { pos: { x: 3, z: 3 }, kind: 'straight', rotation: 90 },
      { pos: { x: 2, z: 3 }, kind: 'straight', rotation: 90 },
    ];
    for (const p of placements) grid.place(p.pos, p.kind, p.rotation);
    const { route } = findPath(grid);
    // スタート(1,1)→ゴール(1,3)の直接距離は2だが、U字経路は9セル(8歩)以上
    expect(route.length).toBeGreaterThanOrEqual(10);
  });
});
