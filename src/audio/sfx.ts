/**
 * 効果音(Web Audio API 合成のみ)。
 * 音色パラメータは docs/prototypes/audio-demo.html から移植(勝手に変えない)。
 * 他層・DOM に依存しない。「鳴らす関数」と有効フラグだけを公開する。
 */

type AudioContextCtor = typeof AudioContext;

let soundEnabled = true;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let delaySend: DelayNode | null = null;
let noiseBuf: AudioBuffer | null = null;
/** resume 完了待ち(多重 resume を1本にまとめる) */
let resumeWait: Promise<void> | null = null;

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
export function unlockAudio(): void {
  const audio = ensureContext();
  if (audio) void ensureRunning(audio);
}

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/** AudioContext と master グラフを用意する(resume はしない) */
function ensureContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;

  if (!ctx) {
    ctx = new Ctor();
    // マスター: コンプレッサで音割れを防ぐ(プロトタイプ踏襲)
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);
    // 空間の残響がわり: フィードバックディレイ(こだま)を薄くまぜる
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.27;
    const fb = ctx.createGain();
    fb.gain.value = 0.3;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    delay.connect(lp).connect(fb).connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    delay.connect(wet).connect(master);
    delaySend = delay;
    // ノイズ素材(打楽器・効果音用)を1秒ぶんだけ作っておく
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

/**
 * Safari/iPad では AudioContext が suspended のまま始まり、
 * resume 完了前に schedule した音は無音になる。必ず running を待ってから鳴らす。
 */
function ensureRunning(audio: AudioContext): Promise<void> {
  if (audio.state === 'running') {
    resumeWait = null;
    return Promise.resolve();
  }
  if (!resumeWait) {
    resumeWait = audio
      .resume()
      .then(() => {
        resumeWait = null;
      })
      .catch(() => {
        resumeWait = null;
      });
  }
  return resumeWait;
}

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(name: string): number {
  const midi = SEMI[name[0]!]! + 12 * (Number(name.slice(-1)) + 1);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function blip(
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

function noiseHit(
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

function bell(
  audio: AudioContext,
  dest: GainNode,
  echo: DelayNode,
  t: number,
  f: number,
  dur: number,
  vol: number,
  useEcho: boolean,
): void {
  const g = audio.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(dest);
  if (useEcho) g.connect(echo);
  const o = audio.createOscillator();
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
  o2.type = 'sine';
  o2.frequency.value = f * 4;
  o2.connect(g2);
  o2.start(t);
  o2.stop(t + dur * 0.3);
}

function withAudio(
  play: (audio: AudioContext, dest: GainNode, echo: DelayNode, buf: AudioBuffer) => void,
): void {
  if (!soundEnabled) return;
  const audio = ensureContext();
  if (!audio || !master || !delaySend || !noiseBuf) return;
  const dest = master;
  const echo = delaySend;
  const buf = noiseBuf;
  // resume 完了後に schedule する(完了前の currentTime で組むと無音になるため)
  void ensureRunning(audio).then(() => {
    if (!soundEnabled || audio.state !== 'running') return;
    play(audio, dest, echo, buf);
  });
}

/** パネルをスロットに置いたとき */
export function playPon(): void {
  withAudio((audio, dest) => {
    const t = audio.currentTime + 0.02;
    blip(audio, dest, t, 660, 440, 0.16, 0.3);
  });
}

/** お散歩中、しばちゃんがおやつを通過した瞬間 */
export function playPaku(): void {
  withAudio((audio, dest, _echo, buf) => {
    const t = audio.currentTime + 0.02;
    noiseHit(audio, dest, buf, t, 0.05, 0.14, 'lowpass', 900);
    blip(audio, dest, t + 0.04, 523, 523, 0.07, 0.26);
    blip(audio, dest, t + 0.12, 349, 349, 0.09, 0.22);
  });
}

/** クリア成功の演出開始時 */
export function playFanfare(): void {
  withAudio((audio, dest, echo) => {
    const t = audio.currentTime + 0.02;
    (['C5', 'E5', 'G5'] as const).forEach((n, i) => {
      bell(audio, dest, echo, t + i * 0.13, freq(n), 0.5, 0.3, true);
    });
    (['C5', 'E5', 'G5', 'C6'] as const).forEach((n) => {
      const g = audio.createGain();
      g.gain.setValueAtTime(0.1, t + 0.42);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
      g.connect(dest);
      g.connect(echo);
      const o = audio.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq(n);
      o.connect(g);
      o.start(t + 0.42);
      o.stop(t + 1.4);
    });
    bell(audio, dest, echo, t + 0.42, freq('C6') * 2, 0.8, 0.12, true);
  });
}
