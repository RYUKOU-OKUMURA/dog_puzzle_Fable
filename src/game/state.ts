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
  deleteSave,
  deleteV1,
  emptySave,
  loadProfileIndex,
  loadSave,
  markCleared,
  persistProfileIndex,
  persistSave,
  readV1Raw,
  registerDog,
  setDogPhoto,
  type SaveData,
} from '../save/storage';
import {
  addProfile,
  createProfile,
  findProfile,
  migrateFromV1,
  nextProfileId,
  removeProfile,
  updateProfile,
  type ProfileIconId,
} from '../save/profiles';
import { DOG_ORDER, DOGS } from '../stage/dogs';
import { iconEmoji } from '../ui/icons';
import type { Hud } from '../ui/hud';
import type { ProfilesView } from '../ui/profiles';
import type { Screens } from '../ui/screens';
import type { ZukanView } from '../ui/zukan';
import type { PuzzleController } from './puzzle';
import type { Animator } from './tween';
import { celebrate, headTilt, placeDogAt, walkAlong } from './walk';

export type Phase = 'select' | 'title' | 'puzzle' | 'walk' | 'encounter' | 'clear';

interface GameDeps {
  sceneContext: SceneContext;
  stage: StageDef;
  grid: Grid;
  puzzle: PuzzleController;
  hud: Hud;
  screens: Screens;
  zukan: ZukanView;
  profiles: ProfilesView;
  animator: Animator;
}

/** ゲーム全体の状態機械: SELECT → TITLE → PUZZLE → WALK → ENCOUNTER → CLEAR */
export class Game {
  private readonly deps: GameDeps;
  private readonly shiba: DogModel;
  private friend: DogModel | null = null;
  private lastPhoto: string | null = null;
  private profileId: string | null = null;
  private save: SaveData = emptySave();
  phase: Phase = 'select';

  constructor(deps: GameDeps) {
    this.deps = deps;
    this.shiba = createDog(DOGS['shiba']!.furColor, 1);
    deps.sceneContext.scene.add(this.shiba.group);
    this.resetShiba();
  }

  /** 開発用フック参照 */
  get activeSave(): SaveData {
    return this.save;
  }

  get activeProfileId(): string | null {
    return this.profileId;
  }

  /**
   * 起動処理。プロフィール一覧を読み込み、初回(プロフィール0件)で v1 セーブがあれば
 * 最初のプロフィールへ自動移行したうえで「だれが あそぶ?」画面へ。
 */
  boot(): void {
    let index = loadProfileIndex();
    if (index.profiles.length === 0) {
      const migration = migrateFromV1(readV1Raw(), new Date().toISOString());
      if (migration) {
        // 移行データを最初のプロフィールへ保存するが、誰が遊ぶかは本人にえらばせる
        // (activeId は置かない → 選択画面でタップしてはじめてセーブを読む)
        index = {
          ...index,
          profiles: addProfile(index.profiles, migration.profile),
        };
        // 移行先の保存が両方成功したことを確認してから v1 を消す(保存できずに元だけ消す事故を防ぐ)
        const indexOk = persistProfileIndex(index);
        const saveOk = persistSave(migration.profile.id, migration.save);
        if (indexOk && saveOk) deleteV1();
      }
    }
    this.showSelect(index);
  }

  /** 「だれが あそぶ?」画面 */
  private showSelect(index = loadProfileIndex()): void {
    this.phase = 'select';
    this.removeFriend();
    this.deps.puzzle.reset();
    this.deps.puzzle.enabled = false;
    this.deps.hud.setVisible(false);
    this.resetShiba();
    this.deps.screens.clear();
    this.deps.profiles.show(
      { profiles: index.profiles, activeId: index.activeId },
      {
        onSelect: (id) => this.selectProfile(id),
        onCreate: (name, iconId) => this.createProfile(name, iconId),
        onUpdate: (id, name, iconId) => this.updateProfile(id, name, iconId),
        onDelete: (id) => this.deleteProfile(id),
        onBack: () => this.toTitle(),
      },
    );
  }

  /** プロフィールをえらんで遊ぶ: セーブを読み込み、柴犬写真を保証してタイトルへ */
  private selectProfile(id: string): void {
    const index = loadProfileIndex();
    persistProfileIndex({ ...index, activeId: id });
    this.profileId = id;
    this.save = loadSave(id);
    this.ensureShibaPhoto();
    this.toTitle();
  }

  /** あたらしいプロフィールをつくり、その子で遊び始める */
  private createProfile(name: string, iconId: ProfileIconId): void {
    const index = loadProfileIndex();
    const id = nextProfileId(index.profiles.map((p) => p.id));
    const profile = createProfile({
      id,
      name,
      iconId,
      createdAt: new Date().toISOString(),
    });
    persistProfileIndex({ ...index, profiles: addProfile(index.profiles, profile) });
    // 新規プロフィールのセーブ枠を空で確定する。
    // 削除失敗などで残留した別人の save:v2:<id> を loadSave が読んでしまうのを防ぐ。
    persistSave(id, emptySave());
    this.selectProfile(id);
  }

  /** なまえ/アイコンをなおして選択画面に戻る */
  private updateProfile(id: string, name: string, iconId: ProfileIconId): void {
    const index = loadProfileIndex();
    const profiles = updateProfile(index.profiles, id, { name, iconId });
    persistProfileIndex({ ...index, profiles });
    this.deps.profiles.refresh({ profiles, activeId: index.activeId });
  }

  /** プロフィールをけす(セーブも一緒に) */
  private deleteProfile(id: string): void {
    const index = loadProfileIndex();
    const profiles = removeProfile(index.profiles, id);
    const activeId = index.activeId === id ? null : index.activeId;
    persistProfileIndex({ ...index, profiles, activeId });
    deleteSave(id);
    if (this.profileId === id) {
      this.profileId = null;
      this.save = emptySave();
    }
    this.deps.profiles.refresh({ profiles, activeId });
  }

  /** 選択中プロフィールのタイトル表示用データ(なければnull) */
  private activeProfileChip(): { name: string; emoji: string } | null {
    if (!this.profileId) return null;
    const profile = findProfile(loadProfileIndex().profiles, this.profileId);
    return profile ? { name: profile.name, emoji: iconEmoji(profile.iconId) } : null;
  }

  /** 相棒の柴犬のポートレートを図鑑用に撮る(プロフィール選択ごとに未撮影なら) */
  private ensureShibaPhoto(): void {
    if (!this.profileId) return;
    const { sceneContext, stage } = this.deps;
    const entry = this.save.zukan['shiba'];
    if (entry && !entry.photo) {
      const world = gridToWorld(stage.start.pos, stage);
      setDogPhoto(
        this.profileId,
        this.save,
        'shiba',
        sceneContext.capturePhotoAt(world.x, world.z, 4.2, 320),
      );
    }
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
    this.deps.profiles.hide();
    this.resetShiba();
    this.deps.screens.showTitle(
      () => this.startPuzzle(),
      () => this.openZukan(),
      this.activeProfileChip(),
      () => this.showSelect(),
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
    this.deps.zukan.show(this.save, () => {});
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
    const { stage, screens } = this.deps;
    // プロフィール未選択でここへ来ることはないが、型安全性のために抜ける
    if (!this.profileId) return;
    registerDog(this.profileId, this.save, stage.encounterDogId, this.lastPhoto);
    markCleared(this.profileId, this.save, stage.id);

    this.phase = 'clear';
    screens.showClear(
      countCollected(this.save),
      DOG_ORDER.length,
      () => this.startPuzzle(),
      () => this.openZukan(),
      () => this.toTitle(),
    );
  }
}
