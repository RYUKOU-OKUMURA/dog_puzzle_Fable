import { JAPAN_BGM_TRACK } from './japan';
import type { BgmTrack } from './types';

/** 新曲は曲モジュールを作り、この配列へ1件登録する。 */
const TRACKS = [JAPAN_BGM_TRACK] as const satisfies readonly BgmTrack[];

export type BgmTrackId = (typeof TRACKS)[number]['id'];

export const BGM_TRACK_IDS: readonly BgmTrackId[] = TRACKS.map((track) => track.id);
export const DEFAULT_BGM_TRACK_ID: BgmTrackId = JAPAN_BGM_TRACK.id;

const TRACK_BY_ID = new Map<string, BgmTrack>(TRACKS.map((track) => [track.id, track]));

export function isBgmTrackId(trackId: string): trackId is BgmTrackId {
  return TRACK_BY_ID.has(trackId);
}

export function resolveBgmTrack(trackId: string | undefined): BgmTrack {
  return (trackId ? TRACK_BY_ID.get(trackId) : undefined) ?? JAPAN_BGM_TRACK;
}
