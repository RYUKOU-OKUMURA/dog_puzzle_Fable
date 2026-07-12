/** グリッド座標系: x は東(+)西(-)、z は南(+)北(-)。Three.js の XZ 平面と一致させる */
export interface GridPos {
  x: number;
  z: number;
}

export type Dir = 'N' | 'E' | 'S' | 'W';

/** 'end' はスタート(おうち)・ゴール専用の端点。プレイヤーは配置できない */
export type PanelKind = 'straight' | 'corner' | 'tee' | 'end';

export type Rotation = 0 | 90 | 180 | 270;

export interface Panel {
  kind: PanelKind;
  rotation: Rotation;
  /** ステージ定義済みの固定道路(回転・取り外し不可) */
  fixed: boolean;
}

export type SceneryKind = 'house' | 'building' | 'tree' | 'flower' | 'pond' | 'torii';

export interface StageDef {
  id: string;
  /** 表示名(ふりがな用に <ruby> を含んでよい) */
  name: string;
  size: { w: number; h: number };
  /** スタート(おうち)。end パネルとして盤面に置かれる */
  start: { pos: GridPos; rotation: Rotation };
  /** ゴール。end パネルとして盤面に置かれる */
  goal: { pos: GridPos; rotation: Rotation };
  fixedRoads: { pos: GridPos; kind: PanelKind; rotation: Rotation }[];
  /** プレイヤーがパネルを置ける空きマス */
  slots: GridPos[];
  scenery: { pos: GridPos; kind: SceneryKind }[];
  /** ゴールで出会う犬種ID */
  encounterDogId: string;
}

export function posKey(pos: GridPos): string {
  return `${pos.x},${pos.z}`;
}

export function posEquals(a: GridPos, b: GridPos): boolean {
  return a.x === b.x && a.z === b.z;
}
