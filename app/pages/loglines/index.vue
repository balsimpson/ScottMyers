<script setup lang="ts">
import {
  archiveDeals,
  archivePageCount,
  archivePagePath,
  getArchivePage,
  loglinePath
} from '~/utils/logline-routes'
import { absoluteSiteUrl, normalizedSiteUrl } from '~/utils/site'

const config = useRuntimeConfig()
const siteUrl = normalizedSiteUrl(config.public.siteUrl)
const canonicalUrl = absoluteSiteUrl(siteUrl, '/loglines')
const pageData = getArchivePage(1)

if (!pageData) {
  throw createError({ statusCode: 500, statusMessage: 'The logline archive could not be loaded.' })
}

if (import.meta.server) {
  prerenderRoutes([
    ...Array.from({ length: archivePageCount - 1 }, (_, index) => archivePagePath(index + 2)),
    ...archiveDeals.map(deal => loglinePath(deal))
  ])
}

const title = 'Screenplay Loglines and Spec Script Deals | Scott Myers'
const description = 'Search 2,562 screenplay loglines from Scott Myers\' 1991–2025 spec script archive. Browse source wording, writers, genres, agencies, studios, and sale details.'
const structuredData = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  'name': title,
  description,
  'url': canonicalUrl,
  'isPartOf': {
    '@type': 'WebSite',
    'name': 'Scott Myers Spec Script Deals',
    'url': absoluteSiteUrl(siteUrl, '/')
  }
}).replace(/</g, '\\u003c')

useHead({
  link: [
    { rel: 'canonical', href: canonicalUrl }
  ],
  script: [
    { type: 'application/ld+json', innerHTML: structuredData }
  ]
})

useSeoMeta({
  title,
  description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <LoglineArchive
    :deals="pageData.deals"
    :page="pageData.page"
    :page-count="pageData.pageCount"
  />
</template>
