/** ワールド選択画面に並べる1ワールドぶんの表示データ(ゲーム側で組立) */
export interface WorldTileData {
  id: string;
  /** 表示名(<ruby> を含むHTML) */
  nameHtml: string;
  emoji: string;
  sub: string;
  unlocked: boolean;
  /** ステージが1つでもある(実装済み)か。未実装ワールドは false */
  implemented: boolean;
  clearedCount: number;
  total: number;
}

export interface WorldSelectCallbacks {
  onPick(worldId: string): void;
  onBack(): void;
}

/**
 * せかい(ワールド)選択画面。5ワールドを世界地図風のタイルで並べる。
 * 未解放ワールドはロック表示(タップ不可)、実装待ちワールドは「もうすぐ とうじょう」。
 */
export class WorldSelectView {
  private readonly root: HTMLElement;
  private overlay: HTMLDivElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(worlds: readonly WorldTileData[], callbacks: WorldSelectCallbacks): void {
    this.hide();
    const overlay = document.createElement('div');
    overlay.className = 'screen screen-sky select-screen';

    const card = document.createElement('div');
    card.className = 'card select-card';

    const heading = document.createElement('h2');
    heading.textContent = 'せかいを えらぼう 🌍';
    card.append(heading);

    const grid = document.createElement('div');
    grid.className = 'world-grid';
    for (const world of worlds) {
      grid.append(this.tile(world, callbacks));
    }
    card.append(grid);

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-sub';
    backButton.textContent = 'タイトルに もどる';
    backButton.addEventListener('click', () => callbacks.onBack());
    card.append(backButton);

    overlay.append(card);
    this.root.append(overlay);
    this.overlay = overlay;
  }

  hide(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  private tile(world: WorldTileData, callbacks: WorldSelectCallbacks): HTMLElement {
    if (!world.unlocked) {
      const tile = document.createElement('div');
      tile.className = 'select-tile is-locked';
      tile.innerHTML =
        `<span class="select-tile-emoji">🔒</span>` +
        `<span class="select-tile-name"></span>` +
        `<span class="select-tile-sub">まえの せかいを ぜんぶ クリアしてね</span>`;
      (tile.querySelector('.select-tile-name') as HTMLElement).innerHTML = world.nameHtml;
      return tile;
    }

    const button = document.createElement('button');
    button.className = 'select-tile';
    if (!world.implemented) button.classList.add('is-soon');

    const status = world.implemented
      ? world.clearedCount >= world.total && world.total > 0
        ? '<span class="select-tile-badge is-done">クリアずみ ⭐</span>'
        : `<span class="select-tile-badge">${world.clearedCount}/${world.total} クリア</span>`
      : '<span class="select-tile-badge is-soon">もうすぐ とうじょう</span>';

    button.innerHTML =
      `<span class="select-tile-emoji">${world.emoji}</span>` +
      `<span class="select-tile-name"></span>` +
      `<span class="select-tile-sub"></span>` +
      status;
    (button.querySelector('.select-tile-name') as HTMLElement).innerHTML = world.nameHtml;
    (button.querySelector('.select-tile-sub') as HTMLElement).textContent = world.sub;
    button.addEventListener('click', () => callbacks.onPick(world.id));
    return button;
  }
}
