import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const githubActions = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.GITHUB_ACTIONS === 'true';
const base = githubActions ? '/Vfinance-final-tested/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'V-Finance',
        short_name: 'V-Finance',
        description: 'Private, local-first personal finance tracking.',
        theme_color: '#102a43',
        background_color: '#f5f7f8',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: { cleanupOutdatedCaches: true, globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,mjs}'] }
    })
  ]
});
