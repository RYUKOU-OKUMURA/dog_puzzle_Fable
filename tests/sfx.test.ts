import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSoundEnabled, playFanfare, playPaku, playPon, setSoundEnabled } from '../src/audio/sfx';

describe('sfx: おと ON/OFF', () => {
  afterEach(() => {
    setSoundEnabled(true);
    vi.unstubAllGlobals();
  });

  it('初期値は ON', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it('setSoundEnabled でフラグが切り替わる', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('OFF のとき再生関数は AudioContext コンストラクタを呼ばない', () => {
    const createSpy = vi.fn();
    vi.stubGlobal('AudioContext', createSpy);
    setSoundEnabled(false);
    playPon();
    playPaku();
    playFanfare();
    expect(createSpy).not.toHaveBeenCalled();
  });
});
