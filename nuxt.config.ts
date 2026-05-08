// https://nuxt.com/docs/api/configuration
export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'The Violin Workshop',
      meta: [
        { name: 'description',
          content: 'Explore Cremona violin making' },
        { name: 'viewport',
          content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})
