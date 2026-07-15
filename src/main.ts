import './style.css';
import { Game } from './game/state';
import { Animator } from './game/tween';
import { cellToScreen } from './scene/input';
import { createSceneContext } from './scene/renderer';
import { Hud } from './ui/hud';
import { ProfilesView } from './ui/profiles';
import { Screens } from './ui/screens';
import { StageSelectView } from './ui/stageSelect';
import { WorldSelectView } from './ui/worldSelect';
import { ZukanView } from './ui/zukan';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const uiRoot = document.querySelector<HTMLElement>('#ui-root')!;

const sceneContext = createSceneContext(canvas);
const animator = new Animator();
sceneContext.onFrame((dt) => animator.update(dt));

// UIビューはステージに依存しないのでここで生成。ステージ別の盤面は Game が内包する。
const screens = new Screens(uiRoot);
const zukan = new ZukanView(uiRoot);
const profiles = new ProfilesView(uiRoot);
const worldSelect = new WorldSelectView(uiRoot);
const stageSelect = new StageSelectView(uiRoot);

// HUDの操作はすべて Game 経由にする(Game がステージ差し替えに合わせて現在のパズルへ流す)。
const hud = new Hud(uiRoot, {
  onSelectPanel: (kind) => game.onSelectPanel(kind),
  onStart: () => void game.startWalk(),
  onZukan: () => game.openZukan(),
  onRotate: (pos) => game.onRotatePanel(pos),
  onRemove: (pos) => game.onRemovePanel(pos),
  onExit: () => game.onExitPuzzle(),
});

const game = new Game({
  sceneContext,
  animator,
  hud,
  screens,
  zukan,
  profiles,
  worldSelect,
  stageSelect,
  canvas,
});

game.boot();

// ブラウザ自動テスト用フック(開発時のみ)
if (import.meta.env.DEV) {
  Object.assign(window, {
    __game: {
      save: () => game.activeSave,
      profileId: () => game.activeProfileId,
      phase: () => game.phase,
      runtime: () => game.activeRuntime,
      grid: () => game.activeRuntime?.grid,
      stage: () => game.activeRuntime?.stage,
      cellToScreen: (x: number, z: number) => {
        const rt = game.activeRuntime;
        return rt ? cellToScreen({ x, z }, rt.stage, sceneContext.camera, canvas) : null;
      },
    },
  });
  // M10 検証用: 12×12 盤面を読み込むフック。動的importにより本番bundleには含めない。
  void import('./stage/devStages').then(({ VERIFY_12X12 }) => {
    Object.assign(window, {
      __gameDev: {
        playVerify12: () => game.devLoadStage(VERIFY_12X12, true),
        bgVerify12: () => game.devLoadStage(VERIFY_12X12, false),
      },
    });
  });
}
