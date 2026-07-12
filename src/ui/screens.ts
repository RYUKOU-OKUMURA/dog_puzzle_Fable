import type { DogInfo } from '../stage/dogs';

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

    screen.append(logo, sub, startButton, zukanButton);
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
      `<div>🌏 うまれたくに: ${dog.originHtml}</div>` +
      `<div>💗 せいかく: ${dog.personality}</div>` +
      `<div>📏 おおきさ: ${dog.size}</div>` +
      `<div>💡 ${dog.trivia}</div>` +
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
  ): void {
    const screen = document.createElement('div');
    screen.className = 'screen screen-dim';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      `<h2>ステージ クリア! ⭐</h2>` +
      `<div class="dog-note" style="text-align:center">` +
      `おさんぽずかん <b>${collected}/${total} しゅるい</b> あつまったよ!` +
      `</div>`;

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
