import { Grid } from '../core/grid';
import type { StageDef } from '../core/types';
import { attachCellTapListener } from '../scene/input';
import { BoardView } from '../scene/boardView';
import { disposeObject } from '../scene/dispose';
import type { SceneContext } from '../scene/renderer';
import { buildTown, type Town } from '../scene/town';
import type { Hud } from '../ui/hud';
import { PuzzleController } from './puzzle';

interface StageRuntimeDeps {
  sceneContext: SceneContext;
  hud: Hud;
  canvas: HTMLCanvasElement;
}

/**
 * 1ステージぶんの実行時オブジェクトを束ねる: 盤面ロジック(Grid)・街・盤面ビュー・
 * パズル操作・タップ入力。ステージ選択のたびに破棄→生成して、ステージごとの盤面差し替えを
 * 安全に行う(Three.js のグループ/リスナを併せて入れ替える)。
 */
export class StageRuntime {
  readonly stage: StageDef;
  readonly grid: Grid;
  readonly town: Town;
  readonly boardView: BoardView;
  readonly puzzle: PuzzleController;
  private readonly detach: () => void;

  constructor(stage: StageDef, deps: StageRuntimeDeps) {
    const { sceneContext, hud, canvas } = deps;
    this.stage = stage;

    this.grid = new Grid(stage);
    this.town = buildTown(stage);
    sceneContext.scene.add(this.town.group);
    this.boardView = new BoardView(sceneContext.scene, stage);
    this.puzzle = new PuzzleController({
      grid: this.grid,
      stage,
      town: this.town,
      boardView: this.boardView,
      hud,
      camera: sceneContext.camera,
      canvas,
    });
    this.detach = attachCellTapListener(
      canvas,
      sceneContext.camera,
      this.town.cellTiles,
      (pos) => this.puzzle.handleCellTap(pos),
    );
  }

  /** 盤面を初期状態に戻す(もういちど あそぶ / 選択画面へ戻る前の片付け) */
  reset(): void {
    this.boardView.clear(this.grid);
    this.puzzle.selectKind(null);
  }

  /** 別ステージへ切り替える前に破棄。タップ入力を切り、街とプレイヤーパネルを解放する */
  dispose(): void {
    this.detach();
    this.boardView.disposeAll();
    this.town.group.parent?.remove(this.town.group);
    disposeObject(this.town.group);
  }
}
