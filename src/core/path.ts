import type { Grid } from './grid';
import { DIR_OFFSET, OPPOSITE } from './panel';
import type { GridPos } from './types';
import { posKey } from './types';

export interface PathResult {
  /** スタートからゴールまで道がつながっているか */
  complete: boolean;
  /**
   * 歩行ルート(セル列)。complete ならスタート→ゴール。
   * 未完成ならスタートから到達できる最遠セルまで(首かしげ演出用)。
   */
  route: GridPos[];
}

/**
 * スタートから BFS して経路判定。
 * 隣接セル同士は「双方が互いに向けて接続を持つ」ときだけつながる。
 */
export function findPath(grid: Grid): PathResult {
  const start = grid.stage.start.pos;
  const goalKey = posKey(grid.stage.goal.pos);

  const parent = new Map<string, GridPos | null>();
  const distance = new Map<string, number>();
  parent.set(posKey(start), null);
  distance.set(posKey(start), 0);

  const queue: GridPos[] = [start];
  let furthest = start;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = posKey(current);

    if (currentKey === goalKey) {
      return { complete: true, route: buildRoute(parent, current) };
    }
    if (distance.get(currentKey)! > distance.get(posKey(furthest))!) {
      furthest = current;
    }

    const connections = grid.connectionsAt(current);
    if (!connections) continue;

    for (const dir of connections) {
      const offset = DIR_OFFSET[dir];
      const next = { x: current.x + offset.x, z: current.z + offset.z };
      const nextKey = posKey(next);
      if (!grid.inBounds(next) || parent.has(nextKey)) continue;

      const nextConnections = grid.connectionsAt(next);
      if (!nextConnections || !nextConnections.includes(OPPOSITE[dir])) continue;

      parent.set(nextKey, current);
      distance.set(nextKey, distance.get(currentKey)! + 1);
      queue.push(next);
    }
  }

  return { complete: false, route: buildRoute(parent, furthest) };
}

function buildRoute(parent: Map<string, GridPos | null>, end: GridPos): GridPos[] {
  const route: GridPos[] = [];
  let current: GridPos | null = end;
  while (current) {
    route.unshift(current);
    current = parent.get(posKey(current)) ?? null;
  }
  return route;
}
