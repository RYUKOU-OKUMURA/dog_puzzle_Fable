/**
 * W1「にほん」わふうループ。
 * 曲データ・音色は docs/prototypes/audio-demo.html から移植した値を維持する。
 */
import { bell, hat, kick, noteFreq } from '../context';
import type { BgmTrack } from './types';

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

export const JAPAN_BGM_TRACK = {
  id: 'japan-01',
  bpm: 88,
  loopBeats: 32,
  scheduleLoop(graph, destination, startAt, arrangement, trackSource): void {
    const { audio, delaySend, noiseBuf } = graph;
    const secondsPerBeat = 60 / this.bpm;
    const walk = arrangement === 'walk';

    for (const [beat, note, length] of MELODY) {
      bell(
        audio,
        destination,
        delaySend,
        startAt + beat * secondsPerBeat,
        noteFreq(note),
        Math.min(length * secondsPerBeat + 0.7, 1.6),
        0.22,
        true,
        trackSource,
      );
    }

    CHORDS.forEach((chord, bar) => {
      const barAt = startAt + bar * 4 * secondsPerBeat;
      bell(
        audio,
        destination,
        delaySend,
        barAt,
        noteFreq(BASS[chord][0]),
        1.1,
        0.16,
        false,
        trackSource,
      );
      bell(
        audio,
        destination,
        delaySend,
        barAt + 2 * secondsPerBeat,
        noteFreq(BASS[chord][1]),
        1.1,
        0.13,
        false,
        trackSource,
      );
      ARP[chord].forEach((note, index) => {
        bell(
          audio,
          destination,
          delaySend,
          barAt + (index + 0.5) * secondsPerBeat,
          noteFreq(note),
          0.6,
          walk ? 0.1 : 0.05,
          false,
          trackSource,
        );
      });
      if (walk) {
        kick(audio, destination, barAt, trackSource);
        kick(audio, destination, barAt + 2 * secondsPerBeat, trackSource);
        for (let index = 0; index < 4; index++) {
          hat(
            audio,
            destination,
            noiseBuf,
            barAt + (index + 0.5) * secondsPerBeat,
            trackSource,
          );
        }
      }
    });
  },
} satisfies BgmTrack;
