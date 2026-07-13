import { connectionsOf, nextRotation } from './panel';
import type { Dir, GridPos, Panel, PanelKind, Rotation, StageDef } from './types';
import { posKey } from './types';

/**
 * 盤面の状態。スタート・ゴール・固定道路・プレイヤー配置パネルをすべて保持する。
 * Three.js には依存しない純ロジック。
 */
export class Grid {
  readonly stage: StageDef;
  private readonly panels = new Map<string, Panel>();
  private readonly slotSet: Set<string>;

  constructor(stage: StageDef) {
    this.stage = stage;
    this.slotSet = new Set(stage.slots.map(posKey));

    this.setFixed(stage.start.pos, 'end', stage.start.rotation);
    this.setFixed(stage.goal.pos, 'end', stage.goal.rotation);
    for (const road of stage.fixedRoads) {
      this.setFixed(road.pos, road.kind, road.rotation);
    }
  }

  private setFixed(pos: GridPos, kind: PanelKind, rotation: Rotation): void {
    this.panels.set(posKey(pos), { kind, rotation, fixed: true });
  }

  inBounds(pos: GridPos): boolean {
    return pos.x >= 0 && pos.x < this.stage.size.w && pos.z >= 0 && pos.z < this.stage.size.h;
  }

  isSlot(pos: GridPos): boolean {
    return this.slotSet.has(posKey(pos));
  }

  panelAt(pos: GridPos): Panel | undefined {
    return this.panels.get(posKey(pos));
  }

  /** 空きマスかつ未配置なら true */
  canPlace(pos: GridPos): boolean {
    return this.isSlot(pos) && !this.panels.has(posKey(pos));
  }

  place(pos: GridPos, kind: PanelKind, rotation: Rotation = 0): boolean {
    if (!this.canPlace(pos)) return false;
    // palette 指定時は許可種以外を拒否(UI から到達不能でも core 層の防御)
    const allowed = this.stage.palette;
    if (allowed && !allowed.includes(kind)) return false;
    this.panels.set(posKey(pos), { kind, rotation, fixed: false });
    return true;
  }

  /** 配置済みプレイヤーパネルを90°回す。固定パネルは回せない */
  rotate(pos: GridPos): boolean {
    const panel = this.panels.get(posKey(pos));
    if (!panel || panel.fixed) return false;
    panel.rotation = nextRotation(panel.rotation);
    return true;
  }

  /** 配置済みプレイヤーパネルを取り外す。固定パネルは外せない */
  remove(pos: GridPos): boolean {
    const panel = this.panels.get(posKey(pos));
    if (!panel || panel.fixed) return false;
    this.panels.delete(posKey(pos));
    return true;
  }

  /** そのマスのパネルの接続方向(パネルが無ければ null) */
  connectionsAt(pos: GridPos): Dir[] | null {
    const panel = this.panels.get(posKey(pos));
    if (!panel) return null;
    return connectionsOf(panel.kind, panel.rotation);
  }
}
