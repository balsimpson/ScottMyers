<script setup lang="ts">
import {
  archivePagePath,
  getArchivePage
} from '~/utils/logline-routes'
import { absoluteSiteUrl, normalizedSiteUrl } from '~/utils/site'

const route = useRoute()
const rawPage = Array.isArray(route.params.page) ? route.params.page[0] : route.params.page
const page = Number(rawPage)
const pageData = getArchivePage(page)

if (!pageData || page === 1) {
  throw createError({ statusCode: 404, statusMessage: 'Logline archive page not found.' })
}

const config = useRuntimeConfig()
const siteUrl = normalizedSiteUrl(config.public.siteUrl)
const canonicalUrl = absoluteSiteUrl(siteUrl, archivePagePath(page))
const title = `Screenplay Loglines Archive, Page ${page} | Scott Myers`
const description = `Browse page ${page} of the Scott Myers screenplay logline archive, with source records from 1991 through 2025.`

useHead({
  link: [
    { rel: 'canonical', href: canonicalUrl }
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
