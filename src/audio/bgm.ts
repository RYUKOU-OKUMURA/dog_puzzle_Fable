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
let bgmBus: GainNode | null = null;
let generation = 0;

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

function stopSources(): void {
  const sources = [...activeSources];
  activeSources.clear();
  for (const source of sources) {
    try {
      source.stop();
    } catch {
      /* 停止済みは無視 */
    }
  }
}

function ensureBgmBus(graph: AudioGraph): GainNode {
  if (!bgmBus || bgmBus.context !== graph.audio) {
    bgmBus = graph.audio.createGain();
    bgmBus.gain.value = 1;
    bgmBus.connect(graph.master);
  }
  return bgmBus;
}

function queueLoop(
  graph: AudioGraph,
  track: BgmTrack,
  startAt: number,
  arrangement: BgmArrangement,
  currentGeneration: number,
): void {
  if (currentGeneration !== generation || selection === null || !isSoundEnabled()) return;

  const destination = ensureBgmBus(graph);
  track.scheduleLoop(graph, destination, startAt, arrangement, trackSource);

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
function hardStop(fadeSeconds = 0.08): void {
  clearLoopTimer();
  const stopGeneration = ++generation;
  const bus = bgmBus;
  if (bus && fadeSeconds > 0) {
    const now = bus.context.currentTime;
    try {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
    } catch {
      /* コンテキスト破棄後などは無視 */
    }
    globalThis.setTimeout(
      () => {
        if (stopGeneration !== generation) return;
        stopSources();
        if (bgmBus) bgmBus.gain.value = 1;
      },
      fadeSeconds * 1000 + 20,
    );
  } else {
    stopSources();
    if (bgmBus) bgmBus.gain.value = 1;
  }
}

function startFromNow(track: BgmTrack, arrangement: BgmArrangement): void {
  if (!isSoundEnabled()) {
    selection = null;
    return;
  }
  const currentGeneration = ++generation;
  clearLoopTimer();
  stopSources();
  void readyAudioGraph().then((graph) => {
    if (!graph || currentGeneration !== generation || !isSoundEnabled() || selection === null) return;
    const bus = ensureBgmBus(graph);
    const now = graph.audio.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.linearRampToValueAtTime(1, now + 0.06);
    queueLoop(graph, track, now + 0.1, arrangement, currentGeneration);
  });
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
