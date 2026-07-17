# しばちゃんのおさんぽパズル

みちを つなげて しばちゃんと おさんぽする、小学生むけのブラウザパズルです。
家庭内で遊ぶための個人制作です(収益化・一般公開はしません)。

## あそびかた

1. ブラウザで開く: [https://ryukou-okumura.github.io/dog_puzzle_Fable/](https://ryukou-okumura.github.io/dog_puzzle_Fable/)
2. iPad なら Safari で「共有」→「ホーム画面に追加」すると、アプリのようにフルスクリーンで起動できます
3. 初回ロード後は、機内モードでも遊べます(PWA のオフライン対応)

## 開発コマンド

```bash
npm run dev     # 開発サーバー (Vite)。URL は /dog_puzzle_Fable/ 付き
npm run build   # 型チェック + 本番ビルド
npm run preview # 本番ビルドのローカル確認(PWA / オフライン検証用)
npm run test    # ユニットテスト (Vitest)
npm run lint    # ESLint
```

## PWA アイコン

`public/icons/paw.svg` を元に、一度きりで PNG を生成しています(package.json には変換ツールを残していません)。

```bash
npm install --no-save @resvg/resvg-js@2.6.2
# SVG → pwa-192.png / pwa-512.png / apple-touch-icon.png を Node で書き出し
npm uninstall @resvg/resvg-js
```

## ライセンス・注意

- リポジトリは GitHub Pages 配信のため public ですが、個人情報は含めません
- サーバーレス・通信なし・課金なし・外部リンクなし
