import type { SaveData } from '../save/storage';
import { DOG_ORDER, DOGS } from '../stage/dogs';

/** おさんぽずかん(集めた犬種の思い出アルバム) */
export class ZukanView {
  private readonly root: HTMLElement;
  private overlay: HTMLDivElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(save: SaveData, onClose: () => void): void {
    this.hide();

    const overlay = document.createElement('div');
    overlay.className = 'screen screen-dim';

    const panel = document.createElement('div');
    panel.className = 'zukan-panel';

    const collected = DOG_ORDER.filter((id) => save.zukan[id]).length;
    const header = document.createElement('div');
    header.className = 'zukan-header';
    header.innerHTML =
      `<h2>おさんぽずかん 🐾</h2>` +
      `<span class="zukan-count">${collected}/${DOG_ORDER.length} しゅるい</span>`;

    const body = document.createElement('div');
    body.className = 'zukan-body';

    for (const dogId of DOG_ORDER) {
      const dog = DOGS[dogId]!;
      const entry = save.zukan[dogId];
      const card = document.createElement('div');
      card.className = 'dog-card';

      if (entry) {
        const photo = entry.photo
          ? `<img class="dog-photo" src="${entry.photo}" alt="${dog.shortName}" />`
          : `<div class="dog-photo unknown">🐕</div>`;
        card.innerHTML =
          photo +
          `<div class="dog-info">` +
          `<h3>${dog.nameHtml}</h3>` +
          `<div>🌏 うまれたくに: ${dog.originHtml}</div>` +
          `<div>💗 せいかく: ${dog.personality}</div>` +
          `<div>📏 おおきさ: ${dog.size}</div>` +
          `<div class="dog-trivia">💡 ${dog.trivia}</div>` +
          `</div>`;
      } else {
        card.innerHTML =
          `<div class="dog-photo unknown">?</div>` +
          `<div class="dog-info"><h3>???</h3><div>まだ であって いないよ</div></div>`;
      }
      body.append(card);
    }

    const closeRow = document.createElement('div');
    closeRow.className = 'close-row';
    const closeButton = document.createElement('button');
    closeButton.className = 'btn';
    closeButton.textContent = 'とじる';
    closeButton.addEventListener('click', () => {
      this.hide();
      onClose();
    });
    closeRow.append(closeButton);

    panel.append(header, body, closeRow);
    overlay.append(panel);
    this.root.append(overlay);
    this.overlay = overlay;
  }

  hide(): void {
    this.overlay?.remove();
    this.overlay = null;
  }
}
