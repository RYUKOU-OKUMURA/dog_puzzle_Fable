import type { Grid } from './grid';
import { DIR_OFFSET, OPPOSITE } from './panel';
import type { GridPos } from './types';
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
   */
  route: GridPos[];
}

/**
 * スタートから BFS して経路判定。状態を「(マス, 取ったおやつの集合ビットマスク)」に拡張し、
 * 全おやつを通ってゴールに至るルートを探す。近道があってもおやつを通る側を返す。
 * 隣接セル同士は「双方が互いに向けて接続を持つ」ときだけつながる。
 */
export function findPath(grid: Grid): PathResult {
  const start = grid.stage.start.pos;
  const goalPos = grid.stage.goal.pos;
  const goalKey = posKey(goalPos);

  const treats = (grid.stage.treats ?? []).slice(0, MAX_TREATS);
  // 同一座標のおやつは1つにまとめる(重複させると到達不能ビットが残り、永遠にクリアできなくなる)
  const treatBit = new Map<string, number>();
  for (const p of treats) {
    const key = posKey(p);
    if (!treatBit.has(key)) treatBit.set(key, 1 << treatBit.size);
  }
  const allTreats = (1 << treatBit.size) - 1;

  // 状態 = posKey + ':' + mask。parent でルート復元。
  const parent = new Map<string, { pos: GridPos; fromKey: string | null }>();
  const dist = new Map<string, number>();
  // スタートマスにおやつがあれば最初から取得済み(スタートは「到着」扱いにならないため)
  const startMask = treatBit.get(posKey(start)) ?? 0;
  const startKey = stateKey(start, startMask);
  parent.set(startKey, { pos: start, fromKey: null });
  dist.set(startKey, 0);

  const queue: Array<{ pos: GridPos; mask: number }> = [{ pos: start, mask: startMask }];
  let goalReached = false;
  let completeKey: string | null = null;
  // 道未完成時の首かしげ用: 到達した中で最遠の状態
  let furthestKey = startKey;

  while (queue.length > 0) {
    const { pos: current, mask } = queue.shift()!;
    const curKey = stateKey(current, mask);
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

    const connections = grid.connectionsAt(current);
    if (!connections) continue;

    for (const dir of connections) {
      const offset = DIR_OFFSET[dir];
      const next = { x: current.x + offset.x, z: current.z + offset.z };
      if (!grid.inBounds(next)) continue;
      const nextConns = grid.connectionsAt(next);
      if (!nextConns || !nextConns.includes(OPPOSITE[dir])) continue;

      // おやつマスを通ったら対応ビットを立てる
      const nextMask = mask | (treatBit.get(posKey(next)) ?? 0);
      const nKey = stateKey(next, nextMask);
      if (parent.has(nKey)) continue;

      parent.set(nKey, { pos: next, fromKey: curKey });
      dist.set(nKey, curDist + 1);
      queue.push({ pos: next, mask: nextMask });
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

function stateKey(pos: GridPos, mask: number): string {
  return `${posKey(pos)}:${mask}`;
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
