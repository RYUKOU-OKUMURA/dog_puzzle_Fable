import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages は /<repo>/ 配下で配信するため絶対 base が必要。
  // 相対('./')のままだと PWA の SW / manifest の scope がずれる。
  base: '/dog_puzzle_Fable/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/paw.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'しばちゃんのおさんぽパズル',
        short_name: 'おさんぽパズル',
        description: 'みちを つなげて しばちゃんと おさんぽする パズル',
        theme_color: '#bde3ff',
        background_color: '#bde3ff',
        display: 'standalone',
        lang: 'ja',
        start_url: '/dog_puzzle_Fable/',
        scope: '/dog_puzzle_Fable/',
        icons: [
          {
            src: 'icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 家庭内利用のためコード分割はせず、dist アセットをまとめてプリキャッシュする
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
