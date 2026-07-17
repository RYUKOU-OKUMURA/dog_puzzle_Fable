import { describe, expect, it } from 'vitest';
import { DEFAULT_BGM_TRACK_ID } from '../src/audio/bgm';
import { selectBgmForGame, type BgmPhase } from '../src/game/bgmPolicy';

describe('selectBgmForGame', () => {
  it.each<BgmPhase>(['select', 'title', 'worldSelect', 'stageSelect'])(
    '%s はメニュー既定曲の通常アレンジ',
    (phase) => {
      expect(
        selectBgmForGame({ phase, stageTrackId: 'stage-song', successfulWalk: false }),
      ).toEqual({ trackId: DEFAULT_BGM_TRACK_ID, arrangement: 'normal' });
    },
  );

  it('パズルはステージ指定曲の通常アレンジ', () => {
    expect(
      selectBgmForGame({ phase: 'puzzle', stageTrackId: 'stage-song', successfulWalk: false }),
    ).toEqual({ trackId: 'stage-song', arrangement: 'normal' });
  });

  it('成功おさんぽだけステージ指定曲のwalkアレンジ', () => {
    expect(
      selectBgmForGame({ phase: 'walk', stageTrackId: 'stage-song', successfulWalk: true }),
    ).toEqual({ trackId: 'stage-song', arrangement: 'walk' });
    expect(
      selectBgmForGame({ phase: 'walk', stageTrackId: 'stage-song', successfulWalk: false }),
    ).toEqual({ trackId: 'stage-song', arrangement: 'normal' });
  });

  it.each<BgmPhase>(['encounter', 'clear'])('%s はBGM停止', (phase) => {
    expect(
      selectBgmForGame({ phase, stageTrackId: 'stage-song', successfulWalk: true }),
    ).toBeNull();
  });
});
