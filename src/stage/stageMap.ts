import type {
  Dir,
  GridPos,
  PanelKind,
  Rotation,
  SceneryKind,
  StageDef,
  StageTheme,
} from '../core/types';
import { MAX_TREATS, PLAYER_PANEL_KINDS, posKey } from '../core/types';

/** defineStage への入力(テキスト地図フォーマット) */
export interface StageMapInput {
  id: string;
  /** 表示名(<ruby> を含んでよい) */
  name: string;
  /** 所属ワールドID(例: 'w1')。ワールド選択(M4)で使用 */
  world: string;
  /** ゴールで出会う犬種ID */
  encounterDogId: string;
  /** audio層の曲レジストリを参照するBGM ID */
  bgmTrackId: string;
  /** 難度(🦴1〜5)。ステージ選択画面(M4)の表示に使う */
  difficulty?: number;
  /** 1行=1マス行、トークンは空白区切り。行・列数は自由(最大12×12) */
  map: string[];
  /** おやつのマス 'x,z'。M5(おやつ収集)から使用。M1では保持のみ */
  treats?: string[];
  /** プレイヤーが使えるパネル種。未指定は全種。defineStage で検証済み */
  palette?: PanelKind[];
  /** W5 変化球テーマ(雪・夜など)。未指定は通常 */
  theme?: StageTheme;
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
/**
 * 特殊トークン(芝生・スロット・スタート・ゴール)。ROAD_TOKENS・SCENERY_TOKENS とは別の
 * 名前空間で管理しているため、新トークン追加時に重複しないかをここでまとめて検証できるようにする
 * (M12 で障害物トークンなどを足すときの安全網。tests/stageMap.test.ts で交叉検証)。
 */
export const RESERVED_TOKENS: readonly string[] = [
  GRASS_TOKEN,
  SLOT_TOKEN,
  START_TOKEN,
  GOAL_TOKEN,
];
// M10: 盤面大型化に対応。iPad縦持ち(820px幅)で12×12でもセル約65pxを保てる上限。
// 14以上はパネルが小さくなりすぎるため採らない(plan.md M10 仕様)。
const MAX_SIZE = 12;

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

/** 添景トークン → 種別。'鳥' は鳥居(とりい)。'レ' はレンガの家、'電' はでんわボックス(W2〜)。'山' はゆきやま、'噴' はふんすい(W3〜)。'サ' はサボテン、'カ' はカラフルな家(W4〜)。'岩' はいわ、'柵' はこうじのさく(M12 障害物添景) */
export const SCENERY_TOKENS: Readonly<Record<string, SceneryKind>> = {
  木: 'tree',
  家: 'house',
  ビ: 'building',
  花: 'flower',
  池: 'pond',
  鳥: 'torii',
  レ: 'brickHouse',
  電: 'phoneBox',
  山: 'snowMountain',
  噴: 'fountain',
  サ: 'cactus',
  カ: 'colorfulHouse',
  岩: 'rock',
  柵: 'fence',
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
  // 橋: 上=南北 / 下=東西が独立。向きは1種。4方向とも盤内である必要がある
  橋: { kind: 'bridge', rotation: 0, connections: ['N', 'S', 'E', 'W'] },
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
    row
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0),
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
  validateBgmTrackId(input.bgmTrackId);
  // おやつは 'x,z' 文字列から座標へ変換し、盤外・道になり得ないマスを弾く(M5〜)
  const treats = input.treats ? parseTreats(input.treats, parsed) : undefined;
  // palette は空・重複・プレイヤー配置不可種を弾く。未指定は全種扱い(undefined のまま)
  const palette = input.palette !== undefined ? parsePalette(input.palette) : undefined;
  // 難度はステージ選択画面(M4)の🦴表示に直結するため、範囲外の値をここで弾く
  if (input.difficulty !== undefined) {
    validateDifficulty(input.difficulty);
  }
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
    bgmTrackId: input.bgmTrackId,
    difficulty: input.difficulty,
    treats,
    palette,
    theme: input.theme,
  };
}

/** stage層ではID形式だけを検証し、audioレジストリとの整合は横断テストで保証する。 */
function validateBgmTrackId(trackId: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trackId)) {
    fail(`bgmTrackId「${trackId}」は こもじ・すうじ・ハイフンで かいてください`);
  }
}

/** 難度(🦴)の範囲。ステージ選択画面(M4)の表示・plan.md の難度表と一致させる */
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;

/** 難度の検証。1〜5 の整数以外は StageMapError */
function validateDifficulty(difficulty: number): void {
  if (!Number.isInteger(difficulty) || difficulty < MIN_DIFFICULTY || difficulty > MAX_DIFFICULTY) {
    fail(
      `difficulty は ${MIN_DIFFICULTY}〜${MAX_DIFFICULTY} の せいすうで かいてください(いまは ${difficulty})`,
    );
  }
}

/** palette の検証。空・重複・PLAYER_PANEL_KINDS 外は StageMapError */
function parsePalette(palette: PanelKind[]): PanelKind[] {
  if (palette.length === 0) {
    fail('palette が からっぽ です(すくなくとも 1しゅるい ひつようです)');
  }
  const allowed = new Set<string>(PLAYER_PANEL_KINDS);
  const seen = new Set<PanelKind>();
  for (const kind of palette) {
    if (!allowed.has(kind)) {
      fail(`palette に 「${kind}」は つかえません(straight / corner / tee だけです)`);
    }
    if (seen.has(kind)) {
      fail(`palette に 「${kind}」が かさなっています`);
    }
    seen.add(kind);
  }
  return palette;
}

/** おやつは 'x,z' を座標に変換し、不正なら StageMapError。最大個数・重複もここで弾く */
function parseTreats(treats: string[], parsed: ParsedStageMap): GridPos[] {
  if (treats.length > MAX_TREATS) {
    fail(`おやつは ${MAX_TREATS}つまで です(${treats.length}つ あります)`);
  }

  // 道になり得るマス(スロット・固定道・スタート・ゴール)以外に置いたおやつは無効
  const roadable = new Set<string>();
  for (const s of parsed.slots) roadable.add(posKey(s));
  for (const r of parsed.fixedRoads) roadable.add(posKey(r.pos));
  roadable.add(posKey(parsed.start.pos));
  roadable.add(posKey(parsed.goal.pos));

  // 橋マスは上下どちらの道で取ったか曖昧になるため、おやつ禁止
  const bridgeCells = new Set(
    parsed.fixedRoads.filter((r) => r.kind === 'bridge').map((r) => posKey(r.pos)),
  );

  const result: GridPos[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < treats.length; i++) {
    const raw = treats[i]!.trim();
    const parts = raw.split(',').map((p) => p.trim());
    if (parts.length !== 2 || parts.some((p) => !/^\d+$/.test(p))) {
      fail(`おやつ ${i + 1}つめ: 「${raw}」は x,z の けいしき(すうじ,すうじ)で ありません`);
    }
    const x = Number(parts[0]!);
    const z = Number(parts[1]!);
    if (x < 0 || x >= parsed.size.w || z < 0 || z >= parsed.size.h) {
      fail(`おやつ ${i + 1}つめ: (${x},${z}) は ばんめんの そとです`);
    }
    if (bridgeCells.has(posKey({ x, z }))) {
      fail(`おやつ ${i + 1}つめ: はしの マスには おやつを おけません`);
    }
    if (!roadable.has(posKey({ x, z }))) {
      fail(
        `おやつ ${i + 1}つめ: ${z + 1}行 ${x + 1}列め には みちが とおれません(くさ か ていけいの うえ です)`,
      );
    }
    if (seen.has(posKey({ x, z }))) {
      fail(`おやつ ${i + 1}つめ: (${x},${z}) と おなじ ばしょに 2つ おやつが あります`);
    }
    seen.add(posKey({ x, z }));
    result.push({ x, z });
  }
  return result;
}
