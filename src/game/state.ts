import type { Grid } from '../core/grid';
import { connectionsOf, DIR_OFFSET, OPPOSITE } from '../core/panel';
import { findPath } from '../core/path';
import type { StageDef } from '../core/types';
import { gridToWorld } from '../scene/coords';
import { cellToScreen } from '../scene/input';
import type { SceneContext } from '../scene/renderer';
import { createDog, type DogModel } from '../scene/shiba';
import {
  countCollected,
  markCleared,
  registerDog,
  setDogPhoto,
  type SaveData,
} from '../save/storage';
import { DOG_ORDER, DOGS } from '../stage/dogs';
import type { Hud } from '../ui/hud';
import type { Screens } from '../ui/screens';
import type { ZukanView } from '../ui/zukan';
import type { PuzzleController } from './puzzle';
import type { Animator } from './tween';
import { celebrate, headTilt, placeDogAt, walkAlong } from './walk';

export type Phase = 'title' | 'puzzle' | 'walk' | 'encounter' | 'clear';

interface GameDeps {
  sceneContext: SceneContext;
  stage: StageDef;
  grid: Grid;
  puzzle: PuzzleController;
  hud: Hud;
  screens: Screens;
  zukan: ZukanView;
  animator: Animator;
  save: SaveData;
}

/** ゲーム全体の状態機械: TITLE → PUZZLE → WALK → ENCOUNTER → CLEAR */
export class Game {
  private readonly deps: GameDeps;
  private readonly shiba: DogModel;
  private friend: DogModel | null = null;
  private lastPhoto: string | null = null;
  phase: Phase = 'title';

  constructor(deps: GameDeps) {
    this.deps = deps;
    this.shiba = createDog(DOGS['shiba']!.furColor, 1);
    deps.sceneContext.scene.add(this.shiba.group);
    this.resetShiba();
  }

  /** 起動処理: 柴犬のポートレートを図鑑用に撮ってタイトルへ */
  init(): void {
    const { save, sceneContext, stage } = this.deps;
    if (save.zukan['shiba'] && !save.zukan['shiba'].photo) {
      const world = gridToWorld(stage.start.pos, stage);
      setDogPhoto(save, 'shiba', sceneContext.capturePhotoAt(world.x, world.z, 4.2, 320));
    }
    this.toTitle();
  }

  private get startFacing(): { x: number; z: number } {
    const { stage } = this.deps;
    const exitDir = connectionsOf('end', stage.start.rotation)[0]!;
    return DIR_OFFSET[exitDir];
  }

  private resetShiba(): void {
    placeDogAt(this.shiba, this.deps.stage.start.pos, this.deps.stage, this.startFacing);
  }

  private removeFriend(): void {
    if (this.friend) {
      this.deps.sceneContext.scene.remove(this.friend.group);
      this.friend = null;
    }
  }

  toTitle(): void {
    this.phase = 'title';
    this.removeFriend();
    this.deps.puzzle.reset();
    this.deps.puzzle.enabled = false;
    this.deps.hud.setVisible(false);
    this.resetShiba();
    this.deps.screens.showTitle(
      () => this.startPuzzle(),
      () => this.openZukan(),
    );
  }

  startPuzzle(): void {
    this.phase = 'puzzle';
    this.removeFriend();
    this.deps.puzzle.reset();
    this.deps.screens.clear();
    this.resetShiba();
    this.deps.hud.setVisible(true);
    this.deps.puzzle.enabled = true;
    this.deps.hud.showToast('みちパネルで おうちから ゴールまで つなげてね!', 3200);
  }

  openZukan(): void {
    this.deps.zukan.show(this.deps.save, () => {});
  }

  /** 「おさんぽスタート!」 */
  async startWalk(): Promise<void> {
    if (this.phase !== 'puzzle') return;
    const { grid, hud, puzzle, stage, animator } = this.deps;

    const result = findPath(grid);
    this.phase = 'walk';
    puzzle.enabled = false;
    puzzle.selectKind(null);
    hud.setVisible(false);

    if (result.complete) {
      await walkAlong(this.shiba, result.route, stage, this.deps.animator);
      await this.meetFriend();
      return;
    }

    // 失敗: 行けるところまで歩いて、首をかしげて、おうちに戻る
    if (result.route.length > 1) {
      await walkAlong(this.shiba, result.route, stage, animator);
    }
    await headTilt(this.shiba, animator);
    hud.showToast('あれれ? みちが つながって いないみたい', 2800);
    if (result.route.length > 1) {
      await walkAlong(this.shiba, [...result.route].reverse(), stage, animator, 0.2);
    }
    this.resetShiba();
    this.phase = 'puzzle';
    puzzle.enabled = true;
    hud.setVisible(true);
  }

  /** ゴールでの出会い → 記念写真 → 出会いカード */
  private async meetFriend(): Promise<void> {
    const { stage, sceneContext, animator, screens } = this.deps;
    const dogInfo = DOGS[stage.encounterDogId]!;

    // ゴールの「道と反対側」に新しい友だちが現れる
    const roadDir = connectionsOf('end', stage.goal.rotation)[0]!;
    const behindDir = OPPOSITE[roadDir];
    const friendCell = {
      x: stage.goal.pos.x + DIR_OFFSET[behindDir].x,
      z: stage.goal.pos.z + DIR_OFFSET[behindDir].z,
    };
    const facing = DIR_OFFSET[roadDir];

    this.friend = createDog(dogInfo.furColor, dogInfo.scale);
    placeDogAt(this.friend, friendCell, stage, facing);
    // 鳥居などの添景と重ならないよう、ゴール側に少し寄せる
    this.friend.group.position.x += facing.x * 0.45;
    this.friend.group.position.z += facing.z * 0.45;
    this.friend.group.scale.setScalar(0.01);
    sceneContext.scene.add(this.friend.group);

    await animator.run(0.35, (t) => {
      this.friend?.group.scale.setScalar(0.01 + (dogInfo.scale - 0.01) * t);
    });

    // ハート + よろこびジャンプ
    const midX = (stage.goal.pos.x + friendCell.x) / 2;
    const midZ = (stage.goal.pos.z + friendCell.z) / 2;
    const heartAt = cellToScreen(
      { x: midX, z: midZ },
      stage,
      sceneContext.camera,
      sceneContext.renderer.domElement,
    );
    screens.burstHearts(heartAt.x, heartAt.y - 60);
    await Promise.all([celebrate(this.shiba, animator), celebrate(this.friend, animator)]);
    await animator.wait(0.3);

    // 記念写真
    const goalWorld = gridToWorld(stage.goal.pos, stage);
    const friendWorld = gridToWorld(friendCell, stage);
    this.lastPhoto = sceneContext.capturePhotoAt(
      (goalWorld.x + friendWorld.x) / 2,
      (goalWorld.z + friendWorld.z) / 2,
      2.6,
      320,
    );

    this.phase = 'encounter';
    screens.showEncounter(dogInfo, this.lastPhoto, () => this.registerAndClear());
  }

  private registerAndClear(): void {
    const { save, stage, screens } = this.deps;
    registerDog(save, stage.encounterDogId, this.lastPhoto);
    markCleared(save, stage.id);

    this.phase = 'clear';
    screens.showClear(
      countCollected(save),
      DOG_ORDER.length,
      () => this.startPuzzle(),
      () => this.openZukan(),
      () => this.toTitle(),
    );
  }
}
