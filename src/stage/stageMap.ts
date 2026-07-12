import type {
  Dir,
  GridPos,
  PanelKind,
  Rotation,
  SceneryKind,
  StageDef,
} from '../core/types';

/** defineStage への入力(テキスト地図フォーマット) */
export interface StageMapInput {
  id: string;
  /** 表示名(<ruby> を含んでよい) */
  name: string;
  /** 所属ワールドID(例: 'w1')。ワールド選択(M4)で使用 */
  world: string;
  /** ゴールで出会う犬種ID */
  encounterDogId: string;
  /** 1行=1マス行、トークンは空白区切り。行・列数は自由(最大10×10) */
  map: string[];
  /** おやつのマス 'x,z'。M5(おやつ収集)から使用。M1では保持のみ */
  treats?: string[];
  /** プレイヤーが使えるパネル種。M6(パレット制限)から使用。M1では保持のみ */
  palette?: PanelKind[];
}

/** parseStageMap の戻り値(空間情報) */
export interface ParsedStageMap {
  size: { w: number; h: number };
  start: { pos: GridPos; rotation: Rotation };
  goal: { pos: GridPos; rotation: Rotation };
  fixedRoads: { pos: GridPos; kind: PanelKind; rotation: Rotation }[];
  slots: GridPos[];
  scenery: { pos: GridPos; kind: SceneryKind }[];
}

/** 地図の不正を具体的な日本語メッセージで伝える */
export class StageMapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StageMapError';
  }
}

/** 失敗は必ず StageMapError で投げる(呼び元で種別判定できるように) */
function fail(message: string): never {
  throw new StageMapError(message);
}

const GRASS_TOKEN = '.';
const SLOT_TOKEN = '□';
const START_TOKEN = '★';
const GOAL_TOKEN = '◎';
const MAX_SIZE = 10;

const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];

/** 隣接マスの方向オフセット(core/panel と同じ規約。stage/ からは import できないので局所定義) */
const DIR_OFFSET: Readonly<Record<Dir, GridPos>> = {
  N: { x: 0, z: -1 },
  E: { x: 1, z: 0 },
  S: { x: 0, z: 1 },
  W: { x: -1, z: 0 },
};

/** end パネル(スタート・ゴール)を各方向へ向ける回転(基準0°=北) */
const END_ROTATION: Readonly<Record<Dir, Rotation>> = {
  N: 0,
  E: 90,
  S: 180,
  W: 270,
};

/** 添景トークン → 種別。'鳥' は鳥居(とりい) */
export const SCENERY_TOKENS: Readonly<Record<string, SceneryKind>> = {
  '木': 'tree',
  '家': 'house',
  'ビ': 'building',
  '花': 'flower',
  '池': 'pond',
  '鳥': 'torii',
};

/**
 * 固定道トークン → {種別, 回転, 接続方向}。
 * 文字の形が接続方向を表す。connections は connectionsOf(kind,rotation) と一致する(テストで交叉検証)。
 */
export const ROAD_TOKENS: Readonly<
  Record<string, { kind: PanelKind; rotation: Rotation; connections: readonly Dir[] }>
> = {
  '│': { kind: 'straight', rotation: 0, connections: ['N', 'S'] }, // 南北
  '─': { kind: 'straight', rotation: 90, connections: ['E', 'W'] }, // 東西
  '└': { kind: 'corner', rotation: 0, connections: ['N', 'E'] }, // 北・東
  '┌': { kind: 'corner', rotation: 90, connections: ['E', 'S'] }, // 東・南
  '┐': { kind: 'corner', rotation: 180, connections: ['S', 'W'] }, // 南・西
  '┘': { kind: 'corner', rotation: 270, connections: ['N', 'W'] }, // 北・西
  '┴': { kind: 'tee', rotation: 0, connections: ['W', 'N', 'E'] }, // 西・北・東(南が閉じる)
  '├': { kind: 'tee', rotation: 90, connections: ['N', 'S', 'E'] }, // 北・南・東(西が閉じる)
  '┬': { kind: 'tee', rotation: 180, connections: ['W', 'E', 'S'] }, // 西・東・南(北が閉じる)
  '┤': { kind: 'tee', rotation: 270, connections: ['N', 'S', 'W'] }, // 北・南・西(東が閉じる)
};

/**
 * テキスト地図を空間情報に変換する。
 * チェック順序は利用者へのエラーメッセージ手がかりを安定させるため仕様通りに固定。
 */
export function parseStageMap(map: string[]): ParsedStageMap {
  // 1. 空配列
  if (map.length === 0) {
    fail('地図が ありません(空の地図です)');
  }

  // 2. トークン分割(空白区切り)
  const grid: string[][] = map.map((row) =>
    row.trim().split(/\s+/).filter((t) => t.length > 0),
  );

  // 3. たて幅
  const h = grid.length;
  if (h > MAX_SIZE) {
    fail(`地図が おおきすぎます(たて ${h}マス)。最大 ${MAX_SIZE} までです`);
  }

  // 4. よこ幅(1行目を基準)
  const w = grid[0]!.length;
  if (w === 0) {
    fail('地図の よこはばが 0 です');
  }
  if (w > MAX_SIZE) {
    fail(`地図が おおきすぎます(よこ ${w}マス)。最大 ${MAX_SIZE} までです`);
  }

  // 5. 各行のよこ幅が揃っているか
  for (let z = 0; z < h; z++) {
    if (grid[z]!.length !== w) {
      fail(`${z + 1}行目: よこの ながさが そろっていません(${w}マスであるべきです)`);
    }
  }

  // 6. 各セルの分類
  const fixedRoads: { pos: GridPos; kind: PanelKind; rotation: Rotation }[] = [];
  // 盤外チェック用に接続方向も保持(fixedRoads には connections を含めないため)
  const roadsForBounds: { pos: GridPos; connections: readonly Dir[] }[] = [];
  const slots: GridPos[] = [];
  const scenery: { pos: GridPos; kind: SceneryKind }[] = [];
  let startHolder: { pos: GridPos } | null = null;
  let goalHolder: { pos: GridPos } | null = null;

  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const token = grid[z]![x]!;
      if (token === GRASS_TOKEN) {
        // 芝生は配置なし
      } else if (token === SLOT_TOKEN) {
        slots.push({ x, z });
      } else if (token === START_TOKEN) {
        if (startHolder) fail('スタート(★)が 2つ以上 あります');
        startHolder = { pos: { x, z } };
      } else if (token === GOAL_TOKEN) {
        if (goalHolder) fail('ゴール(◎)が 2つ以上 あります');
        goalHolder = { pos: { x, z } };
      } else {
        const road = ROAD_TOKENS[token];
        if (road) {
          fixedRoads.push({ pos: { x, z }, kind: road.kind, rotation: road.rotation });
          roadsForBounds.push({ pos: { x, z }, connections: road.connections });
        } else {
          const scene = SCENERY_TOKENS[token];
          if (scene) {
            scenery.push({ pos: { x, z }, kind: scene });
          } else {
            fail(`${z + 1}行 ${x + 1}列目: 「${token}」は つかえない きごう です`);
          }
        }
      }
    }
  }

  // 7. 必須マスの存在
  if (!startHolder) fail('スタート(★)が ありません');
  if (!goalHolder) fail('ゴール(◎)が ありません');

  // 8. 道が盤外を向かないか(向いていたら地図の書き間違い)
  for (const road of roadsForBounds) {
    for (const dir of road.connections) {
      const offset = DIR_OFFSET[dir];
      const nx = road.pos.x + offset.x;
      const nz = road.pos.z + offset.z;
      if (nx < 0 || nx >= w || nz < 0 || nz >= h) {
        fail(`${road.pos.z + 1}行 ${road.pos.x + 1}列目の みちが ばんめんの そとを むいています`);
      }
    }
  }

  // 9,10. 端点の向きは隣接する道/スロットから自動決定
  const startRotation = deriveEndRotation(startHolder.pos, w, h, grid, 'スタート(★)');
  const goalRotation = deriveEndRotation(goalHolder.pos, w, h, grid, 'ゴール(◎)');

  return {
    size: { w, h },
    start: { pos: startHolder.pos, rotation: startRotation },
    goal: { pos: goalHolder.pos, rotation: goalRotation },
    fixedRoads,
    slots,
    scenery,
  };
}

/**
 * スタート・ゴール(end パネル)の向きを決める。
 * 隣接する「道 or スロット」が1方向だけならそこを向く。0個・複数は地図の不整合。
 */
function deriveEndRotation(
  pos: GridPos,
  w: number,
  h: number,
  grid: string[][],
  label: string,
): Rotation {
  const candidates: Dir[] = [];
  for (const dir of DIRS) {
    const offset = DIR_OFFSET[dir];
    const nx = pos.x + offset.x;
    const nz = pos.z + offset.z;
    if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
    const neighbor = grid[nz]![nx]!;
    // 位置ベースで判定: 道か空きスロットだけを「つながり先」の候補にする
    if (neighbor === SLOT_TOKEN || ROAD_TOKENS[neighbor]) {
      candidates.push(dir);
    }
  }
  if (candidates.length === 0) {
    fail(`${label}の まわりに つながる みちが ありません`);
  }
  if (candidates.length > 1) {
    fail(`${label}の むきが きめられません(つながりそうな みちが たくさん あります)`);
  }
  return END_ROTATION[candidates[0]!];
}

/** テキスト地図から StageDef を組み立てる(M1 以降のステージ定義はこれ経由で書く) */
export function defineStage(input: StageMapInput): StageDef {
  const parsed = parseStageMap(input.map);
  return {
    id: input.id,
    name: input.name,
    world: input.world,
    size: parsed.size,
    start: parsed.start,
    goal: parsed.goal,
    fixedRoads: parsed.fixedRoads,
    slots: parsed.slots,
    scenery: parsed.scenery,
    encounterDogId: input.encounterDogId,
    treats: input.treats,
    palette: input.palette,
  };
}
