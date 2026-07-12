import * as THREE from 'three';
import type { GridPos, StageDef } from '../core/types';
import { posKey } from '../core/types';
import { gridToWorld } from './coords';
import { disposeObject } from './dispose';
import type { Animator } from '../game/tween';

const TREAT_COLOR = 0xfff4e0; // クリーム(骨)。犬モデルのむね色と同系
const TREAT_FLOAT_Y = 0.22; // 道の上にふわっと浮かす

/**
 * 盤面のおやつ(骨)の3D表示。何をいつ消すかは game/ が指示し、scene/ は描画と演出だけ持つ。
 * - おやつは各マスに骨型メッシュを置く(パズル中に見える)
 * - eatAt(): しばちゃんが通ったとき「ぱくっ」と消える
 * - wiggle(): おやつ残り失敗時に、残ったおやつをやわらかく強調する
 */
export class TreatsView {
  readonly group: THREE.Group;
  private readonly meshes = new Map<string, THREE.Group>();

  constructor(stage: StageDef) {
    this.group = new THREE.Group();
    for (const pos of stage.treats ?? []) {
      const mesh = buildTreat();
      const world = gridToWorld(pos, stage);
      mesh.position.set(world.x, TREAT_FLOAT_Y, world.z);
      this.group.add(mesh);
      this.meshes.set(posKey(pos), mesh);
    }
  }

  private get(pos: GridPos): THREE.Group | undefined {
    return this.meshes.get(posKey(pos));
  }

  /** 残っている(食べていない)おやつの位置集合 */
  remainingKeys(): Set<string> {
    return new Set(this.meshes.keys());
  }

  /** 指定マスのおやつを「ぱくっ」と食べて消す(既に無ければ何もしない) */
  eatAt(pos: GridPos, animator: Animator): Promise<void> {
    const mesh = this.get(pos);
    if (!mesh) return Promise.resolve();
    this.meshes.delete(posKey(pos));
    return animator.run(0.22, (t) => {
      // ちょい跳ね → 縮んで消える
      const hop = Math.sin(t * Math.PI) * 0.12;
      mesh.position.y = TREAT_FLOAT_Y + hop;
      const s = 1 - t;
      mesh.scale.setScalar(Math.max(0, s));
      mesh.rotation.y = t * Math.PI;
    }).then(() => {
      this.group.remove(mesh);
      disposeObject(mesh);
    });
  }

  /** おやつ残り失敗時: 残ったおやつをやわらかくぷるぷるさせる(1回かぎり・短時間) */
  wiggle(animator: Animator): Promise<void> {
    const targets = [...this.meshes.values()];
    if (targets.length === 0) return Promise.resolve();
    return animator.run(1.1, (t) => {
      // 減衰する横ぶれ + ごく小さい拡大で「ここだよ」とやさしく知らせる
      const decay = 1 - t;
      const wobble = Math.sin(t * Math.PI * 8) * 0.18 * decay;
      const pulse = 1 + Math.sin(t * Math.PI * 6) * 0.08 * decay;
      for (const mesh of targets) {
        mesh.rotation.z = wobble;
        mesh.scale.setScalar(pulse);
      }
    }).then(() => {
      for (const mesh of targets) {
        mesh.rotation.z = 0;
        mesh.scale.setScalar(1);
      }
    });
  }

  /** ステージ切り替え時に GPU リソースごと解放 */
  dispose(): void {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh);
      disposeObject(mesh);
    }
    this.meshes.clear();
  }
}

/** 骨型のおやつ: 細い胴の両端に球が2個ずつ。プリミティブ組み合わせ(design-guide 6.4) */
function buildTreat(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: TREAT_COLOR });

  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), mat);
  bar.rotation.z = Math.PI / 2; // 横に寝かせる
  group.add(bar);

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), mat);
      end.position.set(sx * 0.12, sy * 0.045, 0);
      group.add(end);
    }
  }

  group.userData.materials = [mat];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return group;
}
