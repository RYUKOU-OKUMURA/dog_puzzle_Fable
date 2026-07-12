import * as THREE from 'three';
import type { GridPos, StageDef } from '../core/types';
import { gridToWorld } from './coords';

const TAP_MOVE_LIMIT = 10; // px
const TAP_TIME_LIMIT = 600; // ms

/**
 * タップ(クリック)されたマスを検出してコールバックする。
 * ドラッグやピンチと区別するため、指の移動が小さいときだけタップ扱い。
 */
export function attachCellTapListener(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  cellTiles: THREE.Object3D[],
  onTap: (pos: GridPos) => void,
): () => void {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt: { x: number; y: number; time: number } | null = null;

  function onPointerDown(event: PointerEvent): void {
    downAt = { x: event.clientX, y: event.clientY, time: performance.now() };
  }

  function onPointerUp(event: PointerEvent): void {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    const elapsed = performance.now() - downAt.time;
    downAt = null;
    if (moved > TAP_MOVE_LIMIT || elapsed > TAP_TIME_LIMIT) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(cellTiles, false);
    const cell = hits[0]?.object.userData.cell as GridPos | undefined;
    if (cell) onTap(cell);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointerup', onPointerUp);
  };
}

/** マスの中心のスクリーン座標(CSSピクセル)。ポップアップの位置決め用 */
export function cellToScreen(
  pos: GridPos,
  stage: StageDef,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const world = gridToWorld(pos, stage);
  const projected = new THREE.Vector3(world.x, 0.2, world.z).project(camera);
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + ((projected.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - projected.y) / 2) * rect.height,
  };
}
