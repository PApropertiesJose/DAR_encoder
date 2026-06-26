import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import jsconfigPath from 'vite-jsconfig-paths';
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    jsconfigPath(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DAR Encoder',
        short_name: 'DAR',
        description: 'DAR Encoder Application',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/DAR/',
        scope: '/DAR/',
        icons: [
          {
            src: '/DAR/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/DAR/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/DAR/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Serve cached index.html for any navigation request not in precache
        // — required for SPA routing to work offline
        navigateFallback: '/DAR/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cache GET API responses with NetworkFirst — serves stale data when offline
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.origin !== location.origin,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: "/DAR",
  // build: {
  //   // This assumes your React project folder is a sibling to your .NET project's wwwroot.
  //   // Adjust the path resolution (e.g., '../../NetTemplate_React/wwwroot') as necessary 
  //   // based on where your React project sits relative to the wwwroot folder.
  //   outDir: path.resolve(__dirname, '..', 'NetTemplate_React', 'wwwroot'),
  //   emptyOutDir: true, // Clean the directory before building
  // },
})
