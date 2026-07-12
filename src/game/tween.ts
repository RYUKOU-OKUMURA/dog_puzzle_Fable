interface TweenTask {
  elapsed: number;
  duration: number;
  onUpdate: (t: number) => void;
  resolve: () => void;
}

/**
 * requestAnimationFrame ベースの小さな補間エンジン。
 * SceneContext.onFrame から update(dt) を呼んで駆動する。
 */
export class Animator {
  private tasks: TweenTask[] = [];

  update(deltaSeconds: number): void {
    const finished: TweenTask[] = [];
    for (const task of this.tasks) {
      task.elapsed += deltaSeconds;
      const t = Math.min(1, task.elapsed / task.duration);
      task.onUpdate(t);
      if (t >= 1) finished.push(task);
    }
    if (finished.length > 0) {
      this.tasks = this.tasks.filter((task) => !finished.includes(task));
      for (const task of finished) task.resolve();
    }
  }

  /** duration 秒かけて onUpdate(t) を 0→1 で呼ぶ */
  run(duration: number, onUpdate: (t: number) => void): Promise<void> {
    return new Promise((resolve) => {
      this.tasks.push({ elapsed: 0, duration, onUpdate, resolve });
    });
  }

  wait(seconds: number): Promise<void> {
    return this.run(seconds, () => {});
  }
}

/** 行き過ぎない最短回転の目標角度を返す */
export function shortestAngleTarget(from: number, to: number): number {
  const twoPi = Math.PI * 2;
  let diff = (to - from) % twoPi;
  if (diff > Math.PI) diff -= twoPi;
  if (diff < -Math.PI) diff += twoPi;
  return from + diff;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
