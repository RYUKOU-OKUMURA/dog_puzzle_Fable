/** ヒント演出の世代カウンタ。invalidate 後は旧トークンが stale になる */
export class HintGeneration {
  private n = 0;

  /** 演出中断・ステージ退出時に呼ぶ */
  invalidate(): void {
    this.n += 1;
  }

  /** 演出開始時に保持するトークン */
  token(): number {
    return this.n;
  }

  isStale(started: number): boolean {
    return started !== this.n;
  }
}
