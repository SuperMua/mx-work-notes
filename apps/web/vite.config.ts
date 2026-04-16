import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from '../../packages/shared/src'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: APP_DESCRIPTION,
        theme_color: '#0f172a',
        background_color: '#07111f',
        display: 'standalone',
        start_url: '/',
        lang: 'zh-CN',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'workbench-fonts',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')

          if (
            normalizedId.includes('/src/stores/workspace') ||
            normalizedId.includes('/src/lib/repositories') ||
            normalizedId.includes('/src/lib/note-utils')
          ) {
            return 'workspace-runtime'
          }

          if (!normalizedId.includes('node_modules')) {
            return undefined
          }

          if (normalizedId.includes('sortablejs')) {
            return 'vendor-board'
          }

          if (normalizedId.includes('dexie')) {
            return 'vendor-storage'
          }

          if (normalizedId.includes('dayjs')) {
            return 'vendor-date'
          }

          if (
            normalizedId.includes('vue-router') ||
            normalizedId.includes('/vue/') ||
            normalizedId.includes('@vue') ||
            normalizedId.includes('pinia')
          ) {
            return 'vendor-framework'
          }

          return 'vendor-misc'
        },
      },
    },
  },
})
