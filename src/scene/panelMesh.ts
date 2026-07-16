import * as THREE from 'three';
import { connectionsOf } from '../core/panel';
import type { Dir, PanelKind, Rotation } from '../core/types';

const COLORS = {
  base: 0xcbc3b4,
  path: 0xf7efdf,
  dash: 0xffffff,
  post: 0x9c6b4a,
};

const BASE_HEIGHT = 0.06;
const PATH_HEIGHT = 0.075;
const PATH_WIDTH = 0.44;

/** 橋の上側デッキ高さ(歩行Yと一致させる。design-guide の高さ1.5未満) */
export const BRIDGE_DECK_Y = 0.42;

const DIR_VECTOR: Record<Dir, { x: number; z: number }> = {
  N: { x: 0, z: -1 },
  E: { x: 1, z: 0 },
  S: { x: 0, z: 1 },
  W: { x: -1, z: 0 },
};

export interface PanelMeshOptions {
  /** 半透明の配置プレビュー表示 */
  preview?: boolean;
}

/**
 * 道パネルのメッシュを生成する。接続方向は connectionsOf から計算して
 * ジオメトリを直接組むので、Group 自体の回転は不要。
 */
export function createPanelMesh(
  kind: PanelKind,
  rotation: Rotation,
  options: PanelMeshOptions = {},
): THREE.Group {
  if (kind === 'bridge') return createBridgeMesh(options);

  const group = new THREE.Group();
  const dirs = connectionsOf(kind, rotation);

  const material = (color: number) => {
    const mat = new THREE.MeshLambertMaterial({ color });
    if (options.preview) {
      mat.transparent = true;
      mat.opacity = 0.55;
    }
    return mat;
  };

  // 端点(おうち・ゴール)はマス全面のベースを敷かず、道の部分だけを描く
  if (kind !== 'end') {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, BASE_HEIGHT, 0.96),
      material(COLORS.base),
    );
    base.position.y = BASE_HEIGHT / 2;
    base.receiveShadow = true;
    group.add(base);
  }

  // 中央の交差プレート
  const center = new THREE.Mesh(
    new THREE.BoxGeometry(PATH_WIDTH, PATH_HEIGHT, PATH_WIDTH),
    material(COLORS.path),
  );
  center.position.y = PATH_HEIGHT / 2;
  center.receiveShadow = true;
  group.add(center);

  // 各接続方向へ伸びる道
  for (const dir of dirs) {
    const v = DIR_VECTOR[dir];
    const length = 0.5 - PATH_WIDTH / 2 + 0.02;
    const geometry =
      v.x !== 0
        ? new THREE.BoxGeometry(length, PATH_HEIGHT, PATH_WIDTH)
        : new THREE.BoxGeometry(PATH_WIDTH, PATH_HEIGHT, length);
    const segment = new THREE.Mesh(geometry, material(COLORS.path));
    const offset = PATH_WIDTH / 2 + length / 2 - 0.01;
    segment.position.set(v.x * offset, PATH_HEIGHT / 2, v.z * offset);
    segment.receiveShadow = true;
    group.add(segment);

    // 白い点線(方向がわかるアクセント)
    const dash = new THREE.Mesh(
      v.x !== 0
        ? new THREE.BoxGeometry(0.14, 0.012, 0.05)
        : new THREE.BoxGeometry(0.05, 0.012, 0.14),
      material(COLORS.dash),
    );
    dash.position.set(v.x * 0.33, PATH_HEIGHT + 0.006, v.z * 0.33);
    group.add(dash);
  }

  return group;
}

/**
 * 橋: 下=東西の道、上=南北のアーチ。プリミティブ+単色のみ、高さ1.5未満。
 */
function createBridgeMesh(options: PanelMeshOptions): THREE.Group {
  const group = new THREE.Group();
  const material = (color: number) => {
    const mat = new THREE.MeshLambertMaterial({ color });
    if (options.preview) {
      mat.transparent = true;
      mat.opacity = 0.55;
    }
    return mat;
  };

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, BASE_HEIGHT, 0.96),
    material(COLORS.base),
  );
  base.position.y = BASE_HEIGHT / 2;
  base.receiveShadow = true;
  group.add(base);

  // 下の道(東西)
  const lower = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, PATH_HEIGHT, PATH_WIDTH),
    material(COLORS.path),
  );
  lower.position.y = PATH_HEIGHT / 2;
  lower.receiveShadow = true;
  group.add(lower);

  // 脚(アーチの柱)。南北デッキを支える
  for (const sx of [-0.28, 0.28]) {
    for (const sz of [-0.22, 0.22]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, BRIDGE_DECK_Y - 0.02, 0.08),
        material(COLORS.post),
      );
      post.position.set(sx, (BRIDGE_DECK_Y - 0.02) / 2, sz);
      post.castShadow = true;
      group.add(post);
    }
  }

  // 上の道(南北)。デッキ面が BRIDGE_DECK_Y
  const deckThickness = 0.07;
  const upper = new THREE.Mesh(
    new THREE.BoxGeometry(PATH_WIDTH, deckThickness, 0.96),
    material(COLORS.path),
  );
  upper.position.y = BRIDGE_DECK_Y + deckThickness / 2;
  upper.castShadow = true;
  upper.receiveShadow = true;
  group.add(upper);

  // 手すり(低い壁)。全体高さは約 0.42+0.07+0.08 ≈ 0.57 < 1.5
  for (const sx of [-PATH_WIDTH / 2 + 0.02, PATH_WIDTH / 2 - 0.02]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.9), material(COLORS.post));
    rail.position.set(sx, BRIDGE_DECK_Y + deckThickness + 0.04, 0);
    group.add(rail);
  }

  // 上道の点線
  for (const sz of [-0.28, 0.28]) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.14), material(COLORS.dash));
    dash.position.set(0, BRIDGE_DECK_Y + deckThickness + 0.006, sz);
    group.add(dash);
  }

  return group;
}
