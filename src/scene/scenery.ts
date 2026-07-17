import * as THREE from 'three';
import type { GridPos, SceneryKind, StageTheme } from '../core/types';

/**
 * ワールドの添景・建物の見た目だけを持つ(盤面ロジックは town.ts)。
 * 新しい添景トークン(M12 の障害物等)を追加するときは
 * types.ts の SceneryKind → stageMap.ts のトークン表 → ここの buildScenery、の3点セット。
 */

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

export function lambert(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function withShadow<T extends THREE.Object3D>(object: T): T {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return object;
}

export function buildStartHouse(theme?: StageTheme): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.5, 0.6), lambert(0xfff3dd));
  body.position.y = 0.25;
  group.add(body);

  // 雪テーマ: 屋根を白く(既存白)。夜: 窓をあたたかい黄色に
  const roofColor = theme === 'snow' ? 0xffffff : 0xe0604f;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.42, 4), lambert(roofColor));
  roof.position.y = 0.71;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.04), lambert(0x9c6b4a));
  door.position.set(0, 0.12, 0.31);
  group.add(door);

  const windowColor = theme === 'night' ? 0xffd166 : 0xbfe4ff;
  const window1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.04), lambert(windowColor));
  window1.position.set(-0.2, 0.3, 0.31);
  group.add(window1);
  const window2 = window1.clone();
  window2.position.x = 0.2;
  group.add(window2);

  return withShadow(group);
}

export function buildGoalMarker(): THREE.Group {
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

export function buildScenery(kind: SceneryKind, pos: GridPos, theme?: StageTheme): THREE.Group {
  switch (kind) {
    case 'house':
      return buildHouse(pos, theme);
    case 'building':
      return buildBuilding(pos);
    case 'tree':
      return buildTree(pos, theme);
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
    case 'cactus':
      return buildCactus(pos);
    case 'colorfulHouse':
      return buildColorfulHouse(pos, theme);
    case 'rock':
      return buildRock(pos);
    case 'fence':
      return buildFence(pos);
  }
}

/** あたたかい夜の街灯(くすみオレンジの灯+茶の柱。発光マテリアルは使わない) */
export function buildStreetLamp(): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.7, 8), lambert(0x9c6b4a));
  pole.position.y = 0.35;
  group.add(pole);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), lambert(0xffd166));
  lamp.position.y = 0.74;
  group.add(lamp);
  return withShadow(group);
}

function buildHouse(pos: GridPos, theme?: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const wall = HOUSE_WALLS[hash(pos) % HOUSE_WALLS.length]!;
  const roofColor = theme === 'snow' ? 0xffffff : HOUSE_ROOFS[hash(pos, 1) % HOUSE_ROOFS.length]!;

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

  if (theme === 'night') {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), lambert(0xffd166));
    win.position.set(-0.16, 0.26, 0.27);
    group.add(win);
  }

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

function buildTree(pos: GridPos, theme?: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const green = TREE_GREENS[hash(pos, 5) % TREE_GREENS.length]!;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.32, 8), lambert(0x9c6b4a));
  trunk.position.y = 0.16;
  group.add(trunk);

  // 雪テーマはモミの木風の三角すい重ね(既存緑+白い雪帽子)
  if (theme === 'snow') {
    const lower = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.36, 8), lambert(green));
    lower.position.y = 0.48;
    group.add(lower);
    const mid = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.28, 8), lambert(green));
    mid.position.y = 0.72;
    group.add(mid);
    const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 8), lambert(0xffffff));
    snowCap.position.y = 0.92;
    group.add(snowCap);
    return withShadow(group);
  }

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

/**
 * W4 アメリカ・メキシコ: サボテン。既存 TREE_GREENS の緑で腕つき柱。高さは1.0未満。
 */
function buildCactus(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const green = lambert(TREE_GREENS[hash(pos, 5) % TREE_GREENS.length]!);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), green);
  trunk.position.y = 0.35;
  group.add(trunk);

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.28, 8), green);
  armL.position.set(-0.16, 0.42, 0);
  armL.rotation.z = Math.PI / 2.4;
  group.add(armL);

  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.22, 8), green);
  armR.position.set(0.14, 0.5, 0);
  armR.rotation.z = -Math.PI / 2.6;
  group.add(armR);

  group.rotation.y = (hash(pos, 7) % 4) * (Math.PI / 2);
  return withShadow(group);
}

/**
 * W4 アメリカ・メキシコ: カラフルな家。パステル壁+テラコッタ屋根(6.2 パレット内)。
 */
function buildColorfulHouse(pos: GridPos, theme?: StageTheme): THREE.Group {
  const group = new THREE.Group();
  const wall = HOUSE_WALLS[hash(pos) % HOUSE_WALLS.length]!;
  // ちゅうかがい・おまつり: くすみ赤の瓦屋根風(既存屋根赤)
  const roofColor =
    theme === 'chinatown' || theme === 'festival'
      ? 0xe0604f
      : HOUSE_ROOFS[hash(pos, 1) % HOUSE_ROOFS.length]!;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.4, 0.5), lambert(wall));
  body.position.y = 0.2;
  group.add(body);

  // 平らめの屋根(アドベ風)+小さなひさし
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.58), lambert(roofColor));
  roof.position.y = 0.44;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.04), lambert(0x9c6b4a));
  door.position.set(0, 0.09, 0.26);
  group.add(door);

  const window = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), lambert(0xffe9a3));
  window.position.set(-0.16, 0.26, 0.26);
  group.add(window);

  // おまつり: 小さなランタン風の球(くすみ赤・点滅なし)
  if (theme === 'festival' || theme === 'chinatown') {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lambert(0xe0604f));
    lantern.position.set(0.22, 0.55, 0);
    group.add(lantern);
  }

  group.rotation.y = (hash(pos, 2) % 4) * (Math.PI / 2);
  return withShadow(group);
}

/**
 * M12 障害物: いわ。Icosahedron を少し潰して重ね、通れない塊に見せる。
 * 色は幹茶(0x9c6b4a)と台座ベージュ(0xd9b98c)のみ(design-guide 6.2)。高さは1.0未満。
 */
function buildRock(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const trunk = lambert(0x9c6b4a);
  const pedestal = lambert(0xd9b98c);

  const base = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), pedestal);
  base.position.set(0.02, 0.16, -0.02);
  base.scale.set(1.15, 0.7, 1.1);
  group.add(base);

  const mid = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), trunk);
  mid.position.set(-0.06, 0.32, 0.04);
  mid.scale.set(1.05, 0.75, 1.0);
  group.add(mid);

  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), pedestal);
  top.position.set(0.08, 0.48, -0.04);
  top.scale.set(1.1, 0.65, 0.95);
  group.add(top);

  // マスごとに向きを少し変えて、並んでも同じ岩に見えないようにする
  group.rotation.y = (hash(pos, 9) % 8) * (Math.PI / 4);
  return withShadow(group);
}

/**
 * M12 障害物: こうじのさく。細い柱+横板の柵と、手前のオレンジコーンで「通れない」を示す。
 * 木部は幹茶、コーンは屋根オレンジ、白帯は花の白(いずれも 6.2 パレット内)。高さは round 1.0 未満。
 */
function buildFence(pos: GridPos): THREE.Group {
  const group = new THREE.Group();
  const wood = lambert(0x9c6b4a);
  const coneOrange = lambert(0xf2903d);
  const stripe = lambert(0xffffff);

  // 横に並ぶ3本の細い柱
  for (const x of [-0.28, 0, 0.28]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.55, 8), wood);
    post.position.set(x, 0.275, 0);
    group.add(post);
  }

  // 横板2枚で柵らしく見せる
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.04), wood);
  railTop.position.set(0, 0.42, 0);
  group.add(railTop);
  const railMid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.04), wood);
  railMid.position.set(0, 0.22, 0);
  group.add(railMid);

  // 手前の三角コーン(工事中の目印)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 8), coneOrange);
  cone.position.set(0.18, 0.14, 0.22);
  group.add(cone);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.04, 8), stripe);
  band.position.set(0.18, 0.12, 0.22);
  group.add(band);

  group.rotation.y = (hash(pos, 11) % 4) * (Math.PI / 2);
  return withShadow(group);
}
