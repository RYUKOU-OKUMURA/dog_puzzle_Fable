import { DEFAULT_BGM_TRACK_ID, type BgmSelection } from '../audio/bgm';

export type BgmPhase =
  | 'select'
  | 'title'
  | 'worldSelect'
  | 'stageSelect'
  | 'puzzle'
  | 'walk'
  | 'encounter'
  | 'clear';

export interface BgmPolicyInput {
  phase: BgmPhase;
  stageTrackId: string | null;
  successfulWalk: boolean;
}

/** ゲーム状態だけを正として、その場面で鳴らす曲とアレンジを決める。 */
export function selectBgmForGame(input: BgmPolicyInput): BgmSelection | null {
  if (input.phase === 'encounter' || input.phase === 'clear') return null;

  const usesStageTrack = input.phase === 'puzzle' || input.phase === 'walk';
  const trackId = usesStageTrack ? (input.stageTrackId ?? DEFAULT_BGM_TRACK_ID) : DEFAULT_BGM_TRACK_ID;
  const arrangement = input.phase === 'walk' && input.successfulWalk ? 'walk' : 'normal';
  return { trackId, arrangement };
}
