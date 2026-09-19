// https://nuxt.com/docs/api/configuration/nuxt-config
const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL ?? 'https://scottmyers.vercel.app').replace(/\/+$/, '')

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vercel/analytics'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css', '~/assets/css/loglines.css'],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  },

  runtimeConfig: {
    public: {
      siteUrl
    }
  },

  routeRules: {
    '/': { prerender: true },
    '/loglines': { prerender: true },
    '/loglines/**': { prerender: true },
    '/robots.txt': { prerender: true },
    '/sitemap.xml': { prerender: true },
    '/what-is-a-logline': { prerender: true }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
