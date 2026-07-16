import * as THREE from 'three';
import { connectionsOf, DIR_OFFSET } from '../core/panel';
import type { GridPos, StageDef, StageTheme } from '../core/types';
import { posKey } from '../core/types';
import { gridToWorld } from './coords';
import { createPanelMesh } from './panelMesh';
import {
  buildGoalMarker,
  buildScenery,
  buildStartHouse,
  buildStreetLamp,
  lambert,
} from './scenery';

const GRASS_A = 0xa9dd9d;
const GRASS_B = 0x9ed394;
const SLOT_SAND = 0xf0e2b6;
const SLOT_HIGHLIGHT = 0xffc9d8;
/** ヒント place: 常時ほんのり明るい色(ハイライトと同系のやわらかいピンク) */
const SLOT_HINT_PLACE = 0xffc9d8;
/** ヒント remove: 既存オレンジ系で「はずしてね」を伝える(design-guide 6.2 / UI --orange-strong) */
const SLOT_HINT_REMOVE = 0xf2903d;
const BASE_BROWN = 0xd9b98c;

/** ヒント演出の見た目指示(判定ロジックは game/ 側。scene は色だけ切り替える) */
export type HintSlotStyle = 'place' | 'remove';

/** テーマ別の地面色(すべて design-guide 6.2 の既存パレット内) */
const THEME_GROUND: Record<StageTheme, [number, number]> = {
  // 雪: 白 + 水色の家壁色
  snow: [0xffffff, 0xe4f3ff],
  // あたたかい夜: 桃色壁 + クリーム(空は変えず、地面だけで夕暮れ感)
  night: [0xffe3e9, 0xfff3dd],
  // ちゅうかがい: 通常芝生をやや暖色寄りに(緑系パレット内)
  chinatown: [0x7fcf74, 0xa9dd9d],
  // おまつり: 花色の淡い市松
  festival: [0xffe3e9, 0xf3ffe0],
};

export interface Town {
  group: THREE.Group;
  /** タップ判定用の地面タイル(userData.cell に GridPos) */
  cellTiles: THREE.Mesh[];
  /** パネル選択中に空きマスを目立たせる */
  setSlotsHighlighted(highlighted: boolean, isEmpty: (pos: GridPos) => boolean): void;
  /** しばちゃんヒント: 特定スロットをやわらかく光らせる。null で解除 */
  setHintSlot(pos: GridPos | null, style?: HintSlotStyle): void;
  /** ヒント発火時のきらっと1回(ループしない) */
  flashHintSlot(pos: GridPos): void;
}

export function buildTown(stage: StageDef): Town {
  const group = new THREE.Group();
  const cellTiles: THREE.Mesh[] = [];
  const slotTiles = new Map<string, THREE.Mesh>();
  const slotKeys = new Set(stage.slots.map(posKey));
  const theme = stage.theme;
  const groundPair = theme ? THEME_GROUND[theme] : ([GRASS_A, GRASS_B] as [number, number]);
  let hintKey: string | null = null;
  let hintStyle: HintSlotStyle = 'place';
  let paletteHighlight = false;
  let paletteIsEmpty: ((pos: GridPos) => boolean) | null = null;

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
      const grass = (x + z) % 2 === 0 ? groundPair[0] : groundPair[1];
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
  const house = placeAt(buildStartHouse(theme), stage.start.pos, stage);
  const exitDir = DIR_OFFSET[connectionsOf('end', stage.start.rotation)[0]!];
  house.position.x -= exitDir.x * 0.3;
  house.position.z -= exitDir.z * 0.3;
  group.add(house);
  group.add(placeAt(buildGoalMarker(), stage.goal.pos, stage));

  // 添景(建物・木・花など)
  for (const item of stage.scenery) {
    group.add(placeAt(buildScenery(item.kind, item.pos, theme), item.pos, stage));
  }

  // 夜テーマ: 家のそばに街灯(盤面ロジックには触れない装飾)
  if (theme === 'night') {
    for (const item of stage.scenery) {
      if (item.kind === 'house') {
        const lamp = placeAt(buildStreetLamp(), item.pos, stage);
        lamp.position.x += 0.32;
        group.add(lamp);
      }
    }
  }

  function refreshSlotColors(): void {
    for (const [key, tile] of slotTiles) {
      const [x, z] = key.split(',').map(Number);
      const pos = { x: x!, z: z! };
      const material = tile.material as THREE.MeshLambertMaterial;
      if (hintKey === key) {
        material.color.setHex(hintStyle === 'remove' ? SLOT_HINT_REMOVE : SLOT_HINT_PLACE);
      } else if (paletteHighlight && paletteIsEmpty?.(pos)) {
        material.color.setHex(SLOT_HIGHLIGHT);
      } else {
        material.color.setHex(SLOT_SAND);
      }
    }
  }

  return {
    group,
    cellTiles,
    setSlotsHighlighted(highlighted, isEmpty) {
      paletteHighlight = highlighted;
      paletteIsEmpty = isEmpty;
      refreshSlotColors();
    },
    setHintSlot(pos, style = 'place') {
      hintKey = pos ? posKey(pos) : null;
      hintStyle = style;
      refreshSlotColors();
    },
    flashHintSlot(pos) {
      const tile = slotTiles.get(posKey(pos));
      if (!tile) return;
      const material = tile.material as THREE.MeshLambertMaterial;
      const hintColor = hintStyle === 'remove' ? SLOT_HINT_REMOVE : SLOT_HINT_PLACE;
      // きらっと1回だけ明るくして戻す(ループ点滅はしない)
      material.color.setHex(0xffffff);
      window.setTimeout(() => {
        material.color.setHex(hintKey === posKey(pos) ? hintColor : SLOT_SAND);
      }, 280);
    },
  };
}

function placeAt(object: THREE.Object3D, pos: GridPos, stage: StageDef): THREE.Object3D {
  const world = gridToWorld(pos, stage);
  object.position.set(world.x, 0, world.z);
  return object;
}
