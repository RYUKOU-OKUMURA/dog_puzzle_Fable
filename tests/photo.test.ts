import { describe, expect, it } from 'vitest';
import { photoZoomForFriendScale } from '../src/game/photo';
import { WORLDS } from '../src/stage/catalog';
import { DOGS } from '../src/stage/dogs';

describe('photoZoomForFriendScale', () => {
  it('scale=1 では基準寄り(2.6より大きい)になる', () => {
    expect(photoZoomForFriendScale(1)).toBeGreaterThan(2.6);
    expect(photoZoomForFriendScale(1)).toBeLessThanOrEqual(4.2);
  });

  it('小型犬ほど zoom が上がり、大型犬ほど下がる', () => {
    const chin = photoZoomForFriendScale(DOGS.chin!.scale);
    const spitz = photoZoomForFriendScale(DOGS.spitz!.scale);
    const kai = photoZoomForFriendScale(DOGS.kai!.scale);
    const akita = photoZoomForFriendScale(DOGS.akita!.scale);
    // ちん・スピッツは上限クランプで同値になりうる
    expect(chin).toBeGreaterThanOrEqual(spitz);
    expect(spitz).toBeGreaterThan(kai);
    expect(kai).toBeGreaterThan(akita);
  });

  it('W1 全犬種が上限・下限の範囲に収まる', () => {
    for (const id of ['akita', 'chin', 'spitz', 'kai'] as const) {
      const zoom = photoZoomForFriendScale(DOGS[id]!.scale);
      expect(zoom).toBeGreaterThanOrEqual(3.4);
      expect(zoom).toBeLessThanOrEqual(4.0);
    }
  });

  it('極小 scale でも上限でクランプする', () => {
    expect(photoZoomForFriendScale(0.1)).toBe(4.0);
  });
});

describe('catalog 文言', () => {
  it('W2 の sub はかな中心(電話→でんわ)', () => {
    const w2 = WORLDS.find((w) => w.id === 'w2');
    expect(w2?.sub).toBe('れんがの まちと あかい でんわボックス');
    expect(w2?.sub.includes('電話')).toBe(false);
  });
});
