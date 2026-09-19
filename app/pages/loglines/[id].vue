<script setup lang="ts">
import { metadataFor } from '~/utils/deal-formatting'
import {
  archiveDeals,
  displayDealTitle,
  findDealById,
  loglinePath
} from '~/utils/logline-routes'
import { absoluteSiteUrl, normalizedSiteUrl } from '~/utils/site'

const route = useRoute()
const rawId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
const deal = findDealById(String(rawId ?? ''))

if (!deal) {
  throw createError({ statusCode: 404, statusMessage: 'Logline not found.' })
}

const config = useRuntimeConfig()
const siteUrl = normalizedSiteUrl(config.public.siteUrl)
const canonicalUrl = absoluteSiteUrl(siteUrl, loglinePath(deal))
const title = `${displayDealTitle(deal)} Logline | Spec Script Deals Archive`
const description = `${displayDealTitle(deal)} logline from Scott Myers' ${deal.year} spec script deals archive: ${deal.logline}`.slice(0, 158)
const metadata = metadataFor(deal)
const archiveIndex = archiveDeals.findIndex(item => item.id === deal.id)
const newerDeal = archiveDeals[archiveIndex - 1] ?? null
const olderDeal = archiveDeals[archiveIndex + 1] ?? null
const structuredData = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  'name': title,
  description,
  'url': canonicalUrl,
  'breadcrumb': {
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': absoluteSiteUrl(siteUrl, '/')
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Loglines',
        'item': absoluteSiteUrl(siteUrl, '/loglines')
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': displayDealTitle(deal),
        'item': canonicalUrl
      }
    ]
  },
  'mainEntity': {
    '@type': 'CreativeWork',
    'name': displayDealTitle(deal),
    'description': deal.logline,
    'url': canonicalUrl,
    'isPartOf': {
      '@type': 'CollectionPage',
      'name': 'Scott Myers Spec Script Deals Archive',
      'url': absoluteSiteUrl(siteUrl, '/loglines')
    }
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
  <main class="logline-detail-page">
    <div class="logline-detail-inner">
      <nav
        class="logline-breadcrumbs"
        aria-label="Breadcrumb"
      >
        <NuxtLink to="/">Scott Myers' archive</NuxtLink>
        <span aria-hidden="true">/</span>
        <NuxtLink to="/loglines">Loglines</NuxtLink>
        <span aria-hidden="true">/</span>
        <span>{{ displayDealTitle(deal) }}</span>
      </nav>

      <article>
        <header class="logline-detail-header">
          <p class="logline-page-kicker">
            {{ deal.year }}<span v-if="deal.genreGroup || deal.genre"> · {{ deal.genreGroup || deal.genre }}</span>
            <span> · Entry {{ deal.entryNumber }}</span>
          </p>
          <h1>{{ displayDealTitle(deal) }}</h1>
          <p
            v-if="deal.writers"
            class="logline-detail-writers"
          >
            {{ deal.writers }}
          </p>
        </header>

        <section
          class="logline-detail-logline"
          aria-labelledby="source-logline-heading"
        >
          <p
            id="source-logline-heading"
            class="logline-page-kicker"
          >
            Source logline
          </p>
          <p>{{ deal.logline }}</p>
        </section>

        <section
          class="logline-detail-facts"
          aria-labelledby="deal-facts-heading"
        >
          <div class="logline-section-heading">
            <div>
              <p class="logline-page-kicker">
                Record details
              </p>
              <h2 id="deal-facts-heading">
                The deal record
              </h2>
            </div>
          </div>
          <dl class="logline-facts-list">
            <template
              v-for="item in metadata"
              :key="item.label"
            >
              <div class="logline-fact">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </template>
            <div
              v-if="deal.sourcePage"
              class="logline-fact"
            >
              <dt>Source page</dt>
              <dd>{{ deal.sourcePage }}</dd>
            </div>
          </dl>
        </section>

        <footer class="logline-detail-source">
          <p>
            This record comes from Scott Myers' <em>Spec Script Deals</em> download published by
            <a
              href="https://www.patreon.com/GoIntoTheStory/posts/download-spec-168834157"
              target="_blank"
              rel="noreferrer"
            >
              Go Into The Story
            </a>.
          </p>
          <p v-if="deal.sourceNote">
            Source note: {{ deal.sourceNote }}
          </p>
        </footer>
      </article>

      <nav
        class="logline-related-nav"
        aria-label="More archive records"
      >
        <NuxtLink
          v-if="newerDeal"
          :to="loglinePath(newerDeal)"
        >
          <span>Newer record</span>
          <strong>{{ displayDealTitle(newerDeal) }}</strong>
        </NuxtLink>
        <NuxtLink
          v-if="olderDeal"
          :to="loglinePath(olderDeal)"
        >
          <span>Older record</span>
          <strong>{{ displayDealTitle(olderDeal) }}</strong>
        </NuxtLink>
      </nav>
    </div>
  </main>
</template>
