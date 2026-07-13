import * as THREE from 'three';
import { connectionsOf, DIR_OFFSET } from '../core/panel';
import type { GridPos, SceneryKind, StageDef } from '../core/types';
import { posKey } from '../core/types';
import { gridToWorld } from './coords';
import { createPanelMesh } from './panelMesh';

const GRASS_A = 0xa9dd9d;
const GRASS_B = 0x9ed394;
const SLOT_SAND = 0xf0e2b6;
const SLOT_HIGHLIGHT = 0xffc9d8;
const BASE_BROWN = 0xd9b98c;

const HOUSE_WALLS = [0xfff3dd, 0xffe3e9, 0xe4f3ff, 0xf3ffe0];
const HOUSE_ROOFS = [0xe0604f, 0xf2903d, 0x7fbf7a, 0x6faed9];
const TREE_GREENS = [0x69bd63, 0x7fcf74, 0x5cb168];
const FLOWER_COLORS = [0xff8fad, 0xffd166, 0xffffff, 0xff6f91];
// W2(イギリス): レンガ壁は既存屋根色のくすみ赤・オレンジ(design-guide 6.2 のパレット内)
const BRICK_WALLS = [0xe0604f, 0xf2903d];
// スレート(石板)屋根は青系屋根色を流用
const SLATE_ROOF = 0x6faed9;
const PHONE_RED = 0xe0604f;

function hash(pos: GridPos, salt = 0): number {
  return Math.abs(pos.x * 7 + pos.z * 13 + salt * 17);
}

function lambert(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

export interface Town {
  group: THREE.Group;
  /** タップ判定用の地面タイル(userData.cell に GridPos) */
  cellTiles: THREE.Mesh[];
  /** パネル選択中に空きマスを目立たせる */
  setSlotsHighlighted(highlighted: boolean, isEmpty: (pos: GridPos) => boolean): void;
}

export function buildTown(stage: StageDef): Town {
  const group = new THREE.Group();
  const cellTiles: THREE.Mesh[] = [];
  const slotTiles = new Map<string, THREE.Mesh>();
  const slotKeys = new Set(stage.slots.map(posKey));

  // ジオラマの台座
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(stage.size.w + 0.9, 0.45, stage.size.h + 0.9),
    lambert(BASE_BROWN),
  );
  base.position.y = -0.12 - 0.225;
  group.add(base);

  // 地面タイル
  const tileGeometry = new THREE.BoxGeometry(0.98, 0.12, 0.98);
  for (let x = 0; x < stage.size.w; x++) {
    for (let z = 0; z < stage.size.h; z++) {
      const pos = { x, z };
      const isSlot = slotKeys.has(posKey(pos));
      const grass = (x + z) % 2 === 0 ? GRASS_A : GRASS_B;
      const tile = new THREE.Mesh(tileGeometry, lambert(isSlot ? SLOT_SAND : grass));
      const world = gridToWorld(pos, stage);
      tile.position.set(world.x, -0.06, world.z);
      tile.receiveShadow = true;
      tile.userData.cell = pos;
      group.add(tile);
      cellTiles.push(tile);
      if (isSlot) slotTiles.set(posKey(pos), tile);
    }
  }

  // 固定道路
  for (const road of stage.fixedRoads) {
    const mesh = createPanelMesh(road.kind, road.rotation);
    const world = gridToWorld(road.pos, stage);
    mesh.position.set(world.x, 0, world.z);
    group.add(mesh);
  }

  // スタート(おうち)とゴールの道の端点
  for (const endpoint of [stage.start, stage.goal]) {
    const stub = createPanelMesh('end', endpoint.rotation);
    const world = gridToWorld(endpoint.pos, stage);
    stub.position.set(world.x, 0, world.z);
    group.add(stub);
  }

  // スタートのおうち(犬が前に立てるよう、出口と反対側に少し寄せる)
  const house = placeAt(buildStartHouse(), stage.start.pos, stage);
  const exitDir = DIR_OFFSET[connectionsOf('end', stage.start.rotation)[0]!];
  house.position.x -= exitDir.x * 0.3;
  house.position.z -= exitDir.z * 0.3;
  group.add(house);
  group.add(placeAt(buildGoalMarker(), stage.goal.pos, stage));

  // 添景(建物・木・花など)
  for (const item of stage.scenery) {
    group.add(placeAt(buildScenery(item.kind, item.pos), item.pos, stage));
  }

  return {
    group,
    cellTiles,
    setSlotsHighlighted(highlighted, isEmpty) {
      for (const [key, tile] of slotTiles) {
        const [x, z] = key.split(',').map(Number);
        const empty = isEmpty({ x: x!, z: z! });
        const material = tile.material as THREE.MeshLambertMaterial;
        material.color.setHex(highlighted && empty ? SLOT_HIGHLIGHT : SLOT_SAND);
      }
    },
  };
}

function placeAt(object: THREE.Object3D, pos: GridPos, stage: StageDef): THREE.Object3D {
  const world = gridToWorld(pos, stage);
  object.position.set(world.x, 0, world.z);
  return object;
}

function withShadow<T extends THREE.Object3D>(object: T): T {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return object;
}

function buildStartHouse(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.5, 0.6), lambert(0xfff3dd));
  body.position.y = 0.25;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.42, 4), lambert(0xe0604f));
  roof.position.y = 0.71;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.04), lambert(0x9c6b4a));
  door.position.set(0, 0.12, 0.31);
  group.add(door);

  const window1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.04), lambert(0xbfe4ff));
  window1.position.set(-0.2, 0.3, 0.31);
  group.add(window1);
  const window2 = window1.clone();
  window2.position.x = 0.2;
  group.add(window2);

  return withShadow(group);
}

function buildGoalMarker(): THREE.Group {
  const group = new THREE.Group();

  const circle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.05, 24),
    lambert(0xffc9d8),
  );
  circle.position.y = 0.025;
  group.add(circle);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8), lambert(0xffffff));
  pole.position.set(0.24, 0.375, -0.24);
  group.add(pole);

  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.02), lambert(0xff8fad));
  flag.position.set(0.09, 0.62, -0.24);
  group.add(flag);

  return withShadow(group);
}

function buildScenery(kind: SceneryKind, pos: GridPos): THREE.Group {
  switch (kind) {
    case 'house':
      return buildHouse(pos);
    case 'building':
      return buildBuilding(pos);
    case 'tree':
      return buildTree(pos);
    case 'flower':
      return buildFlowerBed(pos);
    case 'pond':
      return buildPond();
    case 'torii':
      return buildTorii();
    case 'brickHouse':
      return buildBrickHouse(pos);
    case 'phoneBox':
      return buildPhoneBox(pos);
    case 'snowMountain':
      return buildSnowMountain(pos);
    case 'fountain':
      return buildFountain(pos);
  }
}

function buildHouse(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const wall = HOUSE_WALLS[hash(pos) % HOUSE_WALLS.length]!;
  const roofColor = HOUSE_ROOFS[hash(pos, 1) % HOUSE_ROOFS.length]!;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.52), lambert(wall));
  body.position.y = 0.21;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.34, 4), lambert(roofColor));
  roof.position.y = 0.59;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.04), lambert(0x9c6b4a));
  door.position.set(0, 0.1, 0.27);
  group.add(door);

  group.rotation.y = (hash(pos, 2) % 4) * (Math.PI / 2);
  return withShadow(group);
}

function buildBuilding(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const wall = HOUSE_WALLS[hash(pos, 3) % HOUSE_WALLS.length]!;
  const height = 0.9 + (hash(pos, 4) % 3) * 0.18;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, height, 0.62), lambert(wall));
  body.position.y = height / 2;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.68), lambert(0xb08968));
  roof.position.y = height + 0.04;
  group.add(roof);

  const windowMaterial = lambert(0xffe9a3);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), windowMaterial);
      w.position.set(col === 0 ? -0.15 : 0.15, height * 0.35 + row * height * 0.35, 0.32);
      group.add(w);
    }
  }

  return withShadow(group);
}

function buildTree(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const green = TREE_GREENS[hash(pos, 5) % TREE_GREENS.length]!;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.32, 8), lambert(0x9c6b4a));
  trunk.position.y = 0.16;
  group.add(trunk);

  const leafBottom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), lambert(green));
  leafBottom.position.y = 0.52;
  group.add(leafBottom);

  const leafTop = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), lambert(green));
  leafTop.position.y = 0.76;
  group.add(leafTop);

  return withShadow(group);
}

function buildFlowerBed(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const spots = [
    { x: -0.22, z: -0.12 },
    { x: 0.1, z: -0.26 },
    { x: 0.26, z: 0.1 },
    { x: -0.05, z: 0.22 },
    { x: 0.18, z: 0.3 },
  ];
  spots.forEach((spot, index) => {
    const color = FLOWER_COLORS[hash(pos, index) % FLOWER_COLORS.length]!;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6),
      lambert(0x69bd63),
    );
    stem.position.set(spot.x, 0.06, spot.z);
    group.add(stem);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), lambert(color));
    bloom.position.set(spot.x, 0.14, spot.z);
    group.add(bloom);
  });
  return group;
}

function buildPond(): THREE.Group {
  const group = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 20), lambert(0x9fd8f0));
  water.position.y = 0.025;
  group.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.045, 8, 20), lambert(0xd9b98c));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.04;
  group.add(rim);
  return group;
}

function buildTorii(): THREE.Group {
  const group = new THREE.Group();
  const red = lambert(0xe0604f);

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.72, 10), red);
    pillar.position.set(side * 0.28, 0.36, 0);
    group.add(pillar);
  }

  const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.09, 0.12), red);
  topBar.position.y = 0.74;
  group.add(topBar);

  const midBar = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.07, 0.09), red);
  midBar.position.y = 0.56;
  group.add(midBar);

  return withShadow(group);
}

/**
 * W2 イギリス: レンガの家。壁はくすみ赤のレンガ、屋根はスレート青、煙突つき。
 * 既存の家(house)と同じ寸法だが、土地らしさは色で出す(design-guide 6.2 のパレット内)。
 */
function buildBrickHouse(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const wall = BRICK_WALLS[hash(pos) % BRICK_WALLS.length]!;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.52), lambert(wall));
  body.position.y = 0.21;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.34, 4), lambert(SLATE_ROOF));
  roof.position.y = 0.59;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  // 煙突(イギリスの家の記号)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), lambert(SLATE_ROOF));
  chimney.position.set(0.18, 0.66, -0.14);
  group.add(chimney);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.04), lambert(0x9c6b4a));
  door.position.set(0, 0.1, 0.27);
  group.add(door);

  // 白い縦枠の窓(テラスハウス風)
  const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.03), lambert(0xfff3dd));
  windowFrame.position.set(-0.18, 0.26, 0.27);
  group.add(windowFrame);

  group.rotation.y = (hash(pos, 2) % 4) * (Math.PI / 2);
  return withShadow(group);
}

/**
 * W2 イギリス: あかい でんわボックス。細い背の箱に小さな屋根とクリーム色の窓。
 * design-guide 6.2 の赤(0xe0604f)を使い、真っ赤にしない。
 */
function buildPhoneBox(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const red = lambert(PHONE_RED);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.62, 0.3), red);
  body.position.y = 0.31;
  group.add(body);

  // 頭頂部のひさし(でんわボックスの王冠)
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36), red);
  crown.position.y = 0.65;
  group.add(crown);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), red);
  top.position.y = 0.71;
  group.add(top);

  // クリーム色の窓(4面の上半分)
  const glass = lambert(0xfff3dd);
  const panePositions: Array<[number, number]> = [
    [0, 0.151],
    [0, -0.151],
    [0.151, 0],
    [-0.151, 0],
  ];
  for (const [sx, sz] of panePositions) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02), glass);
    pane.position.set(sx, 0.4, sz);
    if (sx !== 0) pane.rotation.y = Math.PI / 2;
    group.add(pane);
  }

  // 向きを少し変えて並べすぎを防ぐ(hashで安定)
  group.rotation.y = (hash(pos, 6) % 4) * (Math.PI / 2);
  return withShadow(group);
}

/**
 * W3 フランス・スイス: ゆきやま。岩色の台座に白い雪の三角すい。
 * 高さは design-guide 6.3 の上限(1.5)未満に抑える。色は 6.2 パレット内。
 */
function buildSnowMountain(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const rock = lambert(0xd9b98c);
  const snow = lambert(0xffffff);

  const base = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.55, 5), rock);
  base.position.y = 0.28;
  group.add(base);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.32, 5), snow);
  cap.position.y = 0.62;
  group.add(cap);

  group.rotation.y = (hash(pos, 3) % 4) * (Math.PI / 2);
  return withShadow(group);
}

/**
 * W3 フランス・スイス: ふんすい。石の縁に水色の水面と小さな噴き出し。
 * 池(pond)と同系色。色は design-guide 6.2 パレット内。
 */
function buildFountain(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const stone = lambert(0xd9b98c);
  const water = lambert(0x9fd8f0);

  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.1, 16), stone);
  basin.position.y = 0.05;
  group.add(basin);

  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), water);
  pool.position.y = 0.1;
  group.add(pool);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 10), stone);
  pillar.position.y = 0.22;
  group.add(pillar);

  const jet = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), water);
  jet.position.y = 0.38;
  group.add(jet);

  group.rotation.y = (hash(pos, 4) % 4) * (Math.PI / 2);
  return withShadow(group);
}

