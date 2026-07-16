import { describe, expect, it } from 'vitest';
import {
  connectionsOf,
  distinctRotationsOf,
  exitsFrom,
  nextRotation,
  rotateDir,
} from '../src/core/panel';

describe('rotateDir', () => {
  it('90°で時計回りに1つ進む', () => {
    expect(rotateDir('N', 90)).toBe('E');
    expect(rotateDir('E', 90)).toBe('S');
    expect(rotateDir('S', 90)).toBe('W');
    expect(rotateDir('W', 90)).toBe('N');
  });

  it('0°では変わらない', () => {
    expect(rotateDir('N', 0)).toBe('N');
  });

  it('270°で反時計回りに1つ戻ったのと同じ', () => {
    expect(rotateDir('N', 270)).toBe('W');
  });
});

describe('connectionsOf', () => {
  it('まっすぐ: 0°は南北、90°は東西', () => {
    expect(connectionsOf('straight', 0).sort()).toEqual(['N', 'S']);
    expect(connectionsOf('straight', 90).sort()).toEqual(['E', 'W']);
    expect(connectionsOf('straight', 180).sort()).toEqual(['N', 'S']);
  });

  it('曲がり角: 回転で4通りの角になる', () => {
    expect(connectionsOf('corner', 0).sort()).toEqual(['E', 'N']);
    expect(connectionsOf('corner', 90).sort()).toEqual(['E', 'S']);
    expect(connectionsOf('corner', 180).sort()).toEqual(['S', 'W']);
    expect(connectionsOf('corner', 270).sort()).toEqual(['N', 'W']);
  });

  it('T字路: 3方向つながる', () => {
    expect(connectionsOf('tee', 0).sort()).toEqual(['E', 'N', 'W']);
    expect(connectionsOf('tee', 90).sort()).toEqual(['E', 'N', 'S']);
    expect(connectionsOf('tee', 180).sort()).toEqual(['E', 'S', 'W']);
  });

  it('端点(おうち・ゴール): 1方向だけ', () => {
    expect(connectionsOf('end', 0)).toEqual(['N']);
    expect(connectionsOf('end', 90)).toEqual(['E']);
    expect(connectionsOf('end', 270)).toEqual(['W']);
  });

  it('橋: 回転しても常に4方向', () => {
    expect(connectionsOf('bridge', 0).sort()).toEqual(['E', 'N', 'S', 'W']);
    expect(connectionsOf('bridge', 90).sort()).toEqual(['E', 'N', 'S', 'W']);
  });
});

describe('exitsFrom', () => {
  it('通常パネルは進入方向に関係なく全接続が出られる', () => {
    expect(exitsFrom('tee', 180, 'W').sort()).toEqual(['E', 'S', 'W']);
    expect(exitsFrom('straight', 0, null).sort()).toEqual(['N', 'S']);
  });

  it('橋は進入方向と同じ軸にしか出られない', () => {
    expect(exitsFrom('bridge', 0, 'N').sort()).toEqual(['N', 'S']);
    expect(exitsFrom('bridge', 0, 'S').sort()).toEqual(['N', 'S']);
    expect(exitsFrom('bridge', 0, 'E').sort()).toEqual(['E', 'W']);
    expect(exitsFrom('bridge', 0, 'W').sort()).toEqual(['E', 'W']);
  });
});

describe('distinctRotationsOf', () => {
  it('まっすぐ: 180°回転しても同じ接続になるので2通り', () => {
    expect(distinctRotationsOf('straight')).toEqual([0, 90]);
  });

  it('曲がり角: 4通りとも異なる接続', () => {
    expect(distinctRotationsOf('corner')).toEqual([0, 90, 180, 270]);
  });

  it('T字路: 4通りとも異なる接続', () => {
    expect(distinctRotationsOf('tee')).toEqual([0, 90, 180, 270]);
  });

  it('橋: 回転しても常に同じ接続なので1通り', () => {
    expect(distinctRotationsOf('bridge')).toEqual([0]);
  });

  it('端点: 4方向とも異なる接続', () => {
    expect(distinctRotationsOf('end')).toEqual([0, 90, 180, 270]);
  });
});

describe('nextRotation', () => {
  it('90°ずつ進み、270°の次は0°に戻る', () => {
    expect(nextRotation(0)).toBe(90);
    expect(nextRotation(90)).toBe(180);
    expect(nextRotation(180)).toBe(270);
    expect(nextRotation(270)).toBe(0);
  });
});
