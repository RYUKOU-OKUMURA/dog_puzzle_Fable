/** ステージ選択画面の表示データ */
export interface StageHeaderData {
  nameHtml: string;
  emoji: string;
  sub: string;
}

export interface StageTileData {
  id: string;
  /** ステージ名(かな) */
  name: string;
  /** 難度(🦴の数 1〜5) */
  difficulty: number;
  cleared: boolean;
  unlocked: boolean;
  /** 表示順(1始まり) */
  ordinal: number;
}

export interface StageSelectCallbacks {
  onPick(stageId: string): void;
  onBack(): void;
}

/** 🦴 を難度の数だけ並べる(難度表の 🦴1〜5) */
function bones(difficulty: number): string {
  return '🦴'.repeat(Math.max(0, Math.min(5, difficulty)));
}

/**
 * ステージ選択画面。選んだワールドの4ステージを 🦴(難度)・クリア済みマーク・ロック付きで並べる。
 * ワールド内は s1 がクリアされると s2〜s4 が解放される。実装待ちワールド(空)なら案内カード。
 */
export class StageSelectView {
  private readonly root: HTMLElement;
  private overlay: HTMLDivElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(
    world: StageHeaderData,
    tiles: readonly StageTileData[],
    callbacks: StageSelectCallbacks,
  ): void {
    this.hide();
    const overlay = document.createElement('div');
    overlay.className = 'screen screen-sky select-screen';

    const card = document.createElement('div');
    card.className = 'card select-card';

    const header = document.createElement('div');
    header.className = 'stage-select-header';
    header.innerHTML =
      `<span class="stage-select-emoji">${world.emoji}</span>` +
      `<span class="stage-select-name"></span>` +
      `<span class="stage-select-sub"></span>`;
    (header.querySelector('.stage-select-name') as HTMLElement).innerHTML = world.nameHtml;
    (header.querySelector('.stage-select-sub') as HTMLElement).textContent = world.sub;
    card.append(header);

    if (tiles.length === 0) {
      const soon = document.createElement('div');
      soon.className = 'coming-soon';
      soon.textContent = 'もうすぐ あそべる ようになるよ! たのしみに しててね 🐾';
      card.append(soon);
    } else {
      const grid = document.createElement('div');
      grid.className = 'stage-grid';
      for (const tile of tiles) grid.append(this.tile(tile, callbacks));
      card.append(grid);
    }

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-sub';
    backButton.textContent = 'せかいを えらぶ';
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

  private tile(stage: StageTileData, callbacks: StageSelectCallbacks): HTMLElement {
    if (!stage.unlocked) {
      const tile = document.createElement('div');
      tile.className = 'select-tile stage-tile is-locked';
      tile.innerHTML =
        `<span class="stage-tile-num">${stage.ordinal}</span>` +
        `<span class="select-tile-emoji">🔒</span>` +
        `<span class="stage-tile-locked">まだ あそべないよ</span>`;
      return tile;
    }

    const button = document.createElement('button');
    button.className = 'select-tile stage-tile';
    if (stage.cleared) button.classList.add('is-cleared');

    button.innerHTML =
      `<span class="stage-tile-num">${stage.ordinal}</span>` +
      `<span class="stage-tile-name"></span>` +
      `<span class="stage-tile-bones">${bones(stage.difficulty)}</span>` +
      (stage.cleared ? '<span class="select-tile-badge is-done">クリアずみ ⭐</span>' : '');
    (button.querySelector('.stage-tile-name') as HTMLElement).textContent = stage.name;
    button.addEventListener('click', () => callbacks.onPick(stage.id));
    return button;
  }
}
