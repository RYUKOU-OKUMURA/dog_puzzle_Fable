import { connectionsOf, DIR_OFFSET, OPPOSITE, PLAYER_PANEL_KINDS } from '../core/panel';
import { findPath } from '../core/path';
import { findHintTarget } from '../core/solver';
import type { GridPos, PanelKind, StageDef } from '../core/types';
import { posKey } from '../core/types';
import type { SceneContext } from '../scene/renderer';
import { cellToScreen } from '../scene/input';
import { gridToWorld } from '../scene/coords';
import { createDog, type DogModel } from '../scene/shiba';
import {
  countCollected,
  deleteSave,
  deleteV1,
  emptySave,
  ensureShiba,
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
import { WORLDS } from '../stage/catalog';
import {
  clearedCountInWorld,
  isStageUnlocked,
  isWorldUnlocked,
  locateStage,
  nextStageInWorld,
} from '../stage/progress';
import { DOG_ORDER, DOGS } from '../stage/dogs';
import { iconEmoji } from '../ui/icons';
import type { Hud } from '../ui/hud';
import type { ProfilesView } from '../ui/profiles';
import type { Screens } from '../ui/screens';
import type { StageSelectView } from '../ui/stageSelect';
import type { WorldSelectView } from '../ui/worldSelect';
import type { ZukanView } from '../ui/zukan';
import { StageRuntime } from './stageRuntime';
import type { Animator } from './tween';
import { photoZoomForFriendScale } from './photo';
import { firstClearCelebrationFlags } from './clearCelebration';
import { HintGeneration } from './hintGeneration';
import {
  celebrate,
  faceTowardIsometricCamera,
  headTilt,
  placeDogAt,
  sitDown,
  standUp,
  walkAlong,
  walkHeightsForRoute,
} from './walk';

/** しばちゃんヒント: 無操作で発火するまでの秒数 */
const HINT_IDLE_MS = 90_000;
/** お散歩失敗(道未完成・おやつ残り)がこの回数でヒント */
const HINT_FAIL_THRESHOLD = 2;
export type Phase =
  'select' | 'title' | 'worldSelect' | 'stageSelect' | 'puzzle' | 'walk' | 'encounter' | 'clear';

interface GameDeps {
  sceneContext: SceneContext;
  animator: Animator;
  hud: Hud;
  screens: Screens;
  zukan: ZukanView;
  profiles: ProfilesView;
  worldSelect: WorldSelectView;
  stageSelect: StageSelectView;
  canvas: HTMLCanvasElement;
}

/** ゲーム全体の状態機械:
 *  SELECT → TITLE → WORLD_SELECT → STAGE_SELECT → PUZZLE → WALK → ENCOUNTER → CLEAR */
export class Game {
  private readonly deps: GameDeps;
  private readonly shiba: DogModel;
  private friend: DogModel | null = null;
  private lastPhoto: string | null = null;
  private profileId: string | null = null;
  private save: SaveData = emptySave();
  /** いま遊んでいるステージの実行時オブジェクト(ステージ選択で差し替え) */
  private runtime: StageRuntime | null = null;
  /** ステージ選択の「もどる」先のワールド */
  private currentWorldId: string | null = null;
  phase: Phase = 'select';
  /** お散歩失敗回数(ヒント発火用。ステージ入場でリセット) */
  private walkFailCount = 0;
  private idleTimerId: number | null = null;
  /** ヒント演出中は操作・再発火しない */
  private hintPlaying = false;
  /** ヒント演出の世代。resetHintTracking で invalidate し、await 後に stale なら中断 */
  private readonly hintGeneration = new HintGeneration();

  constructor(deps: GameDeps) {
    this.deps = deps;
    this.shiba = createDog(DOGS['shiba']!.furColor, 1);
    deps.sceneContext.scene.add(this.shiba.group);
    // タイトル背景のために最初のステージ(W1-1)を読み込んでおく
    this.loadStage(WORLDS[0]!.stages[0]!);
  }

  /** 開発用フック参照 */
  get activeSave(): SaveData {
    return this.save;
  }

  get activeProfileId(): string | null {
    return this.profileId;
  }

  get activeRuntime(): StageRuntime | null {
    return this.runtime;
  }

  /** クリア済みステージidの集合(進行判定用) */
  private clearedSet(): Set<string> {
    return new Set(Object.keys(this.save.stages).filter((id) => this.save.stages[id]?.cleared));
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

  // ---------- プロフィール選択 ----------

  /** 「だれが あそぶ?」画面 */
  private showSelect(index = loadProfileIndex()): void {
    this.phase = 'select';
    this.removeFriend();
    this.standbyPuzzle();
    this.deps.hud.setVisible(false);
    this.resetShiba();
    this.clearOverlays();
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
    if (!this.profileId || !this.runtime) return;
    const { sceneContext } = this.deps;
    const stage = this.runtime.stage;
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

  // ---------- ステージ実行時 ----------

  /** 指定ステージを読み込み、盤面を実行可能な状態にする(直前のステージは破棄) */
  private loadStage(stage: StageDef): void {
    this.runtime?.dispose();
    this.runtime = new StageRuntime(stage, {
      sceneContext: this.deps.sceneContext,
      hud: this.deps.hud,
      canvas: this.deps.canvas,
    });
    // 盤面サイズに合わせてカメラ表示範囲と影を合わせる(M10。8×8は現状の見た目不変)
    this.deps.sceneContext.fitToStage(stage.size.w, stage.size.h);
    this.deps.hud.updateStageName(stage.name);
    // palette 未指定は全種。ステージ切替時は選択も解除(非表示種に選択が残らないように)
    this.deps.hud.updatePalette(stage.palette ?? PLAYER_PANEL_KINDS);
    this.runtime.puzzle.selectKind(null);
    this.resetShiba();
  }

  /** パズルを操作不能にして盤面をリセット(選択画面へ出る前の片付け) */
  private standbyPuzzle(): void {
    if (!this.runtime) return;
    this.runtime.reset();
    this.runtime.puzzle.enabled = false;
  }

  /** 全画面系DOMオーバーレイを片付ける(Screens と ワールド/ステージ選択の3系統を消す) */
  private clearOverlays(): void {
    this.deps.screens.clear();
    this.deps.worldSelect.hide();
    this.deps.stageSelect.hide();
  }

  private resetShiba(): void {
    const runtime = this.runtime;
    if (!runtime) return;
    const stage = runtime.stage;
    const exitDir = connectionsOf('end', stage.start.rotation)[0]!;
    placeDogAt(this.shiba, stage.start.pos, stage, DIR_OFFSET[exitDir]);
  }

  private removeFriend(): void {
    if (this.friend) {
      this.deps.sceneContext.scene.remove(this.friend.group);
      this.friend = null;
    }
  }

  // ---------- タイトル → ワールド/ステージ選択 ----------

  toTitle(): void {
    this.phase = 'title';
    this.removeFriend();
    this.standbyPuzzle();
    this.deps.hud.setVisible(false);
    this.clearOverlays();
    this.deps.profiles.hide();
    this.resetShiba();
    this.deps.screens.showTitle(
      () => this.showWorldSelect(),
      () => this.openZukan(),
      this.activeProfileChip(),
      () => this.showSelect(),
    );
  }

  /** ワールド選択画面(世界地図風) */
  private showWorldSelect(): void {
    this.phase = 'worldSelect';
    this.removeFriend();
    this.standbyPuzzle();
    this.deps.hud.setVisible(false);
    this.resetShiba();
    this.clearOverlays();
    const cleared = this.clearedSet();
    this.deps.worldSelect.show(
      WORLDS.map((world) => ({
        id: world.id,
        nameHtml: world.nameHtml,
        emoji: world.emoji,
        sub: world.sub,
        unlocked: isWorldUnlocked(WORLDS, world.id, cleared),
        implemented: world.stages.length > 0,
        clearedCount: clearedCountInWorld(world, cleared),
        total: world.stages.length,
      })),
      {
        onPick: (worldId) => this.enterWorld(worldId),
        onBack: () => this.toTitle(),
      },
    );
  }

  /** 選ばれたワールドのステージ選択へ(未解放は念のため弾く) */
  private enterWorld(worldId: string): void {
    if (!isWorldUnlocked(WORLDS, worldId, this.clearedSet())) return;
    this.showStageSelect(worldId);
  }

  /** ステージ選択画面(4ステージ + 🦴 + クリア済み + ロック) */
  private showStageSelect(worldId: string): void {
    const world = WORLDS.find((w) => w.id === worldId);
    if (!world) return;
    this.currentWorldId = worldId;
    this.phase = 'stageSelect';
    this.removeFriend();
    this.standbyPuzzle();
    this.deps.hud.setVisible(false);
    this.resetShiba();
    this.clearOverlays();
    const cleared = this.clearedSet();
    this.deps.stageSelect.show(
      { nameHtml: world.nameHtml, emoji: world.emoji, sub: world.sub },
      world.stages.map((stage, ordinal) => ({
        id: stage.id,
        name: stage.name,
        difficulty: stage.difficulty ?? 1,
        cleared: cleared.has(stage.id),
        unlocked: isStageUnlocked(world, ordinal, cleared),
        ordinal: ordinal + 1,
      })),
      {
        onPick: (stageId) => this.enterStage(stageId),
        onBack: () => this.showWorldSelect(),
      },
    );
  }

  /** 選ばれたステージを読み込んでパズル開始(未解放は念のため弾く) */
  private enterStage(stageId: string): void {
    const loc = locateStage(WORLDS, stageId);
    if (!loc) return;
    if (!isStageUnlocked(loc.world, loc.ordinal, this.clearedSet())) return;
    this.loadStage(loc.stage);
    this.startPuzzle();
  }

  // ---------- パズルフェーズ ----------

  startPuzzle(): void {
    if (!this.runtime) return;
    this.phase = 'puzzle';
    this.removeFriend();
    this.runtime.reset();
    this.clearOverlays();
    this.resetShiba();
    this.resetHintTracking();
    this.runtime.puzzle.onUserAction = () => this.onPuzzleAction();
    this.deps.hud.setVisible(true);
    this.runtime.puzzle.enabled = true;
    this.deps.hud.showToast('みちパネルで おうちから ゴールまで つなげてね!', 3200);
    this.armIdleTimer();
  }

  /** HUD経由の操作を現在のステージへ流す(ステージ差し替えに追従させるため Game を経由) */
  onSelectPanel(kind: PanelKind | null): void {
    this.runtime?.puzzle.selectKind(kind);
  }

  onRotatePanel(pos: GridPos): void {
    this.runtime?.puzzle.rotatePanel(pos);
  }

  onRemovePanel(pos: GridPos): void {
    this.runtime?.puzzle.removePanel(pos);
  }

  /** パズル中の「もどる」→ ステージ選択へ(配置は保存されないので途中退出でも安心) */
  onExitPuzzle(): void {
    this.resetHintTracking();
    this.showStageSelect(this.currentWorldId ?? WORLDS[0]!.id);
  }

  openZukan(): void {
    this.deps.zukan.show(this.save, () => {});
  }

  // ---------- しばちゃんヒント ----------

  private resetHintTracking(): void {
    this.hintGeneration.invalidate();
    this.walkFailCount = 0;
    this.hintPlaying = false;
    this.clearIdleTimer();
    this.deps.animator.cancelAll();
    this.runtime?.town.setHintSlot(null);
  }

  private clearIdleTimer(): void {
    if (this.idleTimerId !== null) {
      window.clearTimeout(this.idleTimerId);
      this.idleTimerId = null;
    }
  }

  private armIdleTimer(): void {
    this.clearIdleTimer();
    if (this.phase !== 'puzzle' || this.hintPlaying) return;
    this.idleTimerId = window.setTimeout(() => {
      void this.tryFireHint();
    }, HINT_IDLE_MS);
  }

  private onPuzzleAction(): void {
    if (this.phase !== 'puzzle' || this.hintPlaying) return;
    this.armIdleTimer();
  }

  /**
   * ヒント1回分。
   * - place: 正解ルート上の空きへ歩き、ちょこんと座り、マスを光らせる
   * - remove: 誤配置マスへ歩き、首をかしげて「はずしてね」と伝える
   * UIボタンは置かない。ペナルティなし。演出中に「もどる」されたら世代不一致で中断する。
   */
  private async tryFireHint(): Promise<void> {
    if (this.phase !== 'puzzle' || !this.runtime || this.hintPlaying) return;
    const hint = findHintTarget(this.runtime.grid);
    if (!hint) {
      this.armIdleTimer();
      return;
    }

    const gen = this.hintGeneration.token();
    this.hintPlaying = true;
    this.clearIdleTimer();
    const { puzzle, town, stage } = this.runtime;
    const { animator, hud } = this.deps;
    puzzle.enabled = false;
    puzzle.selectKind(null);

    const isStale = (): boolean => this.hintGeneration.isStale(gen);
    const abortHint = (): void => {
      // 古い town への光解除は dispose 後でも無害。新しい runtime には触れない
      town.setHintSlot(null);
      this.hintPlaying = false;
    };

    const from = stage.start.pos;
    this.resetShiba();
    if (posKey(from) !== posKey(hint.pos)) {
      await walkAlong(
        this.shiba,
        [from, hint.pos],
        stage,
        animator,
        0.38,
        undefined,
        undefined,
        isStale,
      );
      if (isStale()) {
        abortHint();
        return;
      }
    }

    if (hint.kind === 'remove') {
      town.setHintSlot(hint.pos, 'remove');
      town.flashHintSlot(hint.pos);
      hud.showToast('この パネル、いちど はずして みようよ', 3000);
      await headTilt(this.shiba, animator);
      if (isStale()) {
        abortHint();
        return;
      }
    } else {
      await sitDown(this.shiba, animator);
      if (isStale()) {
        abortHint();
        return;
      }
      town.setHintSlot(hint.pos, 'place');
      town.flashHintSlot(hint.pos);
      await animator.wait(1.0);
      if (isStale()) {
        abortHint();
        return;
      }
      await standUp(this.shiba, animator);
      if (isStale()) {
        abortHint();
        return;
      }
    }

    if (posKey(from) !== posKey(hint.pos)) {
      await walkAlong(
        this.shiba,
        [hint.pos, from],
        stage,
        animator,
        0.28,
        undefined,
        undefined,
        isStale,
      );
      if (isStale()) {
        abortHint();
        return;
      }
    }
    this.resetShiba();

    this.hintPlaying = false;
    // 退出後に古い puzzle を再有効化しない(runtime が差し替わっていれば触らない)
    if (this.phase === 'puzzle' && this.runtime?.puzzle === puzzle) {
      puzzle.enabled = true;
      this.armIdleTimer();
    }
  }

  /**
   * 「おさんぽスタート!」
   * 判定は3通り:
   *  (1) 完成(全おやつ通過ルートでゴール) → お散歩→出会い
   *  (2) 道未完成(ゴールへ届かない) → 途中まで歩いて首かしげ(従来挙動)
   *  (3) おやつ残り(ゴールへ届くがおやつを取りこぼす) → お散歩に出ず、おやつを強調
   */
  async startWalk(): Promise<void> {
    if (this.phase !== 'puzzle' || !this.runtime || this.hintPlaying) return;
    const { grid, stage, puzzle, treats } = this.runtime;
    const { hud, animator } = this.deps;

    this.clearIdleTimer();
    const result = findPath(grid);
    this.phase = 'walk';
    puzzle.enabled = false;
    puzzle.selectKind(null);
    hud.setVisible(false);

    if (result.complete) {
      this.resetHintTracking();
      // クリア: 全おやつを通るルートを歩く。通ったマスのおやつを「ぱくっ」と食べる
      const remaining = treats.remainingKeys();
      const eatIfTreat = (cell: GridPos): Promise<void> | void => {
        const key = posKey(cell);
        if (remaining.has(key)) {
          remaining.delete(key);
          return treats.eatAt(cell, animator);
        }
      };
      // route[0](スタート)は walkAlong の onArrive が発火しないため、歩き出しに食べる
      if (result.route.length > 0) await eatIfTreat(result.route[0]!);
      const heights = walkHeightsForRoute(grid, result.route);
      await walkAlong(
        this.shiba,
        result.route,
        stage,
        animator,
        0.42,
        (cell) => eatIfTreat(cell),
        heights,
      );
      await this.meetFriend();
      return;
    }

    if (!result.goalReachable) {
      // (2) 道未完成: 行けるところまで歩いて、首をかしげて、おうちに戻る
      if (result.route.length > 1) {
        const heights = walkHeightsForRoute(grid, result.route);
        await walkAlong(this.shiba, result.route, stage, animator, 0.42, undefined, heights);
      }
      await headTilt(this.shiba, animator);
      hud.showToast('あれれ? みちが つながって いないみたい', 2800);
      if (result.route.length > 1) {
        const back = [...result.route].reverse();
        const backHeights = walkHeightsForRoute(grid, back);
        await walkAlong(this.shiba, back, stage, animator, 0.2, undefined, backHeights);
      }
      this.resetShiba();
    } else {
      // (3) おやつ残り: お散歩には出ず、おやつをやわらかく強調して知らせる。盤面はそのまま
      await treats.wiggle(animator);
      hud.showToast('おやつが のこってるよ! ぜんぶ とってね', 3000);
    }

    this.walkFailCount += 1;
    this.phase = 'puzzle';
    puzzle.enabled = true;
    hud.setVisible(true);
    if (this.walkFailCount >= HINT_FAIL_THRESHOLD) {
      this.walkFailCount = 0;
      await this.tryFireHint();
    } else {
      this.armIdleTimer();
    }
  }

  /** ゴールでの出会い → 記念写真 → 出会いカード */
  private async meetFriend(): Promise<void> {
    const { sceneContext, animator, screens } = this.deps;
    const stage = this.runtime!.stage;
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

    // 撮影直前に2匹をカメラ正面(アイソメ4方位)へ向ける
    faceTowardIsometricCamera(this.shiba);
    faceTowardIsometricCamera(this.friend);

    // 記念写真(ゴールと友犬マスの中点。zoom は友犬 scale で補正)
    const goalWorld = gridToWorld(stage.goal.pos, stage);
    const friendWorld = gridToWorld(friendCell, stage);
    this.lastPhoto = sceneContext.capturePhotoAt(
      (goalWorld.x + friendWorld.x) / 2,
      (goalWorld.z + friendWorld.z) / 2,
      photoZoomForFriendScale(dogInfo.scale),
      320,
    );

    this.phase = 'encounter';
    screens.showEncounter(dogInfo, this.lastPhoto, () => this.registerAndClear());
  }

  private registerAndClear(): void {
    if (!this.runtime || !this.profileId) return;
    const { screens } = this.deps;
    const stage = this.runtime.stage;
    // 演出のエッジ判定用: 登録・クリア記録の「前」の状態を取る
    const beforeCollected = countCollected(this.save);
    const wasStageCleared = this.save.stages[stage.id]?.cleared === true;
    // プロフィール未選択でここへ来ることはないが、型安全性のために抜ける(上でガード済み)
    registerDog(this.profileId, this.save, stage.encounterDogId, this.lastPhoto);
    markCleared(this.profileId, this.save, stage.id);

    this.phase = 'clear';
    const next = nextStageInWorld(WORLDS, stage.id);
    const backWorldId = this.currentWorldId ?? WORLDS[0]!.id;
    const collected = countCollected(this.save);
    const total = DOG_ORDER.length;
    const { zukanComplete, worldFinale } = firstClearCelebrationFlags({
      beforeCollected,
      afterCollected: collected,
      totalDogs: total,
      stageId: stage.id,
      wasStageCleared,
    });

    screens.showClear(
      collected,
      total,
      next !== null,
      () => this.goNextStage(),
      () => this.openZukan(),
      () => this.showStageSelect(backWorldId),
      { zukanComplete, worldFinale },
    );
  }

  /** クリア後「つぎのステージへ」: 同ワールドの次があれば突入、なければステージ選択へ */
  private goNextStage(): void {
    if (!this.runtime) return;
    const next = nextStageInWorld(WORLDS, this.runtime.stage.id);
    if (!next) {
      this.showStageSelect(this.currentWorldId ?? WORLDS[0]!.id);
      return;
    }
    this.loadStage(next.stage);
    this.startPuzzle();
  }

  /**
   * 開発限定: カタログ外の任意ステージをロードする(M10 検証用。本番フローからは呼ばれない)。
   * startPuzzle=true でパズル開始(タップ・お散歩・写真まで通せる)。false は背景表示のみ。
   */
  devLoadStage(stage: StageDef, startPuzzle: boolean): void {
    this.loadStage(stage);
    if (startPuzzle) this.startPuzzle();
  }

  /**
   * 開発限定: 全ステージクリア + 図鑑全犬種登録のダミーセーブを現プロフィールへ書き込む。
   * 写真は null(プレースホルダ)。ワールド解放確認や M11 通し確認用。
   * 現プロフィールの実セーブを復元不可で上書きする(開発用・本番プレイでは使わない)。
   */
  devUnlockAll(): boolean {
    if (!this.profileId) return false;
    const save = emptySave();
    ensureShiba(save);
    const now = new Date().toISOString();
    for (const world of WORLDS) {
      for (const stage of world.stages) {
        save.stages[stage.id] = { cleared: true };
        if (!save.zukan[stage.encounterDogId]) {
          save.zukan[stage.encounterDogId] = { metAt: now, photo: null };
        }
      }
    }
    this.save = save;
    persistSave(this.profileId, save);
    this.showWorldSelect();
    return true;
  }
}
