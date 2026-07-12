import { describe, expect, it } from 'vitest';
import type { StageDef } from '../src/core/types';
import type { WorldDef } from '../src/stage/catalog';
import {
  clearedCountInWorld,
  isStageUnlocked,
  isWorldCleared,
  isWorldUnlocked,
  locateStage,
  nextStageInWorld,
  prevWorld,
} from '../src/stage/progress';

// テスト用の最小カタログ。progress 関数は stages の id しか読まないので id だけ持つダミーで十分。
// w3 は未実装(空)ワールド。
function stage(id: string): StageDef {
  return { id } as unknown as StageDef;
}
function world(id: string, ids: string[]): WorldDef {
  return { id, nameHtml: id, emoji: '📍', sub: '', stages: ids.map(stage) };
}

const WORLDS: readonly WorldDef[] = [
  world('w1', ['w1-s1', 'w1-s2', 'w1-s3', 'w1-s4']),
  world('w2', ['w2-s1', 'w2-s2']),
  world('w3', []),
];

const C = (ids: string[]): ReadonlySet<string> => new Set(ids);

describe('isWorldCleared', () => {
  it('全ステージクリアでtrue', () => {
    expect(isWorldCleared(WORLDS[0]!, C(['w1-s1', 'w1-s2', 'w1-s3', 'w1-s4']))).toBe(true);
  });
  it('1つでも未クリアならfalse', () => {
    expect(isWorldCleared(WORLDS[0]!, C(['w1-s1', 'w1-s2', 'w1-s3']))).toBe(false);
  });
  it('空ワールド(未実装)はfalse(次ワールドを開けない)', () => {
    expect(isWorldCleared(WORLDS[2]!, C([]))).toBe(false);
  });
});

describe('clearedCountInWorld', () => {
  it('クリア済みの個数を返す', () => {
    expect(clearedCountInWorld(WORLDS[0]!, C(['w1-s1', 'w1-s3']))).toBe(2);
    expect(clearedCountInWorld(WORLDS[0]!, C([]))).toBe(0);
  });
});

describe('isWorldUnlocked', () => {
  it('w1(先頭)は常に解放', () => {
    expect(isWorldUnlocked(WORLDS, 'w1', C([]))).toBe(true);
  });
  it('w2 は w1 の全クリアで解放。それ以外はロック', () => {
    expect(isWorldUnlocked(WORLDS, 'w2', C([]))).toBe(false);
    expect(isWorldUnlocked(WORLDS, 'w2', C(['w1-s1']))).toBe(false);
    expect(isWorldUnlocked(WORLDS, 'w2', C(['w1-s1', 'w1-s2', 'w1-s3', 'w1-s4']))).toBe(true);
  });
  it('w3 は w2 の全クリアで解放(空だが解放自体は可能)', () => {
    expect(isWorldUnlocked(WORLDS, 'w3', C(['w2-s1', 'w2-s2', 'w1-s1', 'w1-s2', 'w1-s3', 'w1-s4']))).toBe(true);
    expect(isWorldUnlocked(WORLDS, 'w3', C(['w2-s1']))).toBe(false);
  });
  it('不明なworldIdはfalse', () => {
    expect(isWorldUnlocked(WORLDS, 'wX', C([]))).toBe(false);
  });
});

describe('isStageUnlocked', () => {
  const w1 = WORLDS[0]!;
  it('s1(ordinal 0)は常に解放', () => {
    expect(isStageUnlocked(w1, 0, C([]))).toBe(true);
  });
  it('s2以降は s1 クリアで解放', () => {
    expect(isStageUnlocked(w1, 1, C([]))).toBe(false);
    expect(isStageUnlocked(w1, 1, C(['w1-s1']))).toBe(true);
    expect(isStageUnlocked(w1, 3, C(['w1-s1']))).toBe(true);
  });
  it('範囲外はfalse', () => {
    expect(isStageUnlocked(w1, -1, C(['w1-s1']))).toBe(false);
    expect(isStageUnlocked(w1, 99, C(['w1-s1']))).toBe(false);
  });
});

describe('locateStage / prevWorld', () => {
  it('id → ワールドと順序', () => {
    expect(locateStage(WORLDS, 'w1-s3')).toEqual({
      world: WORLDS[0],
      stage: (WORLDS[0]!.stages[2] as StageDef),
      ordinal: 2,
    });
    expect(locateStage(WORLDS, 'w2-s1')!.world.id).toBe('w2');
    expect(locateStage(WORLDS, 'none')).toBeNull();
  });
  it('prevWorld: w1→null, w2→w1', () => {
    expect(prevWorld(WORLDS, 'w1')).toBeNull();
    expect(prevWorld(WORLDS, 'w2')?.id).toBe('w1');
  });
});

describe('nextStageInWorld', () => {
  it('同ワールドの次の順序を返す', () => {
    expect(nextStageInWorld(WORLDS, 'w1-s1')!.stage.id).toBe('w1-s2');
    expect(nextStageInWorld(WORLDS, 'w1-s3')!.stage.id).toBe('w1-s4');
  });
  it('ワールドの最後ならnull', () => {
    expect(nextStageInWorld(WORLDS, 'w1-s4')).toBeNull();
  });
  it('不明idはnull', () => {
    expect(nextStageInWorld(WORLDS, 'none')).toBeNull();
  });
});
