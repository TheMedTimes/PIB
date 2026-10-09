import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Base path for GitHub Pages project sites is "/<repo-name>/".
// Repo: https://github.com/TheMedTimes/PIB -> deployed at
// https://themedtimes.github.io/PIB/, so base must be '/PIB/'.
// If you ever move to a custom domain or a user/org root page
// (username.github.io repo itself), change this back to '/'.
const BASE_PATH = '/PIB/'

// Short build id shown (tiny) in the footer. In GitHub Actions this is the
// commit being deployed, so you can see at a glance which version any phone
// is actually running (an installed app can lag behind the live site).
const BUILD_ID = (process.env.GITHUB_SHA || 'dev').slice(0, 7)

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(BUILD_ID) },
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from src/main.jsx so it can check for updates
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'P.I.B. - Pharmac In a Bottle',
        short_name: 'P.I.B.',
        description: 'Daily pharmacology match the following drills for medical students, by TheMedTimes.',
        theme_color: '#0b0e2e',
        background_color: '#0b0e2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Must be explicit: the plugin only enables these automatically when
        // IT injects the registration script, and we register from main.jsx
        // instead (to add update checks). Without them a new version sits
        // "waiting" and never takes over on an installed phone app.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
      },
    }),
  ],
})
