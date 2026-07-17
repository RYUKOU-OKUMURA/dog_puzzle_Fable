/**
 * 効果音(Web Audio API 合成のみ)。
 * 音色パラメータは docs/prototypes/audio-demo.html から移植(勝手に変えない)。
 * AudioContext は context.ts と共有(二重に作らない)。
 */

import {
  bell,
  blip,
  isSoundEnabled,
  noiseHit,
  noteFreq,
  readyAudioGraph,
  setSoundEnabled,
  unlockAudio,
} from './context';

export { isSoundEnabled, setSoundEnabled, unlockAudio };

/** パネルをスロットに置いたとき */
export function playPon(): void {
  void readyAudioGraph().then((graph) => {
    if (!graph) return;
    const { audio, master } = graph;
    const t = audio.currentTime + 0.02;
    blip(audio, master, t, 660, 440, 0.16, 0.3);
  });
}

/** お散歩中、しばちゃんがおやつを通過した瞬間 */
export function playPaku(): void {
  void readyAudioGraph().then((graph) => {
    if (!graph) return;
    const { audio, master, noiseBuf } = graph;
    const t = audio.currentTime + 0.02;
    noiseHit(audio, master, noiseBuf, t, 0.05, 0.14, 'lowpass', 900);
    blip(audio, master, t + 0.04, 523, 523, 0.07, 0.26);
    blip(audio, master, t + 0.12, 349, 349, 0.09, 0.22);
  });
}

/** クリア成功の演出開始時 */
export function playFanfare(): void {
  void readyAudioGraph().then((graph) => {
    if (!graph) return;
    const { audio, master, delaySend } = graph;
    const t = audio.currentTime + 0.02;
    (['C5', 'E5', 'G5'] as const).forEach((n, i) => {
      bell(audio, master, delaySend, t + i * 0.13, noteFreq(n), 0.5, 0.3, true);
    });
    (['C5', 'E5', 'G5', 'C6'] as const).forEach((n) => {
      const g = audio.createGain();
      g.gain.setValueAtTime(0.1, t + 0.42);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
      g.connect(master);
      g.connect(delaySend);
      const o = audio.createOscillator();
      o.type = 'triangle';
      o.frequency.value = noteFreq(n);
      o.connect(g);
      o.start(t + 0.42);
      o.stop(t + 1.4);
    });
    bell(audio, master, delaySend, t + 0.42, noteFreq('C6') * 2, 0.8, 0.12, true);
  });
}
