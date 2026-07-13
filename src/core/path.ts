import type { Grid } from './grid';
import { DIR_OFFSET, OPPOSITE, exitsFrom } from './panel';
import type { Dir, GridPos, PanelKind } from './types';
import { MAX_TREATS, posKey } from './types';

export interface PathResult {
  /**
   * 全おやつを通過してゴールに至るルートがあるか。
   * おやつのないステージでは「ゴールに到達できるか」と同義(従来挙動)。
   */
  complete: boolean;
  /**
   * ゴールまで道がつながっているか(おやつは関係ない)。
   * complete=false のとき、goalReachable=true なら「おやつを取りこぼしている」。
   */
  goalReachable: boolean;
  /**
   * 歩行ルート(セル列)。
   * - complete: 全おやつを通ってゴールへ至るルート
   * - 道未完成(goalReachable=false): スタートから到達できる最遠セルまで(首かしげ演出用)
   * - おやつ残り(goalReachable=true & !complete): 歩かないので空
   * 橋の上下を両方通る場合、同じ座標が2回現れうる。
   */
  route: GridPos[];
}

/** 橋の通行軸。通常パネルは軸を持たない('-') */
type Passage = 'NS' | 'EW' | '-';

function passageOf(kind: PanelKind, enteredFrom: Dir | null): Passage {
  if (kind !== 'bridge' || enteredFrom === null) return '-';
  return enteredFrom === 'N' || enteredFrom === 'S' ? 'NS' : 'EW';
}

/**
 * スタートから BFS して経路判定。
 * 状態は「(マス, 橋の通行軸, 取ったおやつのビットマスク)」。
 * 橋は N↔S / E↔W が独立なので軸を状態に含める。橋以外は従来どおり (マス, mask) と同値。
 */
export function findPath(grid: Grid): PathResult {
  const start = grid.stage.start.pos;
  const goalPos = grid.stage.goal.pos;
  const goalKey = posKey(goalPos);

  // defineStage 経由なら起きないが、直接 StageDef を組んだときに超過分を黙って切り捨てると
  // 気づきにくい不具合になる。最大数を超えるなら仕様外として早く失敗させる。
  const treats = grid.stage.treats ?? [];
  if (treats.length > MAX_TREATS) {
    throw new Error(`おやつは ${MAX_TREATS}つまで です(${treats.length}つ あります)`);
  }
  // 同一座標のおやつは1つにまとめる(重複させると到達不能ビットが残り、永遠にクリアできなくなる)
  const treatBit = new Map<string, number>();
  for (const p of treats) {
    const key = posKey(p);
    if (!treatBit.has(key)) treatBit.set(key, 1 << treatBit.size);
  }
  const allTreats = (1 << treatBit.size) - 1;

  // 状態 = posKey + ':' + passage + ':' + mask。parent でルート復元。
  const parent = new Map<string, { pos: GridPos; fromKey: string | null }>();
  const dist = new Map<string, number>();
  // スタートマスにおやつがあれば最初から取得済み(スタートは「到着」扱いにならないため)
  const startMask = treatBit.get(posKey(start)) ?? 0;
  const startKey = stateKey(start, '-', startMask);
  parent.set(startKey, { pos: start, fromKey: null });
  dist.set(startKey, 0);

  const queue: Array<{ pos: GridPos; enteredFrom: Dir | null; mask: number }> = [
    { pos: start, enteredFrom: null, mask: startMask },
  ];
  let goalReached = false;
  let completeKey: string | null = null;
  // 道未完成時の首かしげ用: 到達した中で最遠の状態
  let furthestKey = startKey;

  while (queue.length > 0) {
    const { pos: current, enteredFrom, mask } = queue.shift()!;
    const panel = grid.panelAt(current);
    if (!panel) continue;
    const curPassage = passageOf(panel.kind, enteredFrom);
    const curKey = stateKey(current, curPassage, mask);
    const curDist = dist.get(curKey)!;
    const curPosKey = posKey(current);

    // 全おやつを抱えてゴールに着いた → 完成。BFSなので最初に見つかったものが最短。
    if (curPosKey === goalKey && mask === allTreats) {
      completeKey = curKey;
      break;
    }
    if (curPosKey === goalKey) {
      // ゴールには着いたがおやつが足りない(残りは分岐で判断)
      goalReached = true;
    }
    if (curDist > dist.get(furthestKey)!) furthestKey = curKey;

    const exits = exitsFrom(panel.kind, panel.rotation, enteredFrom);

    for (const dir of exits) {
      const offset = DIR_OFFSET[dir];
      const next = { x: current.x + offset.x, z: current.z + offset.z };
      if (!grid.inBounds(next)) continue;
      const nextPanel = grid.panelAt(next);
      if (!nextPanel) continue;
      const nextConns = grid.connectionsAt(next);
      if (!nextConns || !nextConns.includes(OPPOSITE[dir])) continue;

      // 隣マスへ dir で進むと、隣では OPPOSITE[dir] 側から進入する
      const nextEntered = OPPOSITE[dir];
      const nextPassage = passageOf(nextPanel.kind, nextEntered);

      // おやつマスを通ったら対応ビットを立てる
      const nextMask = mask | (treatBit.get(posKey(next)) ?? 0);
      const nKey = stateKey(next, nextPassage, nextMask);
      if (parent.has(nKey)) continue;

      parent.set(nKey, { pos: next, fromKey: curKey });
      dist.set(nKey, curDist + 1);
      queue.push({ pos: next, enteredFrom: nextEntered, mask: nextMask });
    }
  }

  if (completeKey) {
    return { complete: true, goalReachable: true, route: buildRoute(parent, completeKey) };
  }

  // 道未完成のときだけ部分ルートを返す(首かしげで歩くため)。
  // おやつ残り(goalReachable=true)のときは歩かないので空。
  const route = goalReached ? [] : buildRoute(parent, furthestKey);
  return { complete: false, goalReachable: goalReached, route };
}

function stateKey(pos: GridPos, passage: Passage, mask: number): string {
  return `${posKey(pos)}:${passage}:${mask}`;
}

function buildRoute(
  parent: Map<string, { pos: GridPos; fromKey: string | null }>,
  endKey: string,
): GridPos[] {
  const route: GridPos[] = [];
  let key: string | null = endKey;
  while (key) {
    const node: { pos: GridPos; fromKey: string | null } = parent.get(key)!;
    route.unshift(node.pos);
    key = node.fromKey;
  }
  return route;
}
