import type { AudioGraph } from '../context';

/** 通常ループと、成功したおさんぽ中の追加アレンジ。 */
export type BgmArrangement = 'normal' | 'walk';

export type TrackSource = (source: AudioScheduledSourceNode) => void;

/**
 * BGMプレイヤーが扱う曲データの共通契約。
 * 曲ごとに音色や構成を自由に変えられるよう、プレイヤー側は小節データの形を知らない。
 */
export interface BgmTrack {
  readonly id: string;
  readonly bpm: number;
  readonly loopBeats: number;
  scheduleLoop(
    graph: AudioGraph,
    destination: GainNode,
    startAt: number,
    arrangement: BgmArrangement,
    trackSource: TrackSource,
  ): void;
}
