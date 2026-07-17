import { describe, expect, it } from 'vitest';
import { grantWorldClearAccessory } from '../src/game/accessoryReward';
import { emptySave } from '../src/save/convert';

describe('grantWorldClearAccessory', () => {
  it('ワールド初回クリアで対応アクセサリーを付与し、未装備なら自動装備する', () => {
    const save = emptySave();
    const result = grantWorldClearAccessory(save, 'w1', true);
    expect(result.grantedId).toBe('acc-w1');
    expect(result.save.ownedAccessories).toEqual(['acc-w1']);
    expect(result.save.equippedAccessoryId).toBe('acc-w1');
  });

  it('再クリア(firstWorldClear=false)では付与しない', () => {
    const save = emptySave();
    const result = grantWorldClearAccessory(save, 'w1', false);
    expect(result.grantedId).toBeNull();
    expect(result.save.ownedAccessories).toEqual([]);
    expect(result.save.equippedAccessoryId).toBeNull();
  });

  it('すでに所持済みなら再付与しない', () => {
    const save = emptySave();
    save.ownedAccessories = ['acc-w1'];
    save.equippedAccessoryId = 'acc-w1';
    const result = grantWorldClearAccessory(save, 'w1', true);
    expect(result.grantedId).toBeNull();
    expect(result.save.ownedAccessories).toEqual(['acc-w1']);
  });

  it('既に別の装備があるときは自動装備で上書きしない', () => {
    const save = emptySave();
    save.ownedAccessories = ['acc-w1'];
    save.equippedAccessoryId = 'acc-w1';
    const result = grantWorldClearAccessory(save, 'w2', true);
    expect(result.grantedId).toBe('acc-w2');
    expect(result.save.ownedAccessories).toEqual(['acc-w1', 'acc-w2']);
    expect(result.save.equippedAccessoryId).toBe('acc-w1');
  });

  it('不明ワールドは付与しない', () => {
    const save = emptySave();
    const result = grantWorldClearAccessory(save, 'w99', true);
    expect(result.grantedId).toBeNull();
    expect(result.save.ownedAccessories).toEqual([]);
  });

  it('W1〜W5 の対応idが正しい', () => {
    const expected: Record<string, string> = {
      w1: 'acc-w1',
      w2: 'acc-w2',
      w3: 'acc-w3',
      w4: 'acc-w4',
      w5: 'acc-w5',
    };
    for (const [worldId, accId] of Object.entries(expected)) {
      const save = emptySave();
      expect(grantWorldClearAccessory(save, worldId, true).grantedId).toBe(accId);
    }
  });
});
