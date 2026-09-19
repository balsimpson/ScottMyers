<script setup lang="ts">
import { archiveDeals } from '~/utils/logline-routes'
import { absoluteSiteUrl, normalizedSiteUrl } from '~/utils/site'

const config = useRuntimeConfig()
const siteUrl = normalizedSiteUrl(config.public.siteUrl)
const canonicalUrl = absoluteSiteUrl(siteUrl, '/what-is-a-logline')
const title = 'What Is a Logline? Screenplay Examples | Scott Myers'
const description = 'Learn what a screenplay logline is, what information it should contain, and browse real logline examples from Scott Myers\' spec script deals archive.'
const exampleDeals = archiveDeals.filter(deal => deal.title && deal.logline).slice(0, 6)
const structuredData = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  'name': title,
  description,
  'url': canonicalUrl,
  'about': {
    '@type': 'DefinedTerm',
    'name': 'Logline',
    'description': 'A short description of a story\'s central character, goal, obstacle, and stakes.'
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
  <main class="logline-guide-page">
    <div class="logline-guide-inner">
      <nav
        class="logline-breadcrumbs"
        aria-label="Breadcrumb"
      >
        <NuxtLink to="/">Scott Myers' archive</NuxtLink>
        <span aria-hidden="true">/</span>
        <span>What is a logline?</span>
      </nav>

      <article class="logline-guide-article">
        <header class="logline-guide-header">
          <p class="logline-page-kicker">
            Screenwriting reference
          </p>
          <h1>What is a logline?</h1>
          <p>
            A logline is a short description of a story's central character, goal, obstacle, and stakes. It gives a reader a quick sense of what the story is about without replacing the screenplay or a full synopsis.
          </p>
        </header>

        <section class="logline-guide-section">
          <h2>What a useful logline usually tells you</h2>
          <p>
            A clear logline makes the story's engine easy to understand. It usually identifies who the story follows, what that person wants, what blocks them, and what may happen if they fail. The exact order and wording vary, especially in the source records collected in this archive.
          </p>
          <ul>
            <li><strong>Who:</strong> the central character or characters.</li>
            <li><strong>Goal:</strong> the thing they are trying to achieve.</li>
            <li><strong>Obstacle:</strong> the force, problem, or situation working against them.</li>
            <li><strong>Stakes:</strong> what can be lost if the goal is not reached.</li>
          </ul>
        </section>

        <section class="logline-guide-section">
          <h2>Loglines in this archive</h2>
          <p>
            The Scott Myers Spec Script Deals archive contains 2,562 source records from 1991 through 2025. Each record keeps the original logline alongside the available title, writer, genre, agency, studio, sale details, and source page. Use the archive to study how stories were described in the spec script market over time.
          </p>
          <NuxtLink
            class="logline-primary-link"
            to="/loglines"
          >
            Browse all screenplay loglines
          </NuxtLink>
        </section>

        <section
          class="logline-guide-section"
          aria-labelledby="logline-examples-heading"
        >
          <p class="logline-page-kicker">
            From the source archive
          </p>
          <h2 id="logline-examples-heading">
            Screenplay logline examples
          </h2>
          <div class="logline-example-grid">
            <LoglineCard
              v-for="deal in exampleDeals"
              :key="deal.id"
              :deal="deal"
            />
          </div>
        </section>

        <footer class="logline-page-footer">
          <p>
            The archive is based on Scott Myers' <em>Spec Script Deals</em> download from
            <a
              href="https://www.patreon.com/GoIntoTheStory/posts/download-spec-168834157"
              target="_blank"
              rel="noreferrer"
            >
              Go Into The Story
            </a>.
          </p>
        </footer>
      </article>
    </div>
  </main>
</template>
