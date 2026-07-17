import { describe, expect, it } from 'vitest';
import { BGM_TRACK_IDS, isBgmTrackId } from '../src/audio/bgm';
import { WORLDS } from '../src/stage/catalog';
import { VERIFY_12X12 } from '../src/stage/devStages';

describe('ステージBGM割り当て', () => {
  it('曲レジストリのIDは重複しない', () => {
    expect(new Set(BGM_TRACK_IDS).size).toBe(BGM_TRACK_IDS.length);
  });

  it('全カタログステージの曲IDがaudioレジストリに存在する', () => {
    const stages = WORLDS.flatMap((world) => world.stages);
    expect(stages).toHaveLength(20);
    for (const stage of stages) {
      expect(stage.bgmTrackId, stage.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(isBgmTrackId(stage.bgmTrackId), stage.id).toBe(true);
    }
  });

  it('開発用ステージにも登録済み曲が割り当てられている', () => {
    expect(isBgmTrackId(VERIFY_12X12.bgmTrackId)).toBe(true);
  });
});
