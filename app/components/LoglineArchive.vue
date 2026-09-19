<script setup lang="ts">
import type { Deal } from '~/data/deals'
import { archivePagePath } from '~/utils/logline-routes'

const props = defineProps<{
  deals: Deal[]
  page: number
  pageCount: number
}>()

const heading = computed(() => props.page === 1
  ? 'Screenplay loglines and spec script deals'
  : `Screenplay loglines archive, page ${props.page}`)

const pageDescription = computed(() => props.page === 1
  ? 'Search 2,562 screenplay loglines from Scott Myers\' 1991–2025 spec script archive. Browse the original source wording alongside writers, genres, agencies, studios, and sale details.'
  : `Browse page ${props.page} of the Scott Myers screenplay logline archive, covering source records from 1991 through 2025.`)
</script>

<template>
  <main class="logline-page">
    <div class="logline-page-inner">
      <header class="logline-page-header">
        <div class="logline-page-header-topline">
          <NuxtLink
            class="logline-back-link"
            to="/"
          >
            Scott Myers' archive
          </NuxtLink>
          <span>Spec script deals</span>
        </div>
        <p class="logline-page-kicker">
          {{ props.page === 1 ? 'A searchable source archive' : `Archive page ${props.page}` }}
        </p>
        <h1>{{ heading }}</h1>
        <p class="logline-page-intro">
          {{ pageDescription }}
        </p>
        <div class="logline-page-links">
          <NuxtLink
            class="logline-primary-link"
            to="/what-is-a-logline"
          >
            What is a logline?
          </NuxtLink>
          <NuxtLink
            class="logline-secondary-link"
            to="/"
          >
            Open the shuffled reading feed
          </NuxtLink>
        </div>
      </header>

      <section
        class="logline-archive-section"
        aria-labelledby="logline-archive-heading"
      >
        <div class="logline-section-heading">
          <div>
            <p class="logline-page-kicker">
              Source records
            </p>
            <h2 id="logline-archive-heading">
              Browse the archive
            </h2>
          </div>
          <p>{{ props.deals.length }} records on this page · {{ props.pageCount }} pages</p>
        </div>

        <div class="logline-archive-grid">
          <LoglineCard
            v-for="deal in props.deals"
            :key="deal.id"
            :deal="deal"
          />
        </div>

        <nav
          class="logline-pagination"
          aria-label="Logline archive pages"
        >
          <NuxtLink
            v-if="props.page > 1"
            class="logline-pagination-link"
            :to="archivePagePath(props.page - 1)"
          >
            Previous page
          </NuxtLink>
          <span>Page {{ props.page }} of {{ props.pageCount }}</span>
          <NuxtLink
            v-if="props.page < props.pageCount"
            class="logline-pagination-link"
            :to="archivePagePath(props.page + 1)"
          >
            Next page
          </NuxtLink>
        </nav>
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
    </div>
  </main>
</template>
