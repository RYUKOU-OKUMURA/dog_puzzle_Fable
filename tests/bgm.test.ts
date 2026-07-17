import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBgmMode, setBgmMode, stopBgm } from '../src/audio/bgm';
import { setSoundEnabled } from '../src/audio/sfx';

describe('bgm: モード切替とおと ON/OFF', () => {
  afterEach(() => {
    stopBgm();
    setSoundEnabled(true);
    vi.unstubAllGlobals();
  });

  it('初期モードは off', () => {
    expect(getBgmMode()).toBe('off');
  });

  it('おと OFF のとき setBgmMode(normal) しても off のまま(AudioContext を起こさない)', () => {
    const createSpy = vi.fn();
    vi.stubGlobal('AudioContext', createSpy);
    setSoundEnabled(false);
    setBgmMode('normal');
    expect(getBgmMode()).toBe('off');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('stopBgm で off になる', () => {
    setSoundEnabled(false);
    setBgmMode('walk');
    stopBgm();
    expect(getBgmMode()).toBe('off');
  });

  it('同じモードの再指定は音源が無ければ再試行できる(mode は維持)', () => {
    setSoundEnabled(false);
    // OFF だと mode は off に落ちる。ON に戻してから mode だけ確認
    setSoundEnabled(true);
    // AudioContext 無し環境では ready に失敗するが、mode 自体はセットされる
    // (実際の発音はブラウザ依存のためここでは mode の契約だけ見る)
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'suspended';
        destination = {};
        currentTime = 0;
        sampleRate = 44100;
        createDynamicsCompressor() {
          return { connect: () => this };
        }
        createGain() {
          return {
            gain: {
              value: 1,
              setValueAtTime: () => {},
              cancelScheduledValues: () => {},
              linearRampToValueAtTime: () => {},
              exponentialRampToValueAtTime: () => {},
            },
            connect: () => this,
          };
        }
        createDelay() {
          return { delayTime: { value: 0 }, connect: () => this };
        }
        createBiquadFilter() {
          return { type: '', frequency: { value: 0 }, connect: () => this };
        }
        createBuffer() {
          return { getChannelData: () => new Float32Array(1) };
        }
        resume() {
          return Promise.resolve();
        }
      },
    );
    setBgmMode('normal');
    expect(getBgmMode()).toBe('normal');
    setBgmMode('walk');
    expect(getBgmMode()).toBe('walk');
    stopBgm();
    expect(getBgmMode()).toBe('off');
  });
});
