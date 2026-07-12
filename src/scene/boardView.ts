import * as THREE from 'three';
import type { Grid } from '../core/grid';
import type { GridPos, StageDef } from '../core/types';
import { posKey } from '../core/types';
import { gridToWorld } from './coords';
import { disposeObject } from './dispose';
import { createPanelMesh } from './panelMesh';

/**
 * プレイヤーが置いた道パネルの3D表示を盤面状態と同期させる。
 * (固定道路は town.ts が最初に一度だけ描く)
 */
export class BoardView {
  private readonly parent: THREE.Object3D;
  private readonly stage: StageDef;
  private readonly meshes = new Map<string, THREE.Group>();
  private preview: THREE.Group | null = null;

  constructor(parent: THREE.Object3D, stage: StageDef) {
    this.parent = parent;
    this.stage = stage;
  }

  /** 指定マスの表示を Grid の状態に合わせて作り直す */
  refresh(grid: Grid, pos: GridPos): void {
    const key = posKey(pos);
    const existing = this.meshes.get(key);
    if (existing) {
      this.parent.remove(existing);
      // 回転・取り外し→再配置で古いメッシュのジオメトリ/マテリアルも解放する
      disposeObject(existing);
      this.meshes.delete(key);
    }

    const panel = grid.panelAt(pos);
    if (!panel || panel.fixed) return;

    const mesh = createPanelMesh(panel.kind, panel.rotation);
    const world = gridToWorld(pos, this.stage);
    mesh.position.set(world.x, 0, world.z);
    this.parent.add(mesh);
    this.meshes.set(key, mesh);
  }

  /** プレイヤーパネルを全部消す(もういちどあそぶ用) */
  clear(grid: Grid): void {
    for (const [key, mesh] of this.meshes) {
      this.parent.remove(mesh);
      disposeObject(mesh);
      const [x, z] = key.split(',').map(Number);
      grid.remove({ x: x!, z: z! });
    }
    this.meshes.clear();
  }

  /** ステージ切り替え時にプレイヤーパネルを破棄して GPU リソースも解放する */
  disposeAll(): void {
    for (const mesh of this.meshes.values()) {
      this.parent.remove(mesh);
      disposeObject(mesh);
    }
    this.meshes.clear();
    this.hidePreview();
  }

  showPreview(pos: GridPos, kind: Parameters<typeof createPanelMesh>[0]): void {
    this.hidePreview();
    this.preview = createPanelMesh(kind, 0, { preview: true });
    const world = gridToWorld(pos, this.stage);
    this.preview.position.set(world.x, 0.02, world.z);
    this.parent.add(this.preview);
  }

  hidePreview(): void {
    if (this.preview) {
      this.parent.remove(this.preview);
      disposeObject(this.preview);
      this.preview = null;
    }
  }
}
