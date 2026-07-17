/**
 * 共有 AudioContext / master グラフ。
 * 効果音と BGM で二重に Context を作らないための共通層。
 * 音色パラメータは docs/prototypes/audio-demo.html から移植(勝手に変えない)。
 */

type AudioContextCtor = typeof AudioContext;

let soundEnabled = true;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let delaySend: DelayNode | null = null;
let noiseBuf: AudioBuffer | null = null;
/** ユーザージェスチャ内で一度でも running を確認できたか。 */
let unlocked = false;
/** resume 完了待ち(多重 resume を1本にまとめる) */
let resumeWait: Promise<boolean> | null = null;

/** おと ON/OFF。呼び出し側に分岐を散らさず、再生関数内で参照する */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * 初回ユーザージェスチャで AudioContext を生成・resume する(iPad 自動再生制限対応)。
 * 再生関数からも呼ばれるが、タイトル等の最初のタップで先に呼んでおくと安全。
 */
export async function unlockAudio(): Promise<boolean> {
  let audio: AudioContext | null;
  try {
    audio = ensureContext();
  } catch {
    // 一時的な初期化失敗をジェスチャのエラーにせず、次の操作で再試行できるようにする。
    return false;
  }
  if (!audio) return false;
  const running = await ensureRunning(audio);
  if (running) unlocked = true;
  return running;
}

export function isAudioRunning(): boolean {
  return ctx?.state === 'running';
}

export type AudioStatus = AudioContextState | 'locked' | 'unsupported';

/** 開発環境で無音原因を切り分けるための状態参照。 */
export function getAudioStatus(): AudioStatus {
  if (ctx) return ctx.state;
  return getAudioContextCtor() ? 'locked' : 'unsupported';
}

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/** AudioContext と master グラフを用意する(resume はしない) */
export function ensureContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;

  if (!ctx) {
    const audio = new Ctor();
    // マスター: コンプレッサで音割れを防ぐ(プロトタイプ踏襲)
    const comp = audio.createDynamicsCompressor();
    comp.connect(audio.destination);
    const nextMaster = audio.createGain();
    nextMaster.gain.value = 0.9;
    nextMaster.connect(comp);
    // 空間の残響がわり: フィードバックディレイ(こだま)を薄くまぜる
    const delay = audio.createDelay(1);
    delay.delayTime.value = 0.27;
    const fb = audio.createGain();
    fb.gain.value = 0.3;
    const lp = audio.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    delay.connect(lp).connect(fb).connect(delay);
    const wet = audio.createGain();
    wet.gain.value = 0.22;
    delay.connect(wet).connect(nextMaster);
    // ノイズ素材(打楽器・効果音用)を1秒ぶんだけ作っておく
    const nextNoiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const d = nextNoiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // グラフが最後まで作れた場合だけ共有状態へ反映し、失敗時の半端な Context を残さない。
    ctx = audio;
    master = nextMaster;
    delaySend = delay;
    noiseBuf = nextNoiseBuf;
  }
  return ctx;
}

/**
 * Safari/iPad では AudioContext が suspended のまま始まり、
 * resume 完了前に schedule した音は無音になる。必ず running を待ってから鳴らす。
 */
export function ensureRunning(audio: AudioContext): Promise<boolean> {
  if (audio.state === 'running') {
    resumeWait = null;
    return Promise.resolve(true);
  }
  if (!resumeWait) {
    resumeWait = audio
      .resume()
      .then(() => audio.state === 'running')
      .catch(() => false);
    const currentWait = resumeWait;
    void currentWait.then(() => {
      if (resumeWait === currentWait) resumeWait = null;
    });
  }
  return resumeWait;
}

export interface AudioGraph {
  audio: AudioContext;
  master: GainNode;
  delaySend: DelayNode;
  noiseBuf: AudioBuffer;
}

/**
 * おと ON かつ Context が使えるときだけグラフを返す。
 * resume 完了後に resolve する(完了前の currentTime で組むと無音になるため)。
 */
export async function readyAudioGraph(): Promise<AudioGraph | null> {
  if (!soundEnabled) return null;
  // 起動時に gesture 外の resume を始めると、最初のタップと競合して解除不能になる。
  if (!unlocked) return null;
  const audio = ensureContext();
  if (!audio || !master || !delaySend || !noiseBuf) return null;
  const running = await ensureRunning(audio);
  if (!running || !soundEnabled) return null;
  return { audio, master, delaySend, noiseBuf };
}

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteFreq(name: string): number {
  const midi = SEMI[name[0]!]! + 12 * (Number(name.slice(-1)) + 1);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** オルゴールの1音: サイン波+高い倍音を、すっと減衰させる(プロトタイプ踏襲) */
export function bell(
  audio: AudioContext,
  dest: GainNode,
  echo: DelayNode,
  t: number,
  f: number,
  dur: number,
  vol: number,
  useEcho: boolean,
  trackSrc?: (src: AudioScheduledSourceNode) => void,
): void {
  const g = audio.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(dest);
  if (useEcho) g.connect(echo);
  const o = audio.createOscillator();
  trackSrc?.(o);
  o.type = 'sine';
  o.frequency.value = f;
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.05);
  const g2 = audio.createGain();
  g2.gain.setValueAtTime(vol * 0.12, t);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.25);
  g2.connect(dest);
  const o2 = audio.createOscillator();
  trackSrc?.(o2);
  o2.type = 'sine';
  o2.frequency.value = f * 4;
  o2.connect(g2);
  o2.start(t);
  o2.stop(t + dur * 0.3);
}

export function blip(
  audio: AudioContext,
  dest: GainNode,
  t: number,
  f0: number,
  f1: number,
  dur: number,
  vol: number,
  type: OscillatorType = 'sine',
): void {
  const g = audio.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(dest);
  const o = audio.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function noiseHit(
  audio: AudioContext,
  dest: GainNode,
  buf: AudioBuffer,
  t: number,
  dur: number,
  vol: number,
  filterType: BiquadFilterType,
  filterFreq: number,
): void {
  const g = audio.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = audio.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = filterFreq;
  const s = audio.createBufferSource();
  s.buffer = buf;
  s.connect(f).connect(g).connect(dest);
  s.start(t);
  s.stop(t + dur + 0.05);
}

export function kick(
  audio: AudioContext,
  dest: GainNode,
  t: number,
  trackSrc?: (src: AudioScheduledSourceNode) => void,
): void {
  const g = audio.createGain();
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  g.connect(dest);
  const o = audio.createOscillator();
  trackSrc?.(o);
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.16);
}

export function hat(
  audio: AudioContext,
  dest: GainNode,
  buf: AudioBuffer,
  t: number,
  trackSrc?: (src: AudioScheduledSourceNode) => void,
): void {
  const g = audio.createGain();
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  const hp = audio.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6500;
  const s = audio.createBufferSource();
  trackSrc?.(s);
  s.buffer = buf;
  s.connect(hp).connect(g).connect(dest);
  s.start(t);
  s.stop(t + 0.05);
}
