import type { DogInfo } from '../stage/dogs';

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

  showTitle(onStart: () => void, onZukan: () => void): void {
    const screen = document.createElement('div');
    screen.className = 'screen screen-sky';
    screen.innerHTML =
      `<div class="title-logo">しばちゃんの<br />おさんぽパズル</div>` +
      `<div class="title-sub">みちを つないで、せかいの いぬと ともだちに なろう!</div>`;

    const startButton = document.createElement('button');
    startButton.className = 'btn btn-big';
    startButton.textContent = '🐾 おさんぽに でかける';
    startButton.addEventListener('click', onStart);

    const zukanButton = document.createElement('button');
    zukanButton.className = 'btn btn-pink';
    zukanButton.textContent = 'ずかんを みる';
    zukanButton.addEventListener('click', onZukan);

    screen.append(startButton, zukanButton);
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
    onReplay: () => void,
    onZukan: () => void,
    onTitle: () => void,
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

    const replayButton = document.createElement('button');
    replayButton.className = 'btn btn-big';
    replayButton.textContent = 'もういちど あそぶ';
    replayButton.addEventListener('click', onReplay);

    const zukanButton = document.createElement('button');
    zukanButton.className = 'btn btn-pink';
    zukanButton.textContent = 'ずかんを みる';
    zukanButton.addEventListener('click', onZukan);

    const titleButton = document.createElement('button');
    titleButton.className = 'btn btn-sub';
    titleButton.textContent = 'タイトルに もどる';
    titleButton.addEventListener('click', onTitle);

    card.append(replayButton, zukanButton, titleButton);
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
