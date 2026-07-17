import type { SaveData } from '../save/convert';
import { ACCESSORIES } from '../stage/accessories';
import type { DogInfo } from '../stage/dogs';
import { dogInfoLinesHtml } from './dogInfo';

/** ユーザー入力由来の文字列をHTMLに埋め込むときのエスケープ(名前はひらがな限定だが念のため) */
function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** タイトル・出会い・クリアなどのフルスクリーンDOM画面 */
export class Screens {
  private readonly root: HTMLElement;
  private current: HTMLDivElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  private mount(element: HTMLDivElement): void {
    this.clear();
    this.root.append(element);
    this.current = element;
  }

  clear(): void {
    this.current?.remove();
    this.current = null;
  }

  showTitle(
    onStart: () => void,
    onZukan: () => void,
    profile: { name: string; emoji: string } | null,
    onSwitchProfile: () => void,
    onDressUp: () => void,
    soundEnabled: boolean,
    onToggleSound: () => void,
  ): void {
    const screen = document.createElement('div');
    screen.className = 'screen screen-sky';

    // だれがあそんでいるかの表示 + 切替導線(タイトルの右上に固定)
    if (profile) {
      const who = document.createElement('button');
      who.className = 'profile-chip';
      who.innerHTML =
        `<span class="profile-chip-icon">${profile.emoji}</span>` +
        `<span class="profile-chip-name">${escapeText(profile.name)}</span>` +
        `<span class="profile-chip-arrow">▸</span>`;
      who.addEventListener('click', onSwitchProfile);
      screen.append(who);
    }

    const logo = document.createElement('div');
    logo.className = 'title-logo';
    logo.innerHTML = 'しばちゃんの<br />おさんぽパズル';
    const sub = document.createElement('div');
    sub.className = 'title-sub';
    sub.textContent = 'みちを つないで、せかいの いぬと ともだちに なろう!';

    const startButton = document.createElement('button');
    startButton.className = 'btn btn-big';
    startButton.textContent = '🐾 おさんぽに でかける';
    startButton.addEventListener('click', onStart);

    const zukanButton = document.createElement('button');
    zukanButton.className = 'btn btn-pink';
    zukanButton.textContent = 'ずかんを みる';
    zukanButton.addEventListener('click', onZukan);

    const dressButton = document.createElement('button');
    dressButton.className = 'btn btn-sub';
    dressButton.textContent = '🎀 きせかえ';
    dressButton.addEventListener('click', onDressUp);

    screen.append(logo, sub, startButton, zukanButton, dressButton);

    // おと ON/OFF(M13)。プロフィール選択後のみ(設定はプロフィール別)
    if (profile) {
      const soundButton = document.createElement('button');
      soundButton.className = 'btn btn-sub sound-toggle';
      soundButton.type = 'button';
      soundButton.textContent = soundEnabled ? '🔊 おと ON' : '🔇 おと OFF';
      soundButton.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
      soundButton.addEventListener('click', onToggleSound);
      screen.append(soundButton);
    }

    this.mount(screen);
  }

  /**
   * ワールド初回クリア報酬の「もらった!」カード。
   * トーンは出会いカードに合わせる(🎉・否定表現なし)。
   */
  showAccessoryReward(accessoryName: string, onContinue: () => void): void {
    const screen = document.createElement('div');
    screen.className = 'screen screen-dim';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      `<h2>きせかえを もらった! 🎉</h2>` +
      `<div class="dog-note centered">` +
      `<b>${escapeText(accessoryName)}</b> を てにいれたよ!<br />` +
      `タイトルの 「きせかえ」 から つけかえできるよ` +
      `</div>`;

    const okButton = document.createElement('button');
    okButton.className = 'btn btn-big btn-pink';
    okButton.textContent = 'わーい!';
    okButton.addEventListener('click', onContinue);

    card.append(okButton);
    screen.append(card);
    this.mount(screen);

    window.setTimeout(() => this.burstHearts(window.innerWidth / 2, window.innerHeight * 0.35), 80);
  }

  /**
   * きせかえ画面(入口A: タイトルから)。
   * 所持一覧・装備切替・はずす。未所持はロック表示。
   */
  showDressUp(
    save: SaveData,
    handlers: {
      onEquip: (id: string) => void;
      onUnequip: () => void;
      onClose: () => void;
    },
  ): void {
    const screen = document.createElement('div');
    screen.className = 'screen screen-sky';

    const panel = document.createElement('div');
    panel.className = 'card dress-up-panel';

    const title = document.createElement('h2');
    title.textContent = 'きせかえ 🎀';
    panel.append(title);

    const hint = document.createElement('div');
    hint.className = 'dog-note centered';
    hint.textContent = 'ワールドを クリアすると ふえるよ';
    panel.append(hint);

    const list = document.createElement('div');
    list.className = 'dress-up-list';

    for (const acc of ACCESSORIES) {
      const owned = save.ownedAccessories.includes(acc.id);
      const equipped = save.equippedAccessoryId === acc.id;
      const tile = document.createElement(owned ? 'button' : 'div');
      tile.className = 'select-tile dress-up-tile' + (owned ? '' : ' is-locked');
      if (equipped) tile.classList.add('is-cleared');

      if (owned) {
        tile.innerHTML =
          `<span class="select-tile-name">${escapeText(acc.name)}</span>` +
          (equipped
            ? `<span class="select-tile-badge is-done">きている</span>`
            : `<span class="select-tile-badge">つける</span>`);
        tile.addEventListener('click', () => handlers.onEquip(acc.id));
      } else {
        tile.innerHTML =
          `<span class="select-tile-name">???</span>` +
          `<span class="select-tile-sub">まだ てにいれて いないよ</span>`;
      }
      list.append(tile);
    }
    panel.append(list);

    if (save.equippedAccessoryId) {
      const unequip = document.createElement('button');
      unequip.className = 'btn btn-sub';
      unequip.textContent = 'はずす';
      unequip.addEventListener('click', handlers.onUnequip);
      panel.append(unequip);
    }

    const closeButton = document.createElement('button');
    closeButton.className = 'btn';
    closeButton.textContent = 'とじる';
    closeButton.addEventListener('click', handlers.onClose);
    panel.append(closeButton);

    screen.append(panel);
    this.mount(screen);
  }

  showEncounter(dog: DogInfo, photo: string, onRegister: () => void): void {
    const screen = document.createElement('div');
    screen.className = 'screen screen-dim';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      `<h2>あたらしい ともだち! 🎉</h2>` +
      `<img class="photo" src="${photo}" alt="きねんしゃしん" />` +
      `<div class="dog-note">` +
      `<div><b>${dog.nameHtml}</b> と ともだちに なったよ!</div>` +
      dogInfoLinesHtml(dog) +
      `</div>`;

    const registerButton = document.createElement('button');
    registerButton.className = 'btn btn-big btn-pink';
    registerButton.textContent = '📖 ずかんに とうろく!';
    registerButton.addEventListener('click', onRegister);

    card.append(registerButton);
    screen.append(card);
    this.mount(screen);
  }

  showClear(
    collected: number,
    total: number,
    hasNext: boolean,
    onNext: () => void,
    onZukan: () => void,
    onSelect: () => void,
    extras?: { zukanComplete?: boolean; worldFinale?: boolean },
  ): void {
    const screen = document.createElement('div');
    screen.className = 'screen screen-dim';

    const card = document.createElement('div');
    card.className = 'card';

    let title = 'ステージ クリア! ⭐';
    let note = `おさんぽずかん <b>${collected}/${total} しゅるい</b> あつまったよ!`;
    if (extras?.worldFinale && extras?.zukanComplete) {
      title = 'ぜんぶ クリア! 🎉🌍';
      note =
        `ほんとうに おめでとう!<br />` +
        `しばちゃんと せかいを あるいて、<br />` +
        `ずかんも <b>${collected}/${total} しゅるい</b> ぜんぶ あつまったよ!`;
    } else if (extras?.worldFinale) {
      title = 'せかいの たび クリア! 🌍';
      note =
        `ほんとうに おめでとう!<br />` +
        `しばちゃんと いっしょに せかいを あるいたね!<br />` +
        `おさんぽずかん <b>${collected}/${total} しゅるい</b>`;
    } else if (extras?.zukanComplete) {
      title = 'ずかん コンプリート! 🎉';
      note =
        `すごい! ぜんぶの いぬと ともだちに なったよ!<br />` +
        `おさんぽずかん <b>${collected}/${total} しゅるい</b>`;
    }

    card.innerHTML = `<h2>${title}</h2>` + `<div class="dog-note centered">${note}</div>`;

    // コンプリート時は短いハート演出(2秒以内・画面を覆い続けない)
    if (extras?.zukanComplete || extras?.worldFinale) {
      window.setTimeout(
        () => this.burstHearts(window.innerWidth / 2, window.innerHeight * 0.35),
        80,
      );
    }

    // 主ボタンは「次のステージがあるか」で切り替え。ずかんボタンは共通。
    const primaryButton = document.createElement('button');
    primaryButton.className = 'btn btn-big';
    if (hasNext) {
      primaryButton.textContent = 'つぎの ステージへ ▸';
      primaryButton.addEventListener('click', onNext);
    } else {
      // ワールドの最後のステージなど、次がない場合はステージ選択を主導線に
      primaryButton.textContent = 'ステージを えらぶ';
      primaryButton.addEventListener('click', onSelect);
    }
    card.append(primaryButton);

    const zukanButton = document.createElement('button');
    zukanButton.className = 'btn btn-pink';
    zukanButton.textContent = 'ずかんを みる';
    zukanButton.addEventListener('click', onZukan);
    card.append(zukanButton);

    if (hasNext) {
      const selectButton = document.createElement('button');
      selectButton.className = 'btn btn-sub';
      selectButton.textContent = 'ステージを えらぶ';
      selectButton.addEventListener('click', onSelect);
      card.append(selectButton);
    }

    screen.append(card);
    this.mount(screen);
  }

  /** 出会いの瞬間のハートまき散らし */
  burstHearts(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart-burst';
      heart.textContent = ['💗', '💕', '💖'][i % 3]!;
      heart.style.left = `${x + (i - 2.5) * 34}px`;
      heart.style.top = `${y - i * 6}px`;
      heart.style.animationDelay = `${i * 0.12}s`;
      this.root.append(heart);
      window.setTimeout(() => heart.remove(), 2200);
    }
  }
}
