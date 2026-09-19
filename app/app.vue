<script setup lang="ts">
const title = 'Spec Script Deals — Myers Archive'
const description = 'A visual archive of spec script deals, loglines, writers, genres, agencies, studios, and sale details from 1991 through 2025.'

useHead({
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { name: 'theme-color', content: '#f3efe5' }
  ]
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
