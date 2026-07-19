import type * as THREE from 'three';
import type { GridPos, StageDef } from '../core/types';
import { gridToWorld } from '../scene/coords';
import { disposeObject } from '../scene/dispose';
import type { DogModel } from '../scene/shiba';
import { buildBird, buildButterfly } from '../scene/walkProps';
import { gentleBark, spinOnce } from './walk';
import { Animator, easeInOut, shortestAngleTarget } from './tween';

export type WalkEventKind = 'butterfly' | 'pondStop' | 'bird';

export interface WalkEventPlan {
  kind: WalkEventKind;
  cell: GridPos;
}

/** 成功お散歩1回あたりのイベント発生率 */
export const WALK_EVENT_CHANCE = 0.18;

/** マンハッタン距離1以内に池添景があるか(game 層の判定。scene に置かない) */
export function isAdjacentToPond(cell: GridPos, stage: StageDef): boolean {
  for (const scenery of stage.scenery) {
    if (scenery.kind !== 'pond') continue;
    const dist = Math.abs(scenery.pos.x - cell.x) + Math.abs(scenery.pos.z - cell.z);
    if (dist <= 1) return true;
  }
  return false;
}

/** ルート上の中間マス(スタート・ゴール除く) */
export function middleRouteCells(route: GridPos[]): GridPos[] {
  if (route.length < 3) return [];
  return route.slice(1, -1);
}

/** ルート開始時に1回だけ抽選し、発生するイベントを決める */
export function planWalkEvent(
  route: GridPos[],
  stage: StageDef,
  random: () => number = Math.random,
): WalkEventPlan | null {
  if (random() >= WALK_EVENT_CHANCE) return null;

  const middle = middleRouteCells(route);
  if (middle.length === 0) return null;

  const pondCells = middle.filter((cell) => isAdjacentToPond(cell, stage));
  if (pondCells.length > 0) {
    const cell = pondCells[Math.floor(random() * pondCells.length)]!;
    return { kind: 'pondStop', cell };
  }

  const kind: WalkEventKind = random() < 0.5 ? 'butterfly' : 'bird';
  const cell = middle[Math.floor(random() * middle.length)]!;
  return { kind, cell };
}

export interface WalkEventSession {
  maybePlayAtCell(
    cell: GridPos,
    dog: DogModel,
    stage: StageDef,
    animator: Animator,
    scene: THREE.Scene,
  ): Promise<void>;
}

/** 1回の成功お散歩用セッション(最大1イベント) */
export function createWalkEventSession(
  route: GridPos[],
  stage: StageDef,
  random: () => number = Math.random,
): WalkEventSession {
  const plan = planWalkEvent(route, stage, random);
  let played = false;

  return {
    async maybePlayAtCell(cell, dog, stageDef, animator, scene) {
      if (played || !plan) return;
      if (plan.cell.x !== cell.x || plan.cell.z !== cell.z) return;
      played = true;
      await playWalkEvent(plan.kind, dog, stageDef, animator, scene);
    },
  };
}

async function playWalkEvent(
  kind: WalkEventKind,
  dog: DogModel,
  stage: StageDef,
  animator: Animator,
  scene: THREE.Scene,
): Promise<void> {
  switch (kind) {
    case 'butterfly':
      await playButterflyEvent(dog, animator, scene);
      break;
    case 'pondStop':
      await playPondStopEvent(dog, stage, animator);
      break;
    case 'bird':
      await playBirdEvent(dog, animator, scene);
      break;
  }
}

async function playButterflyEvent(
  dog: DogModel,
  animator: Animator,
  scene: THREE.Scene,
): Promise<void> {
  const butterfly = buildButterfly();
  const forwardX = Math.sin(dog.group.rotation.y);
  const forwardZ = Math.cos(dog.group.rotation.y);
  butterfly.position.set(
    dog.group.position.x + forwardX * 0.35,
    dog.group.position.y + 0.35,
    dog.group.position.z + forwardZ * 0.35,
  );
  scene.add(butterfly);

  const wingL = butterfly.getObjectByName('wingL');
  const wingR = butterfly.getObjectByName('wingR');

  const flutter = (async () => {
    for (let i = 0; i < 8; i++) {
      await animator.run(0.08, (t) => {
        const flap = 0.4 * Math.sin(t * Math.PI);
        if (wingL) wingL.rotation.z = flap;
        if (wingR) wingR.rotation.z = -flap;
      });
    }
  })();

  await Promise.all([flutter, spinOnce(dog, animator)]);

  scene.remove(butterfly);
  disposeObject(butterfly);
}

async function playPondStopEvent(
  dog: DogModel,
  stage: StageDef,
  animator: Animator,
): Promise<void> {
  await faceTowardNearestPond(dog, stage, animator);
  await animator.wait(0.7);
}

async function playBirdEvent(
  dog: DogModel,
  animator: Animator,
  scene: THREE.Scene,
): Promise<void> {
  const bird = buildBird();
  bird.position.set(
    dog.group.position.x + 0.3,
    dog.group.position.y + 0.55,
    dog.group.position.z - 0.2,
  );
  scene.add(bird);

  await gentleBark(dog, animator);
  await animator.wait(0.2);

  scene.remove(bird);
  disposeObject(bird);
}

/** いちばん近い池の方向へ向き直す */
async function faceTowardNearestPond(
  dog: DogModel,
  stage: StageDef,
  animator: Animator,
): Promise<void> {
  const dogGrid = {
    x: Math.round(dog.group.position.x + (stage.size.w - 1) / 2),
    z: Math.round(dog.group.position.z + (stage.size.h - 1) / 2),
  };

  let nearest: GridPos | null = null;
  let minDist = Infinity;
  for (const scenery of stage.scenery) {
    if (scenery.kind !== 'pond') continue;
    const dist =
      Math.abs(scenery.pos.x - dogGrid.x) + Math.abs(scenery.pos.z - dogGrid.z);
    if (dist <= 1 && dist < minDist) {
      minDist = dist;
      nearest = scenery.pos;
    }
  }
  if (!nearest) return;

  const from = gridToWorld(dogGrid, stage);
  const to = gridToWorld(nearest, stage);
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const currentAngle = dog.group.rotation.y;
  const targetAngle = shortestAngleTarget(currentAngle, Math.atan2(dx, dz));
  await animator.run(0.2, (t) => {
    dog.group.rotation.y = currentAngle + (targetAngle - currentAngle) * easeInOut(t);
  });
}
