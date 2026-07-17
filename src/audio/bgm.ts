/**
 * BGM(Web Audio API 合成のみ)。
 * 曲データ・音色は docs/prototypes/audio-demo.html の W1「にほん」わふうループから移植(勝手に変えない)。
 * AudioContext は context.ts と共有(二重に作らない)。
 */

import {
  bell,
  hat,
  isSoundEnabled,
  kick,
  noteFreq,
  readyAudioGraph,
  type AudioGraph,
} from './context';

/** normal=通常ループ / walk=おさんぽアレンジ / off=停止 */
export type BgmMode = 'normal' | 'walk' | 'off';

// ===== 曲データ: W1 にほん(ヨナぬき音階・88BPM・8小節) ==============
const BPM = 88;
const SPB = 60 / BPM;
const LOOP_BEATS = 32;
const MELODY: ReadonlyArray<readonly [number, string, number]> = [
  [0, 'E5', 1],
  [1, 'G5', 1],
  [2, 'A5', 1],
  [3, 'G5', 1],
  [4, 'E5', 1],
  [5, 'D5', 1],
  [6, 'C5', 2],
  [8, 'D5', 0.5],
  [8.5, 'E5', 0.5],
  [9, 'G5', 1],
  [10, 'A5', 1],
  [11, 'G5', 1],
  [12, 'D5', 3],
  [16, 'E5', 1],
  [17, 'G5', 1],
  [18, 'A5', 1],
  [19, 'C6', 1],
  [20, 'A5', 1],
  [21, 'G5', 1],
  [22, 'E5', 2],
  [24, 'G5', 1],
  [25, 'E5', 1],
  [26, 'D5', 1],
  [27, 'C5', 1],
  [28, 'D5', 1],
  [29, 'C5', 3],
];
const CHORDS = ['C', 'Am', 'G', 'G', 'C', 'Am', 'G', 'C'] as const;
const BASS: Record<(typeof CHORDS)[number], readonly [string, string]> = {
  C: ['C3', 'G3'],
  Am: ['A2', 'E3'],
  G: ['G2', 'D3'],
};
const ARP: Record<(typeof CHORDS)[number], readonly [string, string, string, string]> = {
  C: ['E4', 'G4', 'C5', 'G4'],
  Am: ['E4', 'A4', 'C5', 'A4'],
  G: ['D4', 'G4', 'B4', 'G4'],
};

let mode: BgmMode = 'off';
let loopTimer: ReturnType<typeof setTimeout> | null = null;
/** 停止時にまとめて止めるための音源リスト */
const activeSrcs: AudioScheduledSourceNode[] = [];
/** 短いフェード用のゲイン(master 直結ではなく BGM 専用バス) */
let bgmBus: GainNode | null = null;
let generation = 0;

function track(src: AudioScheduledSourceNode): void {
  activeSrcs.push(src);
}

function clearLoopTimer(): void {
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}

function stopSources(): void {
  for (const s of activeSrcs) {
    try {
      s.stop();
    } catch {
      /* 停止済みは無視 */
    }
  }
  activeSrcs.length = 0;
}

function ensureBgmBus(graph: AudioGraph): GainNode {
  if (!bgmBus || bgmBus.context !== graph.audio) {
    bgmBus = graph.audio.createGain();
    bgmBus.gain.value = 1;
    bgmBus.connect(graph.master);
  }
  return bgmBus;
}

function scheduleLoop(graph: AudioGraph, t0: number, walk: boolean): void {
  const { audio, delaySend, noiseBuf } = graph;
  const dest = ensureBgmBus(graph);

  for (const [beat, note, len] of MELODY) {
    bell(
      audio,
      dest,
      delaySend,
      t0 + beat * SPB,
      noteFreq(note),
      Math.min(len * SPB + 0.7, 1.6),
      0.22,
      true,
      track,
    );
  }
  CHORDS.forEach((ch, bar) => {
    const barT = t0 + bar * 4 * SPB;
    bell(audio, dest, delaySend, barT, noteFreq(BASS[ch][0]), 1.1, 0.16, false, track);
    bell(audio, dest, delaySend, barT + 2 * SPB, noteFreq(BASS[ch][1]), 1.1, 0.13, false, track);
    ARP[ch].forEach((note, i) => {
      bell(
        audio,
        dest,
        delaySend,
        barT + (i + 0.5) * SPB,
        noteFreq(note),
        0.6,
        walk ? 0.1 : 0.05,
        false,
        track,
      );
    });
    if (walk) {
      kick(audio, dest, barT, track);
      kick(audio, dest, barT + 2 * SPB, track);
      for (let i = 0; i < 4; i++) hat(audio, dest, noiseBuf, barT + (i + 0.5) * SPB, track);
    }
  });
}

function queueLoop(graph: AudioGraph, t0: number, walk: boolean, gen: number): void {
  if (gen !== generation || mode === 'off' || !isSoundEnabled()) return;
  scheduleLoop(graph, t0, walk);
  const loopEnd = t0 + LOOP_BEATS * SPB;
  const delayMs = (loopEnd - graph.audio.currentTime - 0.4) * 1000;
  clearLoopTimer();
  loopTimer = setTimeout(
    () => {
      if (gen !== generation || mode === 'off' || !isSoundEnabled()) return;
      void readyAudioGraph().then((next) => {
        if (!next || gen !== generation || mode === 'off') return;
        queueLoop(next, loopEnd, mode === 'walk', gen);
      });
    },
    Math.max(0, delayMs),
  );
}

/**
 * いま鳴っている音源を止め、短いフェードでプチッを抑える。
 * 新SEは足さず、ゲインだけすっと下げる。
 */
function hardStop(fadeSec = 0.08): void {
  clearLoopTimer();
  const stopGen = ++generation;
  const bus = bgmBus;
  if (bus && fadeSec > 0) {
    const t = bus.context.currentTime;
    try {
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0.0001, t + fadeSec);
    } catch {
      /* コンテキスト破棄後などは無視 */
    }
    globalThis.setTimeout(
      () => {
        // 停止後に別モードが始まっていたら触らない
        if (stopGen !== generation) return;
        stopSources();
        if (bgmBus) bgmBus.gain.value = 1;
      },
      fadeSec * 1000 + 20,
    );
  } else {
    stopSources();
    if (bgmBus) bgmBus.gain.value = 1;
  }
}

function startFromNow(walk: boolean): void {
  if (!isSoundEnabled()) {
    mode = 'off';
    return;
  }
  const gen = ++generation;
  clearLoopTimer();
  stopSources();
  void readyAudioGraph().then((graph) => {
    if (!graph || gen !== generation || !isSoundEnabled()) return;
    if (mode === 'off') return;
    const bus = ensureBgmBus(graph);
    const t = graph.audio.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.linearRampToValueAtTime(1, t + 0.06);
    queueLoop(graph, t + 0.1, walk, gen);
  });
}

/** 現在の BGM モード(テスト・デバッグ用) */
export function getBgmMode(): BgmMode {
  return mode;
}

/**
 * BGM の再生モードを切り替える。
 * 同じモードへの再指定は何もしない(ループ途切れ防止)。
 * off 以外へ切り替えるときは頭からやりなおす(プロトタイプの walkMode 切替と同じ)。
 */
export function setBgmMode(next: BgmMode): void {
  if (next === 'off') {
    if (mode === 'off') return;
    mode = 'off';
    hardStop();
    return;
  }
  if (!isSoundEnabled()) {
    mode = 'off';
    hardStop(0);
    return;
  }
  if (next === mode && activeSrcs.length > 0) return;
  mode = next;
  startFromNow(next === 'walk');
}

/** おと OFF 時や画面遷移で明示停止したいとき */
export function stopBgm(): void {
  setBgmMode('off');
}
