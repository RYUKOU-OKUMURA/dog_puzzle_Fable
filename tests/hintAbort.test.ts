import { describe, expect, it, vi } from 'vitest';
import { HintGeneration } from '../src/game/hintGeneration';
import { Animator } from '../src/game/tween';

describe('HintGeneration', () => {
  it('invalidate 後は旧トークンが stale になる', () => {
    const gen = new HintGeneration();
    const token = gen.token();
    expect(gen.isStale(token)).toBe(false);
    gen.invalidate();
    expect(gen.isStale(token)).toBe(true);
    expect(gen.isStale(gen.token())).toBe(false);
  });

  it('演出中に invalidate されると残りのステップを実行しない', async () => {
    const gen = new HintGeneration();
    const started = gen.token();
    const steps: string[] = [];

    const play = async (): Promise<void> => {
      steps.push('walk');
      await Promise.resolve();
      if (gen.isStale(started)) return;
      steps.push('sit');
      await Promise.resolve();
      if (gen.isStale(started)) return;
      steps.push('done');
    };

    const running = play();
    gen.invalidate(); // 「もどる」相当
    await running;
    expect(steps).toEqual(['walk']);
  });
});

describe('Animator.cancelAll', () => {
  it('進行中の tween を打ち切って await を進める', async () => {
    const animator = new Animator();
    const onUpdate = vi.fn();
    const pending = animator.run(10, onUpdate);
    animator.cancelAll();
    await pending;
    expect(onUpdate).toHaveBeenCalledWith(1);
  });
});
