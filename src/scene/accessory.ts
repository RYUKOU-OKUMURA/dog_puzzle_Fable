import * as THREE from 'three';
import { getAccessory } from '../stage/accessories';

/** アクセサリー子メッシュの識別(着脱時に traverse で拾う) */
export const ACCESSORY_FLAG = 'shibaAccessory';

function lambert(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function markAccessory(root: THREE.Object3D): void {
  root.userData[ACCESSORY_FLAG] = true;
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
}

/** さくらバンダナ / みどりのスカーフ: 首まわりの薄い Box×3 */
function createNeckWrap(color: number): THREE.Group {
  const g = new THREE.Group();
  const mat = lambert(color);
  // 正面の三角に見える配置(薄い板を少し傾ける)
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), mat);
  front.position.set(0, 0.34, 0.16);
  front.rotation.x = -0.35;
  g.add(front);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.1), mat);
  left.position.set(-0.12, 0.33, 0.1);
  left.rotation.y = 0.4;
  g.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.1), mat);
  right.position.set(0.12, 0.33, 0.1);
  right.rotation.y = -0.4;
  g.add(right);

  return g;
}

/** あかいぼうし: 頭頂 Cylinder + つば Box(頭 Group ローカル) */
function createRedHat(): THREE.Group {
  const g = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10), lambert(0xe0604f));
  crown.position.set(0, 0.18, 0);
  g.add(crown);

  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.22), lambert(0xfff9ee));
  brim.position.set(0, 0.125, 0);
  g.add(brim);

  return g;
}

/** あおいリボン: 片耳付近(頭 Group ローカル、右耳側) */
function createBlueRibbon(): THREE.Group {
  const g = new THREE.Group();
  const mat = lambert(0x6faed9);
  // 結び目
  const knotL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), mat);
  knotL.position.set(0.1, 0.14, 0.02);
  knotL.rotation.z = 0.5;
  g.add(knotL);

  const knotR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), mat);
  knotR.position.set(0.14, 0.14, 0.02);
  knotR.rotation.z = -0.5;
  g.add(knotR);

  // たれ
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.02), mat);
  tail.position.set(0.12, 0.08, 0.03);
  g.add(tail);

  return g;
}

/** ほしのバッジ: 胸元の薄いひし形 Box + 中央 Sphere */
function createStarBadge(): THREE.Group {
  const g = new THREE.Group();
  // 縁(オレンジ)を少し大きく、その上に黄の板
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), lambert(0xf2903d));
  rim.position.set(0, 0.22, 0.24);
  rim.rotation.z = Math.PI / 4;
  g.add(rim);

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), lambert(0xffd166));
  face.position.set(0, 0.22, 0.252);
  face.rotation.z = Math.PI / 4;
  g.add(face);

  const gem = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), lambert(0xffd166));
  gem.position.set(0, 0.22, 0.27);
  g.add(gem);

  return g;
}

/**
 * アクセサリーidからメッシュを生成。不明idは null。
 * 位置はしばちゃんの head / group ローカル座標前提。
 */
export function createAccessoryMesh(id: string): THREE.Object3D | null {
  const def = getAccessory(id);
  if (!def) return null;

  let mesh: THREE.Object3D;
  switch (def.id) {
    case 'acc-w1':
      mesh = createNeckWrap(0xff8fad);
      break;
    case 'acc-w2':
      mesh = createRedHat();
      break;
    case 'acc-w3':
      mesh = createBlueRibbon();
      break;
    case 'acc-w4':
      mesh = createNeckWrap(0x7fcf74);
      break;
    case 'acc-w5':
      mesh = createStarBadge();
      break;
    default:
      return null;
  }
  markAccessory(mesh);
  mesh.userData.accessoryId = def.id;
  mesh.userData.accessoryAttach = def.attach;
  return mesh;
}
