import { describe, expect, it } from 'vitest';
import type { GridPos, StageDef } from '../src/core/types';
import {
  isAdjacentToPond,
  middleRouteCells,
  planWalkEvent,
  WALK_EVENT_CHANCE,
} from '../src/game/walkEvents';

const pondStage: StageDef = {
  id: 'test-pond',
  name: 'test',
  size: { w: 5, h: 5 },
  start: { pos: { x: 0, z: 0 }, rotation: 90 },
  goal: { pos: { x: 4, z: 4 }, rotation: 270 },
  fixedRoads: [],
  slots: [],
  scenery: [{ pos: { x: 2, z: 2 }, kind: 'pond' }],
  encounterDogId: 'shiba',
  bgmTrackId: 'japan-01',
};

const plainStage: StageDef = {
  ...pondStage,
  id: 'test-plain',
  scenery: [],
};

describe('middleRouteCells', () => {
  it('スタートとゴールを除く中間マスを返す', () => {
    const route: GridPos[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ];
    expect(middleRouteCells(route)).toEqual([{ x: 1, z: 0 }, { x: 2, z: 0 }]);
  });

  it('2マス以下のルートは空', () => {
    expect(middleRouteCells([{ x: 0, z: 0 }, { x: 1, z: 0 }])).toEqual([]);
  });
});

describe('isAdjacentToPond', () => {
  it('池の隣接マスで true', () => {
    expect(isAdjacentToPond({ x: 2, z: 1 }, pondStage)).toBe(true);
    expect(isAdjacentToPond({ x: 3, z: 2 }, pondStage)).toBe(true);
  });

  it('池から離れたマスや池添景なしでは false', () => {
    expect(isAdjacentToPond({ x: 0, z: 0 }, pondStage)).toBe(false);
    expect(isAdjacentToPond({ x: 2, z: 1 }, plainStage)).toBe(false);
  });
});

describe('planWalkEvent', () => {
  const route: GridPos[] = [
    { x: 0, z: 0 },
    { x: 1, z: 0 },
    { x: 2, z: 1 },
    { x: 3, z: 2 },
    { x: 4, z: 4 },
  ];

  it('抽選失敗時は null', () => {
    expect(planWalkEvent(route, pondStage, () => WALK_EVENT_CHANCE)).toBeNull();
  });

  it('池隣接セルがあるとき pondStop を優先', () => {
    const plan = planWalkEvent(route, pondStage, () => 0);
    expect(plan).toEqual({ kind: 'pondStop', cell: { x: 2, z: 1 } });
  });

  it('池がなければ butterfly か bird', () => {
    const butterfly = planWalkEvent(route, plainStage, () => 0.1);
    expect(butterfly?.kind).toBe('butterfly');

    const birdPlan = planWalkEvent(
      route,
      plainStage,
      (() => {
        let n = 0;
        return () => {
          n += 1;
          if (n === 1) return 0.1;
          return 0.9;
        };
      })(),
    );
    expect(birdPlan?.kind).toBe('bird');
  });

  it('中間マスがないルートは null', () => {
    expect(planWalkEvent([{ x: 0, z: 0 }, { x: 1, z: 0 }], plainStage, () => 0)).toBeNull();
  });
});
