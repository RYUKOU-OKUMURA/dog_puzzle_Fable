import './style.css';
import { Grid } from './core/grid';
import { PuzzleController } from './game/puzzle';
import { Game } from './game/state';
import { Animator } from './game/tween';
import { BoardView } from './scene/boardView';
import { attachCellTapListener, cellToScreen } from './scene/input';
import { createSceneContext } from './scene/renderer';
import { buildTown } from './scene/town';
import { stage01 } from './stage/stage01';
import { Hud } from './ui/hud';
import { ProfilesView } from './ui/profiles';
import { Screens } from './ui/screens';
import { ZukanView } from './ui/zukan';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const uiRoot = document.querySelector<HTMLElement>('#ui-root')!;

const sceneContext = createSceneContext(canvas);
const animator = new Animator();
sceneContext.onFrame((dt) => animator.update(dt));

const stage = stage01;
const grid = new Grid(stage);
const town = buildTown(stage);
sceneContext.scene.add(town.group);
const boardView = new BoardView(sceneContext.scene, stage);

const screens = new Screens(uiRoot);
const zukan = new ZukanView(uiRoot);
const profiles = new ProfilesView(uiRoot);

const hud = new Hud(uiRoot, stage.name, {
  onSelectPanel: (kind) => puzzle.selectKind(kind),
  onStart: () => void game.startWalk(),
  onZukan: () => game.openZukan(),
  onRotate: (pos) => puzzle.rotatePanel(pos),
  onRemove: (pos) => puzzle.removePanel(pos),
});

const puzzle = new PuzzleController({
  grid,
  stage,
  town,
  boardView,
  hud,
  camera: sceneContext.camera,
  canvas,
});

const game = new Game({
  sceneContext,
  stage,
  grid,
  puzzle,
  hud,
  screens,
  zukan,
  profiles,
  animator,
});

attachCellTapListener(canvas, sceneContext.camera, town.cellTiles, (pos) =>
  puzzle.handleCellTap(pos),
);

game.boot();

// ブラウザ自動テスト用フック(開発時のみ)
if (import.meta.env.DEV) {
  Object.assign(window, {
    __game: {
      grid,
      stage,
      save: () => game.activeSave,
      profileId: () => game.activeProfileId,
      phase: () => game.phase,
      cellToScreen: (x: number, z: number) =>
        cellToScreen({ x, z }, stage, sceneContext.camera, canvas),
    },
  });
}
