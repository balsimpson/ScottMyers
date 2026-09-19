<script setup lang="ts">
import { metadataFor } from '~/utils/deal-formatting'

const {
  agency,
  agencyOptions,
  clearSearch,
  genre,
  genreOptions,
  hasFilters,
  matches,
  query,
  searchOpen,
  searchResults
} = useDealSearch()

const {
  detailsReady,
  feedViewport,
  isDealRendered,
  navigateToDeal,
  shuffledDeals,
  shuffleFeed
} = useDealFeed()

const searchInput = ref<{ $el?: HTMLElement } | null>(null)

const resultLabel = computed(() => hasFilters.value
  ? `${matches.value.length.toLocaleString()} ${matches.value.length === 1 ? 'match' : 'matches'}`
  : 'Recent additions')

async function selectDeal(deal: { id: string }) {
  clearSearch()
  searchOpen.value = false
  await nextTick()
  await navigateToDeal(deal.id)
}

function closeSearch() {
  searchOpen.value = false
}

function focusSearch() {
  searchOpen.value = true

  nextTick(() => {
    const input = searchInput.value?.$el?.querySelector('input') as HTMLInputElement | null
    input?.focus()
  })
}

defineShortcuts({
  meta_k: focusSearch,
  escape: closeSearch
})
</script>

<template>
  <main
    class="archive-shell"
  >
    <h1 class="visually-hidden">
      Spec script deals archive
    </h1>
    <div
      v-if="!detailsReady"
      class="archive-loading"
      role="status"
      aria-live="polite"
    >
      <span
        class="archive-loading-line"
        aria-hidden="true"
      />
      <span class="visually-hidden">
        Loading a random logline
      </span>
    </div>
    <div
      v-if="!searchOpen"
      ref="feedViewport"
      class="archive-feed"
    >
      <section
        v-for="(deal, dealIndex) in shuffledDeals"
        :id="`deal-${deal.id}`"
        :key="deal.id"
        class="deal-screen"
        :aria-label="deal.title || deal.logline"
      >
        <div class="archive-frame">
          <DealPanel
            v-if="detailsReady && isDealRendered(dealIndex)"
            :deal="deal"
          />
          <span
            v-else
            class="deal-screen-accessible"
          >{{ deal.title || 'Untitled deal' }}. {{ deal.logline }}</span>
        </div>
      </section>
    </div>

    <section
      v-if="searchOpen"
      class="search-surface"
      aria-label="Search results"
    >
      <div class="search-surface-inner">
        <div class="search-surface-head">
          <div class="search-surface-meta">
            <p>{{ resultLabel }}</p>
            <UButton
              label="Close"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="closeSearch"
            />
          </div>

          <div class="search-filters">
            <USelect
              v-model="genre"
              class="search-filter"
              color="neutral"
              variant="outline"
              size="sm"
              :items="genreOptions"
              :ui="{ base: 'w-full' }"
              aria-label="Filter by genre"
            />

            <USelect
              v-model="agency"
              class="search-filter"
              color="neutral"
              variant="outline"
              size="sm"
              :items="agencyOptions"
              :ui="{ base: 'w-full' }"
              aria-label="Filter by agency"
            />
          </div>
        </div>

        <div
          id="archive-search-results"
          class="search-results"
          aria-live="polite"
        >
          <button
            v-for="deal in searchResults"
            :key="deal.id"
            type="button"
            class="search-result"
            :aria-label="deal.title ? `${deal.title}. ${deal.logline}` : deal.logline"
            @click="selectDeal(deal)"
          >
            <span class="search-result-copy">
              <span
                v-if="deal.year || deal.genre"
                class="search-result-eyebrow"
              >
                <span v-if="deal.year">{{ deal.year }}</span>
                <span
                  v-if="deal.year && deal.genre"
                  aria-hidden="true"
                >·</span>
                <span v-if="deal.genre">{{ deal.genre }}</span>
              </span>
              <span
                v-if="deal.title"
                class="search-result-title"
              >{{ deal.title }}</span>
              <span
                v-if="deal.writers"
                class="search-result-writers"
              >{{ deal.writers }}</span>
              <span class="search-result-logline">
                {{ deal.logline }}
              </span>
            </span>

            <span
              v-if="metadataFor(deal).length"
              class="search-result-rail"
              aria-label="Deal metadata"
            >
              <span
                v-for="metadataItem in metadataFor(deal)"
                :key="metadataItem.label"
                class="search-result-metadata-item"
              >
                <UIcon
                  :name="metadataItem.icon"
                  class="search-result-metadata-icon"
                  aria-hidden="true"
                />
                <span class="search-result-metadata-value">
                  {{ metadataItem.value }}
                </span>
              </span>
            </span>
          </button>

          <p
            v-if="hasFilters && matches.length === 0"
            class="search-empty"
          >
            No loglines match those filters.
          </p>
        </div>
      </div>
    </section>

    <div class="search-dock">
      <div class="search-dock-inner">
        <UInput
          ref="searchInput"
          v-model="query"
          class="archive-search-input"
          color="neutral"
          variant="outline"
          size="xl"
          placeholder="Search the archive"
          aria-label="Search the archive"
          :aria-expanded="searchOpen"
          aria-controls="archive-search-results"
          @focus="searchOpen = true"
        >
          <template #leading>
            <UIcon
              name="i-lucide-search"
              class="size-5 text-muted"
            />
          </template>

          <template #trailing>
            <UButton
              v-if="query"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              aria-label="Clear search"
              @click.stop="clearSearch"
            />
            <kbd
              v-else
              class="search-shortcut"
            >⌘ K</kbd>
          </template>
        </UInput>
      </div>

      <NuxtLink
        to="/analysis"
        class="archive-analysis-link"
        aria-label="Open archive analysis"
        title="Open archive analysis"
      >
        <UIcon
          name="i-lucide-chart-no-axes-combined"
          aria-hidden="true"
        />
        <span>Analysis</span>
      </NuxtLink>

      <UButton
        v-if="!searchOpen"
        class="deal-refresh-control"
        color="primary"
        variant="solid"
        size="xl"
        icon="i-lucide-refresh-cw"
        :ui="{ base: 'p-0', leadingIcon: 'mx-0' }"
        aria-label="Shuffle logline order"
        title="Shuffle logline order"
        @click="shuffleFeed(true)"
      />
    </div>
  </main>
</template>
