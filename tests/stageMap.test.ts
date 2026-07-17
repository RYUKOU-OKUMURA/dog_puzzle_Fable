import { describe, expect, it } from 'vitest';
import { connectionsOf } from '../src/core/panel';
import { Grid } from '../src/core/grid';
import type { GridPos, PanelKind, Rotation } from '../src/core/types';
import {
  RESERVED_TOKENS,
  ROAD_TOKENS,
  SCENERY_TOKENS,
  StageMapError,
  defineStage,
  parseStageMap,
} from '../src/stage/stageMap';
import { w1s1 } from '../src/stage/w1s1';

// セル順の比較ヘルパ(順序に依存させない)
const byGrid = (a: GridPos, b: GridPos): number => a.z - b.z || a.x - b.x;
const byCell = <T extends { pos: GridPos }>(a: T, b: T): number =>
  a.pos.z - b.pos.z || a.pos.x - b.pos.x;

describe('道トークンの接続が core/panel と一致する', () => {
  it('全トークンが connectionsOf と一致', () => {
    for (const [token, road] of Object.entries(ROAD_TOKENS)) {
      const expected = connectionsOf(road.kind, road.rotation).slice().sort();
      expect(road.connections.slice().sort(), `トークン「${token}」`).toEqual(expected);
    }
  });
  it('道トークンは11種(既存10+橋)', () => {
    expect(Object.keys(ROAD_TOKENS).length).toBe(11);
  });
  it('添景トークンは12種(既存10+サ+カ)', () => {
    expect(Object.keys(SCENERY_TOKENS).length).toBe(12);
  });
  it('W2の添景トークン(レ=レンガ家 / 電=でんわボックス)が含まれる', () => {
    expect(SCENERY_TOKENS['レ']).toBe('brickHouse');
    expect(SCENERY_TOKENS['電']).toBe('phoneBox');
  });
  it('W3の添景トークン(山=ゆきやま / 噴=ふんすい)が含まれる', () => {
    expect(SCENERY_TOKENS['山']).toBe('snowMountain');
    expect(SCENERY_TOKENS['噴']).toBe('fountain');
  });
  it('W4の添景トークン(サ=サボテン / カ=カラフルな家)が含まれる', () => {
    expect(SCENERY_TOKENS['サ']).toBe('cactus');
    expect(SCENERY_TOKENS['カ']).toBe('colorfulHouse');
  });
  it('橋トークンが bridge として含まれる', () => {
    expect(ROAD_TOKENS['橋']).toMatchObject({ kind: 'bridge', rotation: 0 });
  });
});

describe('parseStageMap: 正常系', () => {
  it('小さい地図を正しくパースする', () => {
    const parsed = parseStageMap(['★ ─ ◎', '.  □ .', '木 . 花']);
    expect(parsed.size).toEqual({ w: 3, h: 3 });
    // ★(0,0)の候補は東の道のみ → 90°
    expect(parsed.start).toEqual({ pos: { x: 0, z: 0 }, rotation: 90 });
    // ◎(2,0)の候補は西の道のみ → 270°
    expect(parsed.goal).toEqual({ pos: { x: 2, z: 0 }, rotation: 270 });
    expect(parsed.fixedRoads).toEqual([{ pos: { x: 1, z: 0 }, kind: 'straight', rotation: 90 }]);
    expect(parsed.slots).toEqual([{ x: 1, z: 1 }]);
    expect(parsed.scenery).toEqual([
      { pos: { x: 0, z: 2 }, kind: 'tree' },
      { pos: { x: 2, z: 2 }, kind: 'flower' },
    ]);
  });

  it('全道グリフが正しい kind/rotation に routing される(キー入れ替え検出)', () => {
    // 各グリフが Unicode の形の意味する (kind, rotation) に変換されることを独立に固定する。
    // この期待値はグリフの形から独自に定義(ROAD_TOKENS からは読まない)。
    // こうしないと ROAD_TOKENS のキー入れ替えバグを交叉検証だけで拾えない。
    const cases: Array<[string, { kind: PanelKind; rotation: Rotation }]> = [
      ['│', { kind: 'straight', rotation: 0 }], // 南北
      ['─', { kind: 'straight', rotation: 90 }], // 東西
      ['└', { kind: 'corner', rotation: 0 }], // 北・東
      ['┌', { kind: 'corner', rotation: 90 }], // 東・南
      ['┐', { kind: 'corner', rotation: 180 }], // 南・西
      ['┘', { kind: 'corner', rotation: 270 }], // 北・西
      ['┴', { kind: 'tee', rotation: 0 }], // 西・北・東
      ['├', { kind: 'tee', rotation: 90 }], // 北・南・東
      ['┬', { kind: 'tee', rotation: 180 }], // 西・東・南
      ['┤', { kind: 'tee', rotation: 270 }], // 北・南・西
      ['橋', { kind: 'bridge', rotation: 0 }],
    ];
    for (const [glyph, expected] of cases) {
      // グリフを3×3の中央(1,1)に置く。中央は四周とも盤内なので盤外チェックは通る。
      // ★(0,1)の候補は中央の道のみ→東(90°)、◎(2,1)は西(270°)。
      const parsed = parseStageMap(['. . .', `★ ${glyph} ◎`, '. . .']);
      expect(parsed.fixedRoads, `グリフ「${glyph}」`).toEqual([
        { pos: { x: 1, z: 1 }, kind: expected.kind, rotation: expected.rotation },
      ]);
      expect(parsed.start, `グリフ「${glyph}」の★向き`).toEqual({
        pos: { x: 0, z: 1 },
        rotation: 90,
      });
      expect(parsed.goal, `グリフ「${glyph}」の◎向き`).toEqual({
        pos: { x: 2, z: 1 },
        rotation: 270,
      });
    }
  });
});

describe('parseStageMap: エラー系', () => {
  it('空配列 → 地図なし', () => {
    const fn = () => parseStageMap([]);
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/地図が ありません/);
  });

  it('空行 → よこはば0', () => {
    expect(() => parseStageMap(['   '])).toThrow(/よこはばが 0/);
  });

  it('行長不一致', () => {
    expect(() => parseStageMap(['. .', '.'])).toThrow(/ながさが そろっていません/);
  });

  it('よこ13マス(上限12超過)', () => {
    expect(() => parseStageMap(['. . . . . . . . . . . . .'])).toThrow(
      /よこ 13マス\)。最大 12 まで/,
    );
  });

  it('たて13行(上限12超過)', () => {
    const rows = Array.from({ length: 13 }, () => '.');
    expect(() => parseStageMap(rows)).toThrow(/たて 13マス\)。最大 12 まで/);
  });

  it('12マスちょうどは許容される(境界)', () => {
    // 12×12 は上限内なのでサイズ検査は通る。1行目に★〜スロット〜◎の最小ルート。
    const slotRow = '★ □ □ □ □ □ □ □ □ □ □ ◎';
    const grassRow = '. . . . . . . . . . . .';
    const map = Array.from({ length: 12 }, (_, i) => (i === 0 ? slotRow : grassRow));
    const parsed = parseStageMap(map);
    expect(parsed.size).toEqual({ w: 12, h: 12 });
    expect(parsed.slots.length).toBe(10);
  });

  it('不明トークン', () => {
    expect(() => parseStageMap(['★ ◎ X'])).toThrow(/「X」は つかえない きごう/);
  });

  it('スタート(★)なし', () => {
    expect(() => parseStageMap(['. ◎'])).toThrow(/スタート\(★\)が ありません/);
  });

  it('スタート(★)が2つ', () => {
    expect(() => parseStageMap(['★ ★ ◎'])).toThrow(/スタート\(★\)が 2つ以上/);
  });

  it('ゴール(◎)なし', () => {
    expect(() => parseStageMap(['★ │'])).toThrow(/ゴール\(◎\)が ありません/);
  });

  it('ゴール(◎)が2つ', () => {
    expect(() => parseStageMap(['★ ◎ ◎'])).toThrow(/ゴール\(◎\)が 2つ以上/);
  });

  it('スタート孤立(候補0)', () => {
    expect(() => parseStageMap(['★ 花', '花 ◎'])).toThrow(
      /スタート\(★\)の まわりに つながる みちが ありません/,
    );
  });

  it('スタート曖昧(候補>1)', () => {
    expect(() => parseStageMap(['★ □', '□ ◎'])).toThrow(/スタート\(★\)の むきが きめられません/);
  });

  it('ゴール孤立(候補0)', () => {
    expect(() => parseStageMap(['★ ─ .', '木 . ◎'])).toThrow(
      /ゴール\(◎\)の まわりに つながる みちが ありません/,
    );
  });

  it('ゴール曖昧(候補>1)', () => {
    expect(() => parseStageMap(['★ ─ .', '花 ◎ □'])).toThrow(/ゴール\(◎\)の むきが きめられません/);
  });

  it('道が盤外を向く', () => {
    expect(() => parseStageMap(['★ │ ◎'])).toThrow(/みちが ばんめんの そとを むいています/);
  });
});

describe('defineStage: StageMapInput を StageDef に変換する', () => {
  it('メタ情報と空間情報が正しく受け継がれる', () => {
    const stage = defineStage({
      id: 'test',
      name: 'テスト',
      world: 'w1',
      encounterDogId: 'dog',
      map: ['★ ─ ◎'],
    });
    expect(stage.id).toBe('test');
    expect(stage.name).toBe('テスト');
    expect(stage.world).toBe('w1');
    expect(stage.encounterDogId).toBe('dog');
    expect(stage.size).toEqual({ w: 3, h: 1 });
    expect(stage.start).toEqual({ pos: { x: 0, z: 0 }, rotation: 90 });
    expect(stage.goal).toEqual({ pos: { x: 2, z: 0 }, rotation: 270 });
    expect(stage.fixedRoads).toEqual([{ pos: { x: 1, z: 0 }, kind: 'straight', rotation: 90 }]);
    expect(stage.treats).toBeUndefined();
    expect(stage.palette).toBeUndefined();
  });
});

describe('defineStage: treats のパースと検証', () => {
  // おやつ検証用の土台: ★(0,0)→─(1,0)→◎(2,0)、(1,1)にスロット
  const baseMap = ['★ ─ ◎', '.  □ .'];

  it('おやつなし(treats 省略)は undefined', () => {
    const stage = defineStage({
      id: 't',
      name: 't',
      world: 'w2',
      encounterDogId: 'd',
      map: baseMap,
    });
    expect(stage.treats).toBeUndefined();
  });

  it('おやつ空配列は []', () => {
    const stage = defineStage({
      id: 't',
      name: 't',
      world: 'w2',
      encounterDogId: 'd',
      map: baseMap,
      treats: [],
    });
    expect(stage.treats).toEqual([]);
  });

  it('スロット・固定道・端点マスのおやつを座標に変換する', () => {
    const stage = defineStage({
      id: 't',
      name: 't',
      world: 'w2',
      encounterDogId: 'd',
      map: baseMap,
      treats: ['1,0', '1,1', '0,0'], // 固定道・スロット・★
    });
    expect(stage.treats).toEqual([
      { x: 1, z: 0 },
      { x: 1, z: 1 },
      { x: 0, z: 0 },
    ]);
  });

  it('形式不正(カンマなし)は StageMapError', () => {
    const fn = () =>
      defineStage({
        id: 't',
        name: 't',
        world: 'w2',
        encounterDogId: 'd',
        map: baseMap,
        treats: ['1 0'],
      });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/x,z の けいしき/);
  });

  it('盤外は StageMapError', () => {
    const fn = () =>
      defineStage({
        id: 't',
        name: 't',
        world: 'w2',
        encounterDogId: 'd',
        map: baseMap,
        treats: ['9,9'],
      });
    expect(fn).toThrow(/ばんめんの そとです/);
  });

  it('芝生マスは StageMapError', () => {
    const fn = () =>
      defineStage({
        id: 't',
        name: 't',
        world: 'w2',
        encounterDogId: 'd',
        map: baseMap,
        treats: ['0,1'], // (0,1)は芝生
      });
    expect(fn).toThrow(/みちが とおれません/);
  });

  it('添景マスは StageMapError', () => {
    const fn = () =>
      defineStage({
        id: 't',
        name: 't',
        world: 'w2',
        encounterDogId: 'd',
        map: ['★ ─ ◎', '木 □ .'],
        treats: ['0,1'], // (0,1)は木
      });
    expect(fn).toThrow(/みちが とおれません/);
  });

  it('おやつ5つちょうどは通る(MAX_TREATS)', () => {
    const stage = defineStage({
      id: 't',
      name: 't',
      world: 'w2',
      encounterDogId: 'd',
      map: ['★ □ □ □ □ ◎'],
      treats: ['1,0', '2,0', '3,0', '4,0', '0,0'],
    });
    expect(stage.treats).toHaveLength(5);
  });

  it('おやつ6つは StageMapError(最大5)', () => {
    const fn = () =>
      defineStage({
        id: 't',
        name: 't',
        world: 'w2',
        encounterDogId: 'd',
        map: ['★ □ □ □ □ ◎'],
        treats: ['1,0', '2,0', '3,0', '4,0', '0,0', '5,0'],
      });
    expect(fn).toThrow(/5つまで/);
  });

  it('同じ座標に複数のおやつは StageMapError', () => {
    const fn = () =>
      defineStage({
        id: 't',
        name: 't',
        world: 'w2',
        encounterDogId: 'd',
        map: baseMap,
        treats: ['1,0', '1,0'],
      });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/おなじ ばしょ/);
  });

  it('橋マスのおやつは StageMapError', () => {
    const fn = () =>
      defineStage({
        id: 't',
        name: 't',
        world: 'w4',
        encounterDogId: 'd',
        // 橋は4方向が盤内、かつ上下の│も盤外を向かないよう余白つき
        map: ['. . . . .', '. . │ . .', '★ ─ 橋 ─ ◎', '. . │ . .', '. . . . .'],
        treats: ['2,2'],
      });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/はしの マスには おやつを おけません/);
  });
});

describe('parseStageMap: W2の添景トークン(レ・電)', () => {
  it('レ は brickHouse、電 は phoneBox として添景に並ぶ', () => {
    const parsed = parseStageMap(['★ ─ ◎', 'レ .  電']);
    expect(parsed.scenery).toContainEqual({ pos: { x: 0, z: 1 }, kind: 'brickHouse' });
    expect(parsed.scenery).toContainEqual({ pos: { x: 2, z: 1 }, kind: 'phoneBox' });
  });
});

describe('parseStageMap: W3の添景トークン(山・噴)', () => {
  it('山 は snowMountain、噴 は fountain として添景に並ぶ', () => {
    const parsed = parseStageMap(['★ ─ ◎', '山 .  噴']);
    expect(parsed.scenery).toContainEqual({ pos: { x: 0, z: 1 }, kind: 'snowMountain' });
    expect(parsed.scenery).toContainEqual({ pos: { x: 2, z: 1 }, kind: 'fountain' });
  });
});

describe('parseStageMap: W4の橋・添景トークン', () => {
  it('橋 は fixed な bridge パネルになる', () => {
    const parsed = parseStageMap([
      '. . . . .',
      '. . │ . .',
      '★ ─ 橋 ─ ◎',
      '. . │ . .',
      '. . . . .',
    ]);
    expect(parsed.fixedRoads).toContainEqual({
      pos: { x: 2, z: 2 },
      kind: 'bridge',
      rotation: 0,
    });
    // ★◎ が東西の固定道に隣接するので向きが決まる
    expect(parsed.start.rotation).toBe(90);
    expect(parsed.goal.rotation).toBe(270);
  });

  it('サ は cactus、カ は colorfulHouse として添景に並ぶ', () => {
    const parsed = parseStageMap(['★ ─ ◎', 'サ .  カ']);
    expect(parsed.scenery).toContainEqual({ pos: { x: 0, z: 1 }, kind: 'cactus' });
    expect(parsed.scenery).toContainEqual({ pos: { x: 2, z: 1 }, kind: 'colorfulHouse' });
  });
});

describe('defineStage: palette の検証', () => {
  const base = {
    id: 't',
    name: 't',
    world: 'w3',
    encounterDogId: 'd',
    map: ['★ ─ ◎'],
  };

  it('正常系: straight/corner がそのまま通る', () => {
    const stage = defineStage({ ...base, palette: ['straight', 'corner'] });
    expect(stage.palette).toEqual(['straight', 'corner']);
  });

  it('未指定は undefined(全種扱い)', () => {
    const stage = defineStage(base);
    expect(stage.palette).toBeUndefined();
  });

  it('空配列は StageMapError', () => {
    const fn = () => defineStage({ ...base, palette: [] });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/からっぽ/);
  });

  it('重複は StageMapError', () => {
    const fn = () => defineStage({ ...base, palette: ['straight', 'straight'] });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/かさなっています/);
  });

  it('PLAYER_PANEL_KINDS 外(end)は StageMapError', () => {
    const fn = () => defineStage({ ...base, palette: ['end'] as unknown as ['straight'] });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/つかえません/);
  });
});

describe('defineStage: difficulty の範囲検証', () => {
  const base = {
    id: 't',
    name: 't',
    world: 'w3',
    encounterDogId: 'd',
    map: ['★ ─ ◎'],
  };

  it('未指定は undefined のまま(検証しない)', () => {
    const stage = defineStage(base);
    expect(stage.difficulty).toBeUndefined();
  });

  it('1と5(範囲の両端)は許容される', () => {
    expect(defineStage({ ...base, difficulty: 1 }).difficulty).toBe(1);
    expect(defineStage({ ...base, difficulty: 5 }).difficulty).toBe(5);
  });

  it('0(範囲外・下)は StageMapError', () => {
    const fn = () => defineStage({ ...base, difficulty: 0 });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/1〜5 の せいすう/);
  });

  it('6(範囲外・上)は StageMapError', () => {
    const fn = () => defineStage({ ...base, difficulty: 6 });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/1〜5 の せいすう/);
  });

  it('2.5(整数でない)は StageMapError', () => {
    const fn = () => defineStage({ ...base, difficulty: 2.5 });
    expect(fn).toThrow(StageMapError);
    expect(fn).toThrow(/1〜5 の せいすう/);
  });
});

// M12 で障害物トークンなどを足すとき、既存の特殊トークン(RESERVED_TOKENS)や道/添景トークンと
// うっかり同じ文字を割り当てるのを防ぐための安全網。
describe('トークンの名前空間が重複しない(M12 以降の新トークン追加の安全網)', () => {
  it('RESERVED_TOKENS・ROAD_TOKENS・SCENERY_TOKENS のキーが互いに重複しない', () => {
    const roadKeys = Object.keys(ROAD_TOKENS);
    const sceneryKeys = Object.keys(SCENERY_TOKENS);
    const groups: Array<{ label: string; keys: readonly string[] }> = [
      { label: 'RESERVED_TOKENS', keys: RESERVED_TOKENS },
      { label: 'ROAD_TOKENS', keys: roadKeys },
      { label: 'SCENERY_TOKENS', keys: sceneryKeys },
    ];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const overlap = groups[i]!.keys.filter((k) => groups[j]!.keys.includes(k));
        expect(overlap, `${groups[i]!.label} と ${groups[j]!.label} の重複`).toEqual([]);
      }
    }
  });

  it('全トークンが空白を含まない1文字以上の文字列', () => {
    const allTokens = [
      ...RESERVED_TOKENS,
      ...Object.keys(ROAD_TOKENS),
      ...Object.keys(SCENERY_TOKENS),
    ];
    for (const token of allTokens) {
      expect(token.length, `トークン「${token}」の長さ`).toBeGreaterThan(0);
      expect(/\s/.test(token), `トークン「${token}」に空白を含まない`).toBe(false);
    }
  });
});

// stage01 移行検証の期待値(移行前の手書き定義と完全一致するはず)
const EXPECTED_SLOTS: GridPos[] = [
  { x: 1, z: 4 },
  { x: 4, z: 4 },
  { x: 6, z: 4 },
  { x: 4, z: 5 },
  { x: 2, z: 3 },
];
const EXPECTED_ROADS: { pos: GridPos; kind: string; rotation: number }[] = [
  { pos: { x: 1, z: 2 }, kind: 'straight', rotation: 0 },
  { pos: { x: 1, z: 3 }, kind: 'straight', rotation: 0 },
  { pos: { x: 2, z: 4 }, kind: 'straight', rotation: 90 },
  { pos: { x: 3, z: 4 }, kind: 'straight', rotation: 90 },
  { pos: { x: 4, z: 3 }, kind: 'straight', rotation: 0 },
  { pos: { x: 5, z: 4 }, kind: 'straight', rotation: 90 },
  { pos: { x: 6, z: 5 }, kind: 'straight', rotation: 0 },
];
const EXPECTED_SCENERY: { pos: GridPos; kind: string }[] = [
  { pos: { x: 0, z: 0 }, kind: 'tree' },
  { pos: { x: 1, z: 0 }, kind: 'building' },
  { pos: { x: 3, z: 0 }, kind: 'house' },
  { pos: { x: 5, z: 0 }, kind: 'tree' },
  { pos: { x: 6, z: 0 }, kind: 'building' },
  { pos: { x: 7, z: 0 }, kind: 'tree' },
  { pos: { x: 0, z: 1 }, kind: 'flower' },
  { pos: { x: 3, z: 1 }, kind: 'pond' },
  { pos: { x: 5, z: 1 }, kind: 'house' },
  { pos: { x: 7, z: 1 }, kind: 'tree' },
  { pos: { x: 0, z: 2 }, kind: 'tree' },
  { pos: { x: 2, z: 2 }, kind: 'house' },
  { pos: { x: 4, z: 2 }, kind: 'flower' },
  { pos: { x: 5, z: 2 }, kind: 'building' },
  { pos: { x: 6, z: 2 }, kind: 'tree' },
  { pos: { x: 0, z: 3 }, kind: 'flower' },
  { pos: { x: 3, z: 3 }, kind: 'tree' },
  { pos: { x: 5, z: 3 }, kind: 'house' },
  { pos: { x: 6, z: 3 }, kind: 'building' },
  { pos: { x: 7, z: 3 }, kind: 'tree' },
  { pos: { x: 0, z: 4 }, kind: 'tree' },
  { pos: { x: 7, z: 4 }, kind: 'house' },
  { pos: { x: 0, z: 5 }, kind: 'house' },
  { pos: { x: 2, z: 5 }, kind: 'tree' },
  { pos: { x: 3, z: 5 }, kind: 'flower' },
  { pos: { x: 5, z: 5 }, kind: 'tree' },
  { pos: { x: 7, z: 5 }, kind: 'flower' },
  { pos: { x: 0, z: 6 }, kind: 'tree' },
  { pos: { x: 1, z: 6 }, kind: 'building' },
  { pos: { x: 3, z: 6 }, kind: 'house' },
  { pos: { x: 4, z: 6 }, kind: 'tree' },
  { pos: { x: 5, z: 6 }, kind: 'flower' },
  { pos: { x: 7, z: 6 }, kind: 'tree' },
  { pos: { x: 0, z: 7 }, kind: 'flower' },
  { pos: { x: 2, z: 7 }, kind: 'tree' },
  { pos: { x: 4, z: 7 }, kind: 'house' },
  { pos: { x: 5, z: 7 }, kind: 'tree' },
  { pos: { x: 6, z: 7 }, kind: 'torii' },
  { pos: { x: 7, z: 7 }, kind: 'tree' },
];

describe('w1s1 のテキスト地図(stage01 からリネーム、地図本体は移行前と完全一致)', () => {
  it('メタ情報が w1-s1 へのリネームと難度追加を反映', () => {
    expect(w1s1.id).toBe('w1-s1');
    expect(w1s1.name).toBe('にほんの まち 1');
    expect(w1s1.world).toBe('w1');
    expect(w1s1.encounterDogId).toBe('akita');
    expect(w1s1.difficulty).toBe(1);
    expect(w1s1.treats).toEqual([]);
    expect(w1s1.palette).toEqual(['straight', 'corner', 'tee']);
  });

  it('サイズが 8×8', () => {
    expect(w1s1.size).toEqual({ w: 8, h: 8 });
  });

  it('スタート・ゴールの位置と向きが完全一致', () => {
    expect(w1s1.start).toEqual({ pos: { x: 1, z: 1 }, rotation: 180 });
    expect(w1s1.goal).toEqual({ pos: { x: 6, z: 6 }, rotation: 0 });
  });

  it('スロット位置が完全一致(順序問わず)', () => {
    expect([...w1s1.slots].sort(byGrid)).toEqual([...EXPECTED_SLOTS].sort(byGrid));
  });

  it('固定道が完全一致(位置・種別・回転・順序問わず)', () => {
    expect([...w1s1.fixedRoads].sort(byCell)).toEqual([...EXPECTED_ROADS].sort(byCell));
  });

  it('添景が完全一致(位置・種別・順序問わず)', () => {
    expect([...w1s1.scenery].sort(byCell)).toEqual([...EXPECTED_SCENERY].sort(byCell));
  });
});

describe('w1s1 を Grid が無変更で消費できる', () => {
  it('Grid が構築でき、固定道と端点が正しく置かれる', () => {
    const grid = new Grid(w1s1);
    // スタート・ゴールが end パネル
    expect(grid.panelAt(w1s1.start.pos)).toMatchObject({
      kind: 'end',
      rotation: 180,
      fixed: true,
    });
    expect(grid.panelAt(w1s1.goal.pos)).toMatchObject({
      kind: 'end',
      rotation: 0,
      fixed: true,
    });
    // 固定道7マスすべて固定パネル
    for (const road of w1s1.fixedRoads) {
      expect(grid.panelAt(road.pos)).toMatchObject({
        kind: road.kind,
        rotation: road.rotation,
        fixed: true,
      });
    }
    // スロットは配置可能
    for (const slot of w1s1.slots) {
      expect(grid.canPlace(slot)).toBe(true);
    }
    // 盤内判定
    expect(grid.inBounds({ x: 0, z: 0 })).toBe(true);
    expect(grid.inBounds({ x: 8, z: 8 })).toBe(false);
  });
});
