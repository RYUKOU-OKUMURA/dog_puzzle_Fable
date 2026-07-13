/**
 * クリア演出のエッジ判定。
 * 「いまのクリアで初めて達成したか」だけを true にする(再クリアで再発火させない)。
 */
export function firstClearCelebrationFlags(input: {
  beforeCollected: number;
  afterCollected: number;
  totalDogs: number;
  stageId: string;
  wasStageCleared: boolean;
}): { zukanComplete: boolean; worldFinale: boolean } {
  const zukanComplete =
    input.beforeCollected < input.totalDogs && input.afterCollected >= input.totalDogs;
  const worldFinale = input.stageId === 'w5-s4' && !input.wasStageCleared;
  return { zukanComplete, worldFinale };
}
