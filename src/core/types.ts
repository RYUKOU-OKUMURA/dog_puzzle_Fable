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

export type SceneryKind =
  | 'house'
  | 'building'
  | 'tree'
  | 'flower'
  | 'pond'
  | 'torii'
  | 'brickHouse'
  | 'phoneBox';

export interface StageDef {
  id: string;
  /** 表示名(ふりがな用に <ruby> を含んでよい) */
  name: string;
  /** 所属ワールドID(例: 'w1')。ワールド選択(M4)で使用 */
  world?: string;
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
  /** 難度(🦴1〜5)。ステージ選択画面(M4)の表示と、難度表(plan.md)の照合に使う */
  difficulty?: number;
  /** おやつのマス(座標)。M5(おやつ収集)から使用。defineStage で 'x,z' 文字列から検証済み座標へ変換 */
  treats?: GridPos[];
  /** プレイヤーが使えるパネル種。M6(パレット制限)から使用 */
  palette?: PanelKind[];
}

/** おやつは最大3個(要件5.1)。core/path(経路判定)と stage/stageMap(パース検証)の両方から参照 */
export const MAX_TREATS = 3;

export function posKey(pos: GridPos): string {
  return `${pos.x},${pos.z}`;
}

export function posEquals(a: GridPos, b: GridPos): boolean {
  return a.x === b.x && a.z === b.z;
}
