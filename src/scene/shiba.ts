import * as THREE from 'three';
import { ACCESSORY_FLAG, createAccessoryMesh } from './accessory';
import { disposeObject } from './dispose';
import { getAccessory } from '../stage/accessories';

export interface DogModel {
  group: THREE.Group;
  /** 首かしげアニメ用 */
  head: THREE.Group;
}

function lambert(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

/**
 * プリミティブ組み合わせのデフォルメ犬。回転0で +z(南)を向く。
 * furColor と scale を変えると柴犬にも秋田犬にもなる。
 */
export function createDog(furColor: number, scale = 1): DogModel {
  const group = new THREE.Group();
  const fur = lambert(furColor);
  const cream = lambert(0xfff4e0);
  const dark = lambert(0x4a3728);

  // 胴体
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.42), fur);
  body.position.y = 0.24;
  group.add(body);

  // むね(白)
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.06), cream);
  chest.position.set(0, 0.21, 0.2);
  group.add(chest);

  // 頭(首かしげ用に Group でまとめる)
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.16);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.22), fur);
  head.add(skull);

  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), cream);
  muzzle.position.set(0, -0.04, 0.14);
  head.add(muzzle);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), dark);
  nose.position.set(0, -0.01, 0.185);
  head.add(nose);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.02), dark);
    eye.position.set(side * 0.075, 0.035, 0.115);
    head.add(eye);

    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 4), fur);
    ear.position.set(side * 0.09, 0.155, -0.02);
    ear.rotation.z = side * -0.18;
    head.add(ear);

    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.02), cream);
    cheek.position.set(side * 0.09, -0.045, 0.112);
    head.add(cheek);
  }

  group.add(head);

  // あし
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), fur);
      leg.position.set(sideX * 0.1, 0.08, sideZ * 0.14);
      group.add(leg);
    }
  }

  // くるんと まいた しっぽ
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), fur);
  tail.position.set(0.02, 0.38, -0.2);
  group.add(tail);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), cream);
  tailTip.position.set(0.03, 0.43, -0.16);
  group.add(tailTip);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  group.scale.setScalar(scale);

  return { group, head };
}

/** しばちゃんに付いているアクセサリー子を外して GPU リソースも解放する */
function clearAccessories(dog: DogModel): void {
  const roots = [dog.group, dog.head];
  for (const root of roots) {
    const toRemove: THREE.Object3D[] = [];
    for (const child of root.children) {
      if (child.userData[ACCESSORY_FLAG]) toRemove.push(child);
    }
    for (const child of toRemove) {
      root.remove(child);
      disposeObject(child);
    }
  }
}

/**
 * しばちゃんへアクセサリーを着脱する。友犬には呼ばないこと。
 * id が null / 不明なら外すだけ。起動時・装備変更・ステージ開始で再適用する。
 */
export function applyAccessory(dog: DogModel, id: string | null): void {
  clearAccessories(dog);
  if (!id) return;
  const def = getAccessory(id);
  if (!def) return;
  const mesh = createAccessoryMesh(id);
  if (!mesh) return;
  if (def.attach === 'head') {
    dog.head.add(mesh);
  } else {
    dog.group.add(mesh);
  }
}
