import type * as THREE from 'three';
import type { Grid } from '../core/grid';
import type { GridPos, PanelKind, StageDef } from '../core/types';
import type { BoardView } from '../scene/boardView';
import { cellToScreen } from '../scene/input';
import type { Town } from '../scene/town';
import type { Hud } from '../ui/hud';

interface PuzzleDeps {
  grid: Grid;
  stage: StageDef;
  town: Town;
  boardView: BoardView;
  hud: Hud;
  camera: THREE.Camera;
  canvas: HTMLCanvasElement;
}

/** パズルフェーズの操作(パネル選択→配置、まわす・はずす)をまとめる */
export class PuzzleController {
  private readonly deps: PuzzleDeps;
  private selectedKind: PanelKind | null = null;
  /** お散歩中は盤面をさわれなくする */
  enabled = true;

  constructor(deps: PuzzleDeps) {
    this.deps = deps;
  }

  /** パネル種の選択。UI経由の呼び出しは enabled で別途ガードされる */
  selectKind(kind: PanelKind | null): void {
    this.selectedKind = kind;
    this.deps.hud.setSelected(kind);
    this.deps.hud.hidePanelPopup();
    this.refreshHighlight();
  }

  handleCellTap(pos: GridPos): void {
    if (!this.enabled) return;
    const { grid, boardView, hud } = this.deps;
    const panel = grid.panelAt(pos);

    if (panel && !panel.fixed) {
      hud.showPanelPopup(pos, this.screenOf(pos));
      return;
    }

    if (this.selectedKind && grid.canPlace(pos)) {
      grid.place(pos, this.selectedKind, 0);
      boardView.refresh(grid, pos);
      this.refreshHighlight();
      hud.hidePanelPopup();
      return;
    }

    hud.hidePanelPopup();
  }

  rotatePanel(pos: GridPos): void {
    const { grid, boardView } = this.deps;
    if (grid.rotate(pos)) boardView.refresh(grid, pos);
  }

  removePanel(pos: GridPos): void {
    const { grid, boardView, hud } = this.deps;
    if (grid.remove(pos)) {
      boardView.refresh(grid, pos);
      hud.hidePanelPopup();
      this.refreshHighlight();
    }
  }

  /** 盤面リセット(もういちどあそぶ) */
  reset(): void {
    this.deps.boardView.clear(this.deps.grid);
    this.selectKind(null);
  }

  private refreshHighlight(): void {
    const { town, grid } = this.deps;
    town.setSlotsHighlighted(this.selectedKind !== null, (pos) => grid.canPlace(pos));
  }

  private screenOf(pos: GridPos): { x: number; y: number } {
    const { stage, camera, canvas } = this.deps;
    return cellToScreen(pos, stage, camera, canvas);
  }
}
