// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],

  icon: {
    clientBundle: {
      scan: true,
    },
    serverBundle: 'local',
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
    },
  },

  // Proxy API calls in dev to avoid CORS
  routeRules: {
    '/api/**': {
      proxy: { to: 'http://localhost:3000/**' },
    },
    // App routes: SPA mode (no SSR)
    '/app/**': { ssr: false },
  },

  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
  },
})
