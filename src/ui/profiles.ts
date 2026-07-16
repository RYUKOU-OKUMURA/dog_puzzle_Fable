import type { Profile, ProfileIconId } from '../save/profiles';
import { MAX_PROFILES, validateName } from '../save/profiles';
import { PROFILE_ICONS, iconEmoji } from './icons';

export interface ProfilesViewCallbacks {
  /** 既存プロフィールをえらんで遊ぶ */
  onSelect(id: string): void;
  /** あたらしいプロフィールをつくる(名前はひらがな検証済み) */
  onCreate(name: string, iconId: ProfileIconId): void;
  /** なまえ/アイコンをなおす */
  onUpdate(id: string, name: string, iconId: ProfileIconId): void;
  /** プロフィールをけす(2段階確認のあと) */
  onDelete(id: string): void;
  /** 選択画面をやめて前の画面(タイトル)にもどる。アクティブプロフィールがある時だけ表示 */
  onBack(): void;
}

export interface ProfilesViewState {
  profiles: Profile[];
  activeId: string | null;
}

/**
 * 「だれが あそぶ?」画面と、プロフィールの作成/編集/削除(2段階確認)を管理する。
 * 1枚のオーバーレイの中身を画面ごとに入れ替える。
 */
export class ProfilesView {
  private readonly root: HTMLElement;
  private overlay: HTMLDivElement | null = null;
  private callbacks: ProfilesViewCallbacks | null = null;
  private state: ProfilesViewState = { profiles: [], activeId: null };

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(state: ProfilesViewState, callbacks: ProfilesViewCallbacks): void {
    this.state = state;
    this.callbacks = callbacks;
    this.mountOverlay();
    this.renderSelect();
  }

  /** 表示中のプロフィール一覧を最新に差し替える(作成/編集/削除あと) */
  refresh(state: ProfilesViewState): void {
    this.state = state;
    this.renderSelect();
  }

  hide(): void {
    this.removeOverlay();
    this.callbacks = null;
  }

  private mountOverlay(): void {
    this.removeOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'screen screen-sky profile-screen';
    this.root.append(overlay);
    this.overlay = overlay;
  }

  private removeOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  private clearOverlay(): void {
    if (this.overlay) this.overlay.replaceChildren();
  }

  // ---------- 選択画面 ----------

  private renderSelect(): void {
    this.clearOverlay();
    const { profiles, activeId } = this.state;

    const card = document.createElement('div');
    card.className = 'card profile-select-card';

    const heading = document.createElement('h2');
    heading.textContent = 'だれが あそぶ? 🐾';
    card.append(heading);

    const grid = document.createElement('div');
    grid.className = 'profile-grid';

    // 既存プロフィール + 空きスロットで常に4マス(2×2)に揃える
    for (const p of profiles) {
      grid.append(this.selectTile(p, p.id === activeId));
    }
    const emptyCount = Math.max(0, MAX_PROFILES - profiles.length);
    for (let i = 0; i < emptyCount; i++) {
      grid.append(this.createTile());
    }

    card.append(grid);

    // アクティブプロフィールがある時(=タイトルから切り替えで来た時)は「もどる」導線を出す
    if (activeId !== null) {
      const back = document.createElement('button');
      back.className = 'btn btn-sub profile-back-btn';
      back.textContent = 'もどる';
      back.addEventListener('click', () => this.callbacks?.onBack());
      card.append(back);
    }

    this.overlay?.append(card);
  }

  /** 既存プロフィール1マス: 本文タップで選択、右下の「なおす」で編集 */
  private selectTile(p: Profile, isActive: boolean): HTMLDivElement {
    const tile = document.createElement('div');
    tile.className = 'profile-tile' + (isActive ? ' is-active' : '');

    const select = document.createElement('button');
    select.className = 'profile-tile-main';
    select.innerHTML =
      `<span class="profile-tile-icon">${iconEmoji(p.iconId)}</span>` +
      `<span class="profile-tile-name"></span>` +
      (isActive ? `<span class="profile-tile-badge">あそんでるよ</span>` : '');
    (select.querySelector('.profile-tile-name') as HTMLElement).textContent = p.name;
    select.addEventListener('click', () => this.callbacks?.onSelect(p.id));

    const edit = document.createElement('button');
    edit.className = 'profile-tile-edit';
    edit.textContent = '✏️ なおす';
    edit.addEventListener('click', (e) => {
      e.stopPropagation();
      this.renderEdit(p);
    });

    tile.append(select, edit);
    return tile;
  }

  /** 空きスロット: タップで新規作成フォームへ */
  private createTile(): HTMLButtonElement {
    const tile = document.createElement('button');
    tile.className = 'profile-tile profile-tile-empty';
    tile.innerHTML = `<span class="profile-tile-plus">＋</span><span>つくる</span>`;
    tile.addEventListener('click', () => this.renderCreate());
    return tile;
  }

  // ---------- 作成 / 編集フォーム ----------

  private renderForm(opts: {
    title: string;
    initialName: string;
    initialIcon: ProfileIconId;
    submitLabel: string;
    showDelete?: boolean;
    onSubmit: (name: string, iconId: ProfileIconId) => void;
    onDelete?: () => void;
  }): void {
    this.clearOverlay();

    const card = document.createElement('div');
    card.className = 'card profile-form-card';

    const heading = document.createElement('h2');
    heading.textContent = opts.title;
    card.append(heading);

    const nameLabel = document.createElement('div');
    nameLabel.className = 'profile-field-label';
    nameLabel.textContent = 'なまえ(ひらがな 8もじまで)';
    card.append(nameLabel);

    const input = document.createElement('input');
    input.className = 'profile-input';
    input.type = 'text';
    input.value = opts.initialName;
    input.maxLength = 8;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('enterkeyhint', 'done');
    card.append(input);

    const error = document.createElement('div');
    error.className = 'profile-form-error';
    error.setAttribute('role', 'alert');
    card.append(error);

    const iconLabel = document.createElement('div');
    iconLabel.className = 'profile-field-label';
    iconLabel.textContent = 'アイコンを えらぼう';
    card.append(iconLabel);

    let chosenIcon: ProfileIconId = opts.initialIcon;
    const picker = document.createElement('div');
    picker.className = 'icon-picker';
    const optionButtons: HTMLButtonElement[] = [];
    for (const icon of PROFILE_ICONS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-option' + (icon.id === chosenIcon ? ' selected' : '');
      b.innerHTML = `<span class="icon-option-emoji">${icon.emoji}</span><span class="icon-option-label"></span>`;
      (b.querySelector('.icon-option-label') as HTMLElement).textContent = icon.label;
      b.addEventListener('click', () => {
        chosenIcon = icon.id;
        for (const ob of optionButtons) ob.classList.toggle('selected', ob === b);
      });
      optionButtons.push(b);
      picker.append(b);
    }
    card.append(picker);

    const submit = (): void => {
      const result = validateName(input.value);
      if (!result.ok) {
        error.textContent = result.reason;
        return;
      }
      opts.onSubmit(result.name, chosenIcon);
    };

    const buttonRow = document.createElement('div');
    buttonRow.className = 'profile-button-row';
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-big';
    submitBtn.textContent = opts.submitLabel;
    submitBtn.addEventListener('click', submit);
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sub';
    cancelBtn.textContent = 'やめる';
    cancelBtn.addEventListener('click', () => this.renderSelect());
    buttonRow.append(submitBtn, cancelBtn);
    card.append(buttonRow);

    if (opts.showDelete && opts.onDelete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sub profile-delete-btn';
      deleteBtn.textContent = 'この プロフィールを けす';
      deleteBtn.addEventListener('click', opts.onDelete);
      card.append(deleteBtn);
    }

    this.overlay?.append(card);
    // フォームを開いたらすぐ入力できるようにする
    requestAnimationFrame(() => input.focus());
  }

  private renderCreate(): void {
    this.renderForm({
      title: 'あたらしい プロフィール',
      initialName: '',
      initialIcon: 'shiba',
      submitLabel: 'つくる',
      onSubmit: (name, iconId) => this.callbacks?.onCreate(name, iconId),
    });
  }

  private renderEdit(p: Profile): void {
    this.renderForm({
      title: 'プロフィールを なおす',
      initialName: p.name,
      initialIcon: p.iconId,
      submitLabel: 'ほぞん',
      showDelete: true,
      onSubmit: (name, iconId) => this.callbacks?.onUpdate(p.id, name, iconId),
      onDelete: () => this.renderDeleteConfirm(p),
    });
  }

  // ---------- 削除の2段階確認 ----------

  private renderDeleteConfirm(p: Profile): void {
    this.clearOverlay();

    const card = document.createElement('div');
    card.className = 'card profile-form-card';

    const heading = document.createElement('h2');
    heading.textContent = 'ほんとうに けす?';
    card.append(heading);

    const target = document.createElement('div');
    target.className = 'profile-delete-target';
    target.innerHTML =
      `<span class="profile-tile-icon">${iconEmoji(p.iconId)}</span>` +
      `<span class="profile-delete-name"></span>`;
    (target.querySelector('.profile-delete-name') as HTMLElement).textContent = p.name;
    card.append(target);

    const note = document.createElement('div');
    note.className = 'profile-delete-note';
    note.textContent = 'ずかんや クリアの きろくが ぜんぶ なくなっちゃうよ。ほんとうに けしますか?';
    card.append(note);

    const buttonRow = document.createElement('div');
    buttonRow.className = 'profile-button-row';
    const sureBtn = document.createElement('button');
    sureBtn.className = 'btn btn-pink';
    sureBtn.textContent = 'ほんとうに けす';
    sureBtn.addEventListener('click', () => this.callbacks?.onDelete(p.id));
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sub';
    cancelBtn.textContent = 'やめる';
    cancelBtn.addEventListener('click', () => this.renderEdit(p));
    buttonRow.append(sureBtn, cancelBtn);
    card.append(buttonRow);

    this.overlay?.append(card);
  }
}
