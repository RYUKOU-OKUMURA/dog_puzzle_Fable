import { PLAYER_PANEL_KINDS } from '../core/panel';
import type { GridPos, PanelKind } from '../core/types';
import { PANEL_ICONS, PANEL_LABELS } from './icons';

export interface HudCallbacks {
  onSelectPanel(kind: PanelKind | null): void;
  onStart(): void;
  onZukan(): void;
  onRotate(pos: GridPos): void;
  onRemove(pos: GridPos): void;
}

/** パズル中の操作UI(パレット・スタートボタン・パネル操作ポップアップ) */
export class Hud {
  private readonly root: HTMLElement;
  private readonly callbacks: HudCallbacks;
  private readonly top: HTMLDivElement;
  private readonly bottom: HTMLDivElement;
  private readonly paletteButtons = new Map<PanelKind, HTMLButtonElement>();
  private popup: HTMLDivElement | null = null;
  private popupPos: GridPos | null = null;
  private toastElement: HTMLDivElement | null = null;
  private toastTimer: number | undefined;

  constructor(root: HTMLElement, stageName: string, callbacks: HudCallbacks) {
    this.root = root;
    this.callbacks = callbacks;

    this.top = document.createElement('div');
    this.top.id = 'hud-top';
    const name = document.createElement('div');
    name.className = 'stage-name';
    name.textContent = stageName;
    const zukanButton = document.createElement('button');
    zukanButton.className = 'btn btn-pink';
    zukanButton.textContent = 'ずかん 🐾';
    zukanButton.addEventListener('click', () => callbacks.onZukan());
    this.top.append(name, zukanButton);

    this.bottom = document.createElement('div');
    this.bottom.id = 'hud-bottom';

    const palette = document.createElement('div');
    palette.className = 'palette';
    for (const kind of PLAYER_PANEL_KINDS) {
      const button = document.createElement('button');
      button.className = 'palette-btn';
      button.innerHTML = `${PANEL_ICONS[kind]}<span>${PANEL_LABELS[kind]}</span>`;
      button.addEventListener('click', () => {
        const nowSelected = !button.classList.contains('selected');
        callbacks.onSelectPanel(nowSelected ? kind : null);
      });
      palette.append(button);
      this.paletteButtons.set(kind, button);
    }

    const startButton = document.createElement('button');
    startButton.className = 'btn btn-big';
    startButton.textContent = 'おさんぽ スタート!';
    startButton.addEventListener('click', () => callbacks.onStart());

    this.bottom.append(palette, startButton);
    root.append(this.top, this.bottom);
  }

  setVisible(visible: boolean): void {
    this.top.classList.toggle('hidden', !visible);
    this.bottom.classList.toggle('hidden', !visible);
    if (!visible) this.hidePanelPopup();
  }

  setSelected(kind: PanelKind | null): void {
    for (const [buttonKind, button] of this.paletteButtons) {
      button.classList.toggle('selected', buttonKind === kind);
    }
  }

  /** 配置済みパネル用の「まわす / はずす」ポップアップ */
  showPanelPopup(pos: GridPos, screen: { x: number; y: number }): void {
    this.hidePanelPopup();
    this.popupPos = pos;

    const popup = document.createElement('div');
    popup.className = 'panel-popup';
    popup.style.left = `${screen.x}px`;
    popup.style.top = `${screen.y}px`;

    const rotateButton = document.createElement('button');
    rotateButton.className = 'pp-rotate';
    rotateButton.textContent = '🔄 まわす';
    rotateButton.addEventListener('click', () => {
      if (this.popupPos) this.callbacks.onRotate(this.popupPos);
    });

    const removeButton = document.createElement('button');
    removeButton.className = 'pp-remove';
    removeButton.textContent = '✋ はずす';
    removeButton.addEventListener('click', () => {
      if (this.popupPos) this.callbacks.onRemove(this.popupPos);
    });

    popup.append(rotateButton, removeButton);
    this.root.append(popup);
    this.popup = popup;
  }

  hidePanelPopup(): void {
    this.popup?.remove();
    this.popup = null;
    this.popupPos = null;
  }

  showToast(text: string, durationMs = 2400): void {
    this.toastElement?.remove();
    window.clearTimeout(this.toastTimer);

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    this.root.append(toast);
    this.toastElement = toast;
    this.toastTimer = window.setTimeout(() => {
      toast.remove();
      if (this.toastElement === toast) this.toastElement = null;
    }, durationMs);
  }
}
