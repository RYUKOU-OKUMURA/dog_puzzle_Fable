/**
 * BGMプレイヤー(Web Audio API 合成のみ)。
 * 曲固有のデータは tracks/ に置き、ここでは選曲・ループ・停止だけを扱う。
 */
import { isSoundEnabled, readyAudioGraph, type AudioGraph } from './context';
import {
  BGM_TRACK_IDS,
  DEFAULT_BGM_TRACK_ID,
  isBgmTrackId,
  resolveBgmTrack,
  type BgmTrackId,
} from './tracks';
import type { BgmArrangement, BgmTrack } from './tracks/types';

export { BGM_TRACK_IDS, DEFAULT_BGM_TRACK_ID, isBgmTrackId };
export type { BgmArrangement, BgmTrackId };

export interface BgmSelection {
  trackId: string;
  arrangement: BgmArrangement;
}

let selection: BgmSelection | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
/** 終了した音源を残さず、停止対象だけを追跡する。 */
const activeSources = new Set<AudioScheduledSourceNode>();
interface BgmOutput {
  bus: GainNode;
  delay: DelayNode;
  feedback: GainNode;
  lowpass: BiquadFilterNode;
  wet: GainNode;
}

interface DetachedPlayback {
  output: BgmOutput | null;
  sources: AudioScheduledSourceNode[];
}

let bgmOutput: BgmOutput | null = null;
let generation = 0;

const STOP_FADE_SECONDS = 0.08;
const SWITCH_FADE_SECONDS = 0.06;

function trackSource(source: AudioScheduledSourceNode): void {
  activeSources.add(source);
  source.addEventListener('ended', () => activeSources.delete(source), { once: true });
}

function clearLoopTimer(): void {
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}

function takeActiveSources(): AudioScheduledSourceNode[] {
  const sources = [...activeSources];
  activeSources.clear();
  return sources;
}

function stopSources(sources: readonly AudioScheduledSourceNode[]): void {
  for (const source of sources) {
    try {
      source.stop();
    } catch {
      /* 停止済みは無視 */
    }
  }
}

/** BGMの残響も同じbusへ戻し、停止時にdry/wetをまとめて絞れるようにする。 */
function createBgmOutput(graph: AudioGraph): BgmOutput {
  const bus = graph.audio.createGain();
  bus.gain.value = 1;
  bus.connect(graph.master);

  const delay = graph.audio.createDelay(1);
  delay.delayTime.value = 0.27;
  const feedback = graph.audio.createGain();
  feedback.gain.value = 0.3;
  const lowpass = graph.audio.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1500;
  const wet = graph.audio.createGain();
  wet.gain.value = 0.22;

  delay.connect(lowpass).connect(feedback).connect(delay);
  delay.connect(wet).connect(bus);
  return { bus, delay, feedback, lowpass, wet };
}

function ensureBgmOutput(graph: AudioGraph): BgmOutput {
  if (!bgmOutput || bgmOutput.bus.context !== graph.audio) {
    bgmOutput = createBgmOutput(graph);
  }
  return bgmOutput;
}

function disposeBgmOutput(output: BgmOutput | null): void {
  if (!output) return;
  for (const node of [output.delay, output.lowpass, output.feedback, output.wet, output.bus]) {
    try {
      node.disconnect();
    } catch {
      /* 破棄済みは無視 */
    }
  }
}

function detachPlayback(fadeSeconds: number): DetachedPlayback {
  clearLoopTimer();
  const output = bgmOutput;
  bgmOutput = null;
  const sources = takeActiveSources();

  if (output && fadeSeconds > 0) {
    const now = output.bus.context.currentTime;
    try {
      output.bus.gain.cancelScheduledValues(now);
      output.bus.gain.setValueAtTime(output.bus.gain.value, now);
      output.bus.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
    } catch {
      /* コンテキスト破棄後などは無視 */
    }
  }
  return { output, sources };
}

function finishDetached(playback: DetachedPlayback): void {
  stopSources(playback.sources);
  disposeBgmOutput(playback.output);
}

function queueLoop(
  graph: AudioGraph,
  track: BgmTrack,
  startAt: number,
  arrangement: BgmArrangement,
  currentGeneration: number,
): void {
  if (currentGeneration !== generation || selection === null || !isSoundEnabled()) return;

  const output = ensureBgmOutput(graph);
  track.scheduleLoop(
    { ...graph, delaySend: output.delay },
    output.bus,
    startAt,
    arrangement,
    trackSource,
  );

  const loopEnd = startAt + track.loopBeats * (60 / track.bpm);
  const delayMs = (loopEnd - graph.audio.currentTime - 0.4) * 1000;
  clearLoopTimer();
  loopTimer = setTimeout(
    () => {
      loopTimer = null;
      if (currentGeneration !== generation || selection === null || !isSoundEnabled()) return;
      void readyAudioGraph().then((nextGraph) => {
        if (!nextGraph || currentGeneration !== generation || selection === null) return;
        queueLoop(nextGraph, track, loopEnd, arrangement, currentGeneration);
      });
    },
    Math.max(0, delayMs),
  );
}

/** いま鳴っている音源を止め、短いフェードでプチッを抑える。 */
function hardStop(fadeSeconds = STOP_FADE_SECONDS): void {
  ++generation;
  const playback = detachPlayback(fadeSeconds);
  if (playback.output && fadeSeconds > 0) {
    globalThis.setTimeout(() => finishDetached(playback), fadeSeconds * 1000 + 20);
  } else {
    finishDetached(playback);
  }
}

function startFromNow(track: BgmTrack, arrangement: BgmArrangement): void {
  if (!isSoundEnabled()) {
    selection = null;
    return;
  }
  const currentGeneration = ++generation;
  const previous = detachPlayback(SWITCH_FADE_SECONDS);
  const begin = (): void => {
    if (currentGeneration !== generation || !isSoundEnabled() || selection === null) return;
    void readyAudioGraph().then((graph) => {
      if (!graph || currentGeneration !== generation || !isSoundEnabled() || selection === null)
        return;
      const output = ensureBgmOutput(graph);
      const now = graph.audio.currentTime;
      output.bus.gain.cancelScheduledValues(now);
      output.bus.gain.setValueAtTime(0.0001, now);
      output.bus.gain.linearRampToValueAtTime(1, now + SWITCH_FADE_SECONDS);
      queueLoop(graph, track, now + 0.1, arrangement, currentGeneration);
    });
  };

  if (previous.output || previous.sources.length > 0) {
    globalThis.setTimeout(
      () => {
        // 後続の停止や切替が入っても、切り離した旧音源の後始末だけは必ず行う。
        finishDetached(previous);
        begin();
      },
      SWITCH_FADE_SECONDS * 1000 + 20,
    );
  } else {
    begin();
  }
}

/** 現在の選曲。未登録IDは既定曲へ正規化して返す。 */
export function getBgmSelection(): BgmSelection | null {
  return selection ? { ...selection } : null;
}

/** 既存の開発フックを壊さないためのモード参照。 */
export function getBgmMode(): BgmArrangement | 'off' {
  return selection?.arrangement ?? 'off';
}

/**
 * 曲IDとアレンジを同時に適用する。
 * 同じアレンジでも曲IDが変われば必ず切り替え、未登録IDは無音にせず既定曲へ戻す。
 */
export function setBgm(next: BgmSelection | null): void {
  if (next === null) {
    if (selection === null) return;
    selection = null;
    hardStop();
    return;
  }
  if (!isSoundEnabled()) {
    selection = null;
    hardStop(0);
    return;
  }

  const track = resolveBgmTrack(next.trackId);
  const normalized: BgmSelection = { trackId: track.id, arrangement: next.arrangement };
  if (
    selection?.trackId === normalized.trackId &&
    selection.arrangement === normalized.arrangement &&
    activeSources.size > 0
  ) {
    return;
  }

  selection = normalized;
  startFromNow(track, normalized.arrangement);
}

export function stopBgm(): void {
  setBgm(null);
}

/** デバッグ・テスト用。通常利用は getBgmSelection を使う。 */
export function getActiveBgmSourceCount(): number {
  return activeSources.size;
}

/** メニューなど曲指定がない場面の選曲。 */
export function defaultBgmSelection(arrangement: BgmArrangement = 'normal'): BgmSelection {
  return { trackId: DEFAULT_BGM_TRACK_ID, arrangement };
}
