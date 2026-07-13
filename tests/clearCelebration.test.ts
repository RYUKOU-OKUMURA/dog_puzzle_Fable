import { describe, expect, it } from 'vitest';
import { firstClearCelebrationFlags } from '../src/game/clearCelebration';

describe('firstClearCelebrationFlags', () => {
  it('図鑑が今回初めてコンプリートしたときだけ zukanComplete', () => {
    expect(
      firstClearCelebrationFlags({
        beforeCollected: 20,
        afterCollected: 21,
        totalDogs: 21,
        stageId: 'w1-s1',
        wasStageCleared: false,
      }),
    ).toEqual({ zukanComplete: true, worldFinale: false });
  });

  it('すでにコンプリート済みなら再クリアしても zukanComplete は false', () => {
    expect(
      firstClearCelebrationFlags({
        beforeCollected: 21,
        afterCollected: 21,
        totalDogs: 21,
        stageId: 'w1-s1',
        wasStageCleared: true,
      }),
    ).toEqual({ zukanComplete: false, worldFinale: false });
  });

  it('w5-s4 を初めてクリアしたときだけ worldFinale', () => {
    expect(
      firstClearCelebrationFlags({
        beforeCollected: 20,
        afterCollected: 20,
        totalDogs: 21,
        stageId: 'w5-s4',
        wasStageCleared: false,
      }),
    ).toEqual({ zukanComplete: false, worldFinale: true });
  });

  it('w5-s4 再クリアでは worldFinale は false', () => {
    expect(
      firstClearCelebrationFlags({
        beforeCollected: 21,
        afterCollected: 21,
        totalDogs: 21,
        stageId: 'w5-s4',
        wasStageCleared: true,
      }),
    ).toEqual({ zukanComplete: false, worldFinale: false });
  });

  it('w5-s4 初クリアと図鑑コンプリートが同時なら両方 true', () => {
    expect(
      firstClearCelebrationFlags({
        beforeCollected: 20,
        afterCollected: 21,
        totalDogs: 21,
        stageId: 'w5-s4',
        wasStageCleared: false,
      }),
    ).toEqual({ zukanComplete: true, worldFinale: true });
  });
});
