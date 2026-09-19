<script setup lang="ts">
import { normalizedSiteUrl } from '~/utils/site'

const config = useRuntimeConfig()
const siteUrl = normalizedSiteUrl(config.public.siteUrl)
const homepageUrl = `${siteUrl}/`
const socialPreviewUrl = `${siteUrl}/social-preview.png`
const title = 'Screenplay Loglines and Spec Script Deals | Scott Myers'
const description = 'Search 2,562 screenplay loglines from Scott Myers\' 1991-2025 spec script archive, with writers, genres, agencies, studios, sale details, and story analysis.'

useHead({
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { name: 'theme-color', content: '#f3efe5' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})

useSeoMeta({
  title,
  description,
  author: 'Scott Myers',
  ogType: 'website',
  ogUrl: homepageUrl,
  ogSiteName: 'Scott Myers Spec Script Deals',
  ogTitle: title,
  ogDescription: description,
  ogImage: socialPreviewUrl,
  ogImageAlt: 'Minimal editorial artwork for the Scott Myers Spec Script Deals archive',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogLocale: 'en_US',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: socialPreviewUrl,
  twitterImageAlt: 'Minimal editorial artwork for the Scott Myers Spec Script Deals archive'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
