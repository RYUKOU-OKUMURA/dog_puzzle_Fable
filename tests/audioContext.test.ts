import { afterEach, describe, expect, it, vi } from 'vitest';

type ResumeStep = 'reject' | 'suspended' | 'running';
type ConstructStep = 'throw' | 'ready';

function installAudioContext(steps: ResumeStep[], constructSteps: ConstructStep[] = ['ready']) {
  let resumeCalls = 0;
  let constructCalls = 0;

  class FakeAudioContext {
    state: AudioContextState = 'suspended';
    readonly destination = {};
    readonly sampleRate = 4;

    constructor() {
      const step = constructSteps[Math.min(constructCalls, constructSteps.length - 1)] ?? 'ready';
      constructCalls += 1;
      if (step === 'throw') throw new Error('audio initialization failed');
    }

    createDynamicsCompressor() {
      return { connect: (destination: unknown) => destination };
    }

    createGain() {
      return {
        gain: { value: 0 },
        connect: (destination: unknown) => destination,
      };
    }

    createDelay() {
      return {
        delayTime: { value: 0 },
        connect: (destination: unknown) => destination,
      };
    }

    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { value: 0 },
        connect: (destination: unknown) => destination,
      };
    }

    createBuffer(_channels: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    }

    async resume(): Promise<void> {
      const step = steps[Math.min(resumeCalls, steps.length - 1)] ?? 'suspended';
      resumeCalls += 1;
      if (step === 'reject') throw new Error('gesture required');
      this.state = step;
    }
  }

  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  return { constructCalls: () => constructCalls, resumeCalls: () => resumeCalls };
}

async function freshContextModule() {
  vi.resetModules();
  return import('../src/audio/context');
}

describe('audio context: ユーザージェスチャでの解除', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('解除前の再生準備では AudioContext を生成しない', async () => {
    const audio = installAudioContext(['running']);
    const { readyAudioGraph, getAudioStatus } = await freshContextModule();

    await expect(readyAudioGraph()).resolves.toBeNull();
    expect(audio.resumeCalls()).toBe(0);
    expect(getAudioStatus()).toBe('locked');
  });

  it('resume が拒否されても、次のジェスチャで再試行できる', async () => {
    const audio = installAudioContext(['reject', 'running']);
    const { unlockAudio, isAudioRunning } = await freshContextModule();

    await expect(unlockAudio()).resolves.toBe(false);
    expect(isAudioRunning()).toBe(false);
    await expect(unlockAudio()).resolves.toBe(true);
    expect(isAudioRunning()).toBe(true);
    expect(audio.resumeCalls()).toBe(2);
  });

  it('AudioContext の初期化が失敗しても、次のジェスチャで再試行できる', async () => {
    const audio = installAudioContext(['running'], ['throw', 'ready']);
    const { unlockAudio, getAudioStatus } = await freshContextModule();

    await expect(unlockAudio()).resolves.toBe(false);
    expect(getAudioStatus()).toBe('locked');
    await expect(unlockAudio()).resolves.toBe(true);
    expect(audio.constructCalls()).toBe(2);
    expect(audio.resumeCalls()).toBe(1);
  });

  it('resume 成功扱いでも suspended のままなら解除済みにしない', async () => {
    const audio = installAudioContext(['suspended', 'running']);
    const { unlockAudio, readyAudioGraph } = await freshContextModule();

    await expect(unlockAudio()).resolves.toBe(false);
    await expect(readyAudioGraph()).resolves.toBeNull();
    await expect(unlockAudio()).resolves.toBe(true);
    await expect(readyAudioGraph()).resolves.not.toBeNull();
    expect(audio.resumeCalls()).toBe(2);
  });
});
