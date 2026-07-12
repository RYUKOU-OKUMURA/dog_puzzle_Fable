import type { GridPos, StageDef } from '../core/types';
import { gridToWorld } from '../scene/coords';
import type { DogModel } from '../scene/shiba';
import { Animator, easeInOut, shortestAngleTarget } from './tween';

const TURN_SECONDS = 0.14;

/**
 * ルートのセル列に沿って犬をテクテク歩かせる。
 * onArrive は各マスへ到着した直後(そのマスの移動完了後)に呼ぶ。おやつを食べる演出等に使う。
 */
export async function walkAlong(
  dog: DogModel,
  route: GridPos[],
  stage: StageDef,
  animator: Animator,
  secondsPerCell = 0.42,
  onArrive?: (cell: GridPos) => Promise<void> | void,
): Promise<void> {
  for (let i = 1; i < route.length; i++) {
    const from = gridToWorld(route[i - 1]!, stage);
    const to = gridToWorld(route[i]!, stage);
    const dx = to.x - from.x;
    const dz = to.z - from.z;

    // 進行方向へ向き直る(モデルは回転0で +z を向く)
    const currentAngle = dog.group.rotation.y;
    const targetAngle = shortestAngleTarget(currentAngle, Math.atan2(dx, dz));
    if (Math.abs(targetAngle - currentAngle) > 0.01) {
      await animator.run(TURN_SECONDS, (t) => {
        dog.group.rotation.y = currentAngle + (targetAngle - currentAngle) * easeInOut(t);
      });
    }

    // 1マスぶん移動 + 上下の弾みで「テクテク感」
    await animator.run(secondsPerCell, (t) => {
      dog.group.position.x = from.x + dx * t;
      dog.group.position.z = from.z + dz * t;
      dog.group.position.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.06;
      dog.group.rotation.z = Math.sin(t * Math.PI * 4) * 0.045;
    });

    if (onArrive) await onArrive(route[i]!);
  }
  dog.group.position.y = 0;
  dog.group.rotation.z = 0;
}

/** 失敗したとき: 立ち止まって首をかしげる(やさしいフィードバック) */
export async function headTilt(dog: DogModel, animator: Animator): Promise<void> {
  const tilt = 0.45;
  await animator.run(0.25, (t) => {
    dog.head.rotation.z = tilt * easeInOut(t);
  });
  await animator.wait(0.5);
  await animator.run(0.35, (t) => {
    dog.head.rotation.z = tilt - 2 * tilt * easeInOut(t);
  });
  await animator.wait(0.5);
  await animator.run(0.25, (t) => {
    dog.head.rotation.z = -tilt + tilt * easeInOut(t);
  });
  dog.head.rotation.z = 0;
}

/** ゴールしたとき: ぴょんぴょんジャンプしてよろこぶ */
export async function celebrate(dog: DogModel, animator: Animator): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await animator.run(0.38, (t) => {
      dog.group.position.y = Math.sin(t * Math.PI) * 0.28;
    });
  }
  //最後にくるっと一回転
  const start = dog.group.rotation.y;
  await animator.run(0.5, (t) => {
    dog.group.rotation.y = start + Math.PI * 2 * easeInOut(t);
    dog.group.position.y = Math.sin(t * Math.PI) * 0.2;
  });
  dog.group.rotation.y = start;
  dog.group.position.y = 0;
}

/** 犬をマスの中心に置く(向きは facing 方向) */
export function placeDogAt(
  dog: DogModel,
  pos: GridPos,
  stage: StageDef,
  facing: { x: number; z: number },
): void {
  const world = gridToWorld(pos, stage);
  dog.group.position.set(world.x, 0, world.z);
  dog.group.rotation.set(0, Math.atan2(facing.x, facing.z), 0);
  dog.head.rotation.z = 0;
}

/**
 * 固定アイソメカメラ(offset 10,10,10)へ向けて、最も近いアイソメ4方位へ向ける。
 * カメラ角度自体は変えず、記念写真直前の見た目だけ整える。
 */
const ISO_CAMERA_YAWS = [
  Math.PI / 4, // カメラ正面 (+x, +z)
  (3 * Math.PI) / 4,
  (-3 * Math.PI) / 4,
  -Math.PI / 4,
] as const;

export function faceTowardIsometricCamera(dog: DogModel): void {
  // renderer.ts の CAMERA_OFFSET (10,10,10) と同じ水平方向
  const towardCamera = Math.atan2(10, 10);
  let best = ISO_CAMERA_YAWS[0];
  let bestDiff = Infinity;
  for (const yaw of ISO_CAMERA_YAWS) {
    const diff = Math.abs(shortestAngleTarget(towardCamera, yaw) - towardCamera);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = yaw;
    }
  }
  dog.group.rotation.y = best;
}
