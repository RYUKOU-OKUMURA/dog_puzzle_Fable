import { afterEach, describe, expect, it, vi } from 'vitest';

interface ParamEvent {
  kind: 'cancel' | 'exponential' | 'linear' | 'set';
  value?: number;
  time: number;
}

class FakeAudioParam {
  value = 0;
  readonly events: ParamEvent[] = [];

  cancelScheduledValues(time: number): void {
    this.events.push({ kind: 'cancel', time });
  }

  setValueAtTime(value: number, time: number): void {
    this.value = value;
    this.events.push({ kind: 'set', value, time });
  }

  exponentialRampToValueAtTime(value: number, time: number): void {
    this.value = value;
    this.events.push({ kind: 'exponential', value, time });
  }

  linearRampToValueAtTime(value: number, time: number): void {
    this.value = value;
    this.events.push({ kind: 'linear', value, time });
  }
}

class FakeAudioNode {
  readonly inputs: FakeAudioNode[] = [];
  readonly outputs: FakeAudioNode[] = [];
  disconnectCalls = 0;

  constructor(readonly context: FakeAudioContext) {}

  connect(destination: FakeAudioNode): FakeAudioNode {
    this.outputs.push(destination);
    destination.inputs.push(this);
    return destination;
  }

  disconnect(): void {
    this.disconnectCalls += 1;
    this.outputs.length = 0;
  }
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam();
}

class FakeDelayNode extends FakeAudioNode {
  readonly delayTime = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type = 'lowpass';
  readonly frequency = new FakeAudioParam();
}

class FakeScheduledSourceNode extends FakeAudioNode {
  readonly startTimes: number[] = [];
  readonly stopTimes: Array<number | undefined> = [];

  addEventListener(): void {}

  start(time?: number): void {
    this.startTimes.push(time ?? 0);
  }

  stop(time?: number): void {
    this.stopTimes.push(time);
  }
}

class FakeOscillatorNode extends FakeScheduledSourceNode {
  type = 'sine';
  readonly frequency = new FakeAudioParam();
}

class FakeBufferSourceNode extends FakeScheduledSourceNode {
  buffer: unknown = null;
}

class FakeAudioContext {
  state: 'running' | 'suspended' = 'suspended';
  readonly currentTime = 0;
  readonly sampleRate = 4;
  readonly destination = new FakeAudioNode(this);
  readonly delays: FakeDelayNode[] = [];
  readonly gains: FakeGainNode[] = [];
  readonly sources: FakeScheduledSourceNode[] = [];

  createDynamicsCompressor(): FakeAudioNode {
    return new FakeAudioNode(this);
  }

  createGain(): FakeGainNode {
    const node = new FakeGainNode(this);
    this.gains.push(node);
    return node;
  }

  createDelay(): FakeDelayNode {
    const node = new FakeDelayNode(this);
    this.delays.push(node);
    return node;
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    return new FakeBiquadFilterNode(this);
  }

  createBuffer(_channels: number, length: number): { getChannelData(): Float32Array } {
    return { getChannelData: () => new Float32Array(length) };
  }

  createOscillator(): FakeOscillatorNode {
    const source = new FakeOscillatorNode(this);
    this.sources.push(source);
    return source;
  }

  createBufferSource(): FakeBufferSourceNode {
    const source = new FakeBufferSourceNode(this);
    this.sources.push(source);
    return source;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }
}

function installAudioContext(): FakeAudioContext[] {
  const contexts: FakeAudioContext[] = [];
  class InstalledAudioContext extends FakeAudioContext {
    constructor() {
      super();
      contexts.push(this);
    }
  }
  vi.stubGlobal('window', { AudioContext: InstalledAudioContext });
  return contexts;
}

async function flushAudioStart(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

let loadedBgm: typeof import('../src/audio/bgm') | null = null;

describe('bgm: 実 AudioGraph の停止・切替', () => {
  afterEach(() => {
    loadedBgm?.stopBgm();
    vi.advanceTimersByTime(200);
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
    loadedBgm = null;
  });

  it('BGMの残響を専用busごとフェードして止め、共有の効果音ディレイは残す', async () => {
    vi.useFakeTimers();
    const contexts = installAudioContext();
    const audio = await import('../src/audio/context');
    const bgm = await import('../src/audio/bgm');
    loadedBgm = bgm;

    await expect(audio.unlockAudio()).resolves.toBe(true);
    bgm.setBgm({ trackId: bgm.DEFAULT_BGM_TRACK_ID, arrangement: 'normal' });
    await flushAudioStart();

    const context = contexts[0]!;
    const sharedDelay = context.delays[0]!;
    const bgmDelay = context.delays[1]!;
    expect(contexts).toHaveLength(1);
    expect(sharedDelay.inputs).toHaveLength(1);
    expect(bgmDelay.inputs.length).toBeGreaterThan(1);

    const bgmWet = bgmDelay.outputs.find((node) => node instanceof FakeGainNode);
    const bgmBus = bgmWet?.outputs[0];
    expect(bgmBus).toBeInstanceOf(FakeGainNode);

    bgm.stopBgm();
    expect((bgmBus as FakeGainNode).gain.events).toContainEqual({
      kind: 'linear',
      value: 0.0001,
      time: 0.08,
    });
    expect(bgmDelay.disconnectCalls).toBe(0);

    vi.advanceTimersByTime(101);
    expect(bgmDelay.disconnectCalls).toBe(1);
    expect(sharedDelay.disconnectCalls).toBe(0);
    expect(context.sources.some((source) => source.stopTimes.includes(undefined))).toBe(true);
  });

  it('通常曲からおさんぽ曲へ切り替えるとき、旧出力をフェードしてから作り直す', async () => {
    vi.useFakeTimers();
    const contexts = installAudioContext();
    const audio = await import('../src/audio/context');
    const bgm = await import('../src/audio/bgm');
    loadedBgm = bgm;

    await audio.unlockAudio();
    bgm.setBgm({ trackId: bgm.DEFAULT_BGM_TRACK_ID, arrangement: 'normal' });
    await flushAudioStart();
    const context = contexts[0]!;
    const oldBgmDelay = context.delays[1]!;

    bgm.setBgm({ trackId: bgm.DEFAULT_BGM_TRACK_ID, arrangement: 'walk' });
    expect(context.delays).toHaveLength(2);
    expect(bgm.getBgmSelection()?.arrangement).toBe('walk');

    vi.advanceTimersByTime(81);
    await flushAudioStart();
    expect(oldBgmDelay.disconnectCalls).toBe(1);
    expect(context.delays).toHaveLength(3);
    expect(context.delays[2]!.inputs.length).toBeGreaterThan(1);
    expect(context.delays[0]!.disconnectCalls).toBe(0);
  });
});
