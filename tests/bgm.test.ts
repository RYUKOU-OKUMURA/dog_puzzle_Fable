import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BGM_TRACK_ID,
  getBgmMode,
  getBgmSelection,
  setBgm,
  stopBgm,
} from '../src/audio/bgm';
import { setSoundEnabled } from '../src/audio/sfx';

describe('bgm: 選曲・アレンジ・おと ON/OFF', () => {
  afterEach(() => {
    stopBgm();
    setSoundEnabled(true);
    vi.unstubAllGlobals();
  });

  it('初期状態は停止', () => {
    expect(getBgmSelection()).toBeNull();
    expect(getBgmMode()).toBe('off');
  });

  it('曲IDとアレンジを1つの選曲として保持する', () => {
    setBgm({ trackId: DEFAULT_BGM_TRACK_ID, arrangement: 'normal' });
    expect(getBgmSelection()).toEqual({
      trackId: DEFAULT_BGM_TRACK_ID,
      arrangement: 'normal',
    });

    setBgm({ trackId: DEFAULT_BGM_TRACK_ID, arrangement: 'walk' });
    expect(getBgmSelection()).toEqual({
      trackId: DEFAULT_BGM_TRACK_ID,
      arrangement: 'walk',
    });
  });

  it('未登録の曲IDは無音にせず既定曲へ戻す', () => {
    setBgm({ trackId: 'not-registered', arrangement: 'normal' });
    expect(getBgmSelection()?.trackId).toBe(DEFAULT_BGM_TRACK_ID);
  });

  it('おと OFF では選曲しても停止のまま(AudioContext を起こさない)', () => {
    const createSpy = vi.fn();
    vi.stubGlobal('AudioContext', createSpy);
    setSoundEnabled(false);
    setBgm({ trackId: DEFAULT_BGM_TRACK_ID, arrangement: 'normal' });
    expect(getBgmSelection()).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('stopBgm で選曲を破棄する', () => {
    setBgm({ trackId: DEFAULT_BGM_TRACK_ID, arrangement: 'walk' });
    stopBgm();
    expect(getBgmSelection()).toBeNull();
  });
});
