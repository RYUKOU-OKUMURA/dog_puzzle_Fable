import * as THREE from 'three';

function lambert(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

/** お散歩イベント用の小さなちょうちょ(既存パレット色のみ) */
export function buildButterfly(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), lambert(0xff8fad));
  group.add(body);

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.08), lambert(0xffd166));
  wingL.position.set(-0.06, 0, 0);
  wingL.name = 'wingL';
  group.add(wingL);

  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.08), lambert(0xff8fad));
  wingR.position.set(0.06, 0, 0);
  wingR.name = 'wingR';
  group.add(wingR);

  return group;
}

/** お散歩イベント用の小さな鳥(既存パレット色のみ) */
export function buildBird(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lambert(0xfff3dd));
  group.add(body);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 6), lambert(0x9c6b4a));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0, 0.07);
  group.add(beak);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.06), lambert(0xfff3dd));
  wing.position.set(0, 0.02, -0.02);
  group.add(wing);

  return group;
}
