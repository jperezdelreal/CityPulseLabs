import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'BiciCoruña — Smart Bike Route Planner',
        short_name: 'BiciCoruña',
        description: 'Smart bike-sharing route planner for A Coruña',
        start_url: '/',
        display: 'standalone',
        theme_color: '#0D9A5E',
        background_color: '#FFFFFF',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Network-first for API calls
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Network-first for GBFS feeds
            urlPattern: /gbfs/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gbfs-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60,
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Cache-first for OSM map tiles (A Coruña area)
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tile-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Static assets (JS, CSS) intentionally NOT cached at runtime.
          // Vite content-hashes all bundles and VitePWA precaches them.
          // A CacheFirst runtime rule was serving stale builds for 30 days.
        ],
      },
    }),
  ],
})
