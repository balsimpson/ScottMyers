<script setup lang="ts">
import { deals } from '~/data/deals'

type EngagementAction = 'thanks' | 'patreon'

interface EngagementState {
  thanksCount: number
  patreonCount: number
  thanked: boolean
  patreonClicked: boolean
}

const {
  clearSearch,
  hasFilters,
  matches,
  query,
  searchOpen,
  searchResults
} = useDealSearch()

const {
  detailsReady,
  feedViewport,
  getCurrentDealId,
  isDealRendered,
  restoreFeedPosition,
  shuffledDeals,
  shuffleFeed
} = useDealFeed()

const searchInput = ref<{ $el?: HTMLElement } | null>(null)
const infoOpen = ref(false)
const analysisOpen = ref(false)
const analysisSectionTitle = ref('Story patterns')
const feedReturnDealId = ref<string | null>(null)
const engagement = ref<EngagementState | null>(null)
const engagementLoading = ref(false)
const engagementUnavailable = ref(false)
const engagementPending = ref<EngagementAction | null>(null)

const showSearchResults = computed(() => searchOpen.value && hasFilters.value && searchResults.value.length > 0)
const archiveView = computed(() => {
  if (infoOpen.value) return 'info'
  if (analysisOpen.value) return 'analysis'
  if (showSearchResults.value) return 'search'
  return 'feed'
})

const resultLabel = computed(() => {
  if (hasFilters.value && matches.value.length === 0) return ''
  if (hasFilters.value) return `${matches.value.length.toLocaleString()} ${matches.value.length === 1 ? 'match' : 'matches'}`
  return 'Recent additions'
})

function dealTitleClass(title: string | null) {
  const length = title?.length ?? 0
  if (length > 100) return 'deal-title--epic'
  if (length > 64) return 'deal-title--long'
  return ''
}

function dealLoglineClass(logline: string) {
  if (logline.length > 700) return 'deal-logline--epic'
  if (logline.length > 500) return 'deal-logline--long'
  return ''
}

async function selectDeal(deal: { id: string }) {
  feedReturnDealId.value = null
  clearSearch()
  searchOpen.value = false
  await restoreFeedPosition(deal.id)
}

function closeSearch() {
  searchOpen.value = false
  infoOpen.value = false
  analysisOpen.value = false
}

async function loadEngagement() {
  if (engagementLoading.value) return

  engagementLoading.value = true

  try {
    engagement.value = await $fetch<EngagementState>('/api/engagement')
    engagementUnavailable.value = false
  } catch {
    engagement.value = null
    engagementUnavailable.value = true
  } finally {
    engagementLoading.value = false
  }
}

async function recordEngagement(action: EngagementAction) {
  if (engagementUnavailable.value || engagementPending.value || engagement.value?.[action === 'thanks' ? 'thanked' : 'patreonClicked']) return

  engagementPending.value = action

  try {
    engagement.value = await $fetch<EngagementState>('/api/engagement', {
      method: 'POST',
      body: { action }
    })
  } catch {
    engagementUnavailable.value = true
  } finally {
    engagementPending.value = null
  }
}

function toggleInfo() {
  if (infoOpen.value) {
    closeSearch()
    return
  }

  infoOpen.value = true
  searchOpen.value = false
  analysisOpen.value = false
  void loadEngagement()
}

function toggleAnalysis() {
  if (analysisOpen.value) {
    void closeSearch()
    return
  }

  analysisOpen.value = true
  analysisSectionTitle.value = 'Story patterns'
  searchOpen.value = false
  infoOpen.value = false
}

function focusSearch() {
  infoOpen.value = false
  analysisOpen.value = false
  searchOpen.value = true

  nextTick(() => {
    const input = searchInput.value?.$el?.querySelector('input') as HTMLInputElement | null
    input?.focus()
  })
}

watch(archiveView, (view, previousView) => {
  if (previousView === 'feed' && view !== 'feed') {
    feedReturnDealId.value = getCurrentDealId()
    return
  }

  if (previousView !== 'feed' && view === 'feed') {
    const dealIdToRestore = feedReturnDealId.value
    feedReturnDealId.value = null

    if (dealIdToRestore) void restoreFeedPosition(dealIdToRestore)
  }
})

defineShortcuts({
  meta_k: focusSearch,
  escape: closeSearch
})
</script>

<template>
  <main class="archive-shell">
    <h1 class="visually-hidden">
      Spec script deals archive
    </h1>
    <div v-if="!detailsReady" class="archive-loading archive-loading--active" role="status" aria-live="polite">
      <div class="archive-loading-inner">
        <p class="archive-loading-credit">Scott Myers' archive</p>
        <p class="archive-loading-title">Spec Script Deals: 1991-2025</p>
        <p class="archive-loading-meta">
          <strong>{{ deals.length.toLocaleString() }}</strong> loglines
        </p>
        <div class="archive-loading-track" aria-hidden="true">
          <span class="archive-loading-fill" />
        </div>
        <p class="archive-loading-status">Loading the archive...</p>
      </div>
    </div>
    <div class="archive-content" :class="{ 'archive-content--loading': !detailsReady }">
      <Transition name="archive-mode" mode="out-in">
        <div v-if="infoOpen" key="info" class="archive-info-surface" aria-label="About the archive">
          <UButton class="archive-info-close" color="neutral" variant="ghost" size="lg" icon="i-lucide-x"
            aria-label="Close archive information" title="Close archive information" @click="closeSearch" />

          <div class="archive-info-surface-inner">
            <p class="archive-info-surface-kicker">
              Scott Myers
            </p>
            <h2>Spec Script Deals: 1991-2025</h2>
            <p>
              This archive is based on Scott Myers' <em>Spec Script Deals</em> download from Go Into The Story. It
              brings together a massive record of spec script activity: deal records, loglines, writers, genres,
              agencies, and sale details.
            </p>
            <p>
              It spans <strong>{{ deals.length.toLocaleString() }}</strong> loglines across more than 35 years of
              tracking the market, making it one of the most complete single-source records of the spec script business
              ever assembled.
            </p>
            <div
              class="archive-info-engagement"
              aria-live="polite"
            >
              <UButton
                class="archive-info-thank-row"
                :class="{ 'archive-info-thank-row--active': engagement?.thanked }"
                color="neutral"
                variant="ghost"
                size="lg"
                :ui="{ base: 'p-0' }"
                icon="i-lucide-heart"
                :loading="engagementPending === 'thanks'"
                :disabled="engagementLoading || engagementUnavailable || engagementPending !== null || engagement?.thanked"
                :aria-label="engagement?.thanked ? 'Thanked Scott Myers' : 'Thank Scott Myers'"
                @click="recordEngagement('thanks')"
              >
                <span class="archive-info-thank-label">
                  {{ engagement?.thanked ? 'Thanked' : 'Thank Scott Myers' }}
                </span>
              </UButton>
              <p
                class="archive-info-engagement-count archive-info-engagement-slot"
                :class="{ 'archive-info-engagement-slot--empty': !engagement }"
                :aria-hidden="!engagement"
              >
                <template v-if="engagement">
                  {{ engagement.thanksCount.toLocaleString() }}
                  {{ engagement.thanksCount === 1 ? 'person has' : 'people have' }} thanked Scott
                </template>
                <template v-else>
                  0 people have thanked Scott
                </template>
              </p>
              <a
                class="archive-info-source-link"
                href="https://www.patreon.com/GoIntoTheStory/posts/download-spec-168834157"
                target="_blank"
                rel="noreferrer"
                @click="recordEngagement('patreon')"
              >
                <span class="archive-info-source-link-mark" aria-hidden="true">
                  <UIcon
                    name="i-simple-icons-patreon"
                    class="archive-info-source-link-icon"
                  />
                </span>
                <span class="archive-info-source-link-body">
                  <span class="archive-info-source-link-kicker">Support the source</span>
                  <span class="archive-info-source-link-copy">Scott Myers publishes the original archive on Patreon</span>
                </span>
                <UIcon
                  name="i-lucide-arrow-up-right"
                  class="archive-info-source-link-arrow"
                  aria-hidden="true"
                />
              </a>
              <p
                class="archive-info-patreon-count archive-info-engagement-slot"
                :class="{ 'archive-info-engagement-slot--empty': !engagement }"
                :aria-hidden="!engagement"
              >
                <template v-if="engagement">
                  {{ engagement.patreonCount.toLocaleString() }}
                  {{ engagement.patreonCount === 1 ? 'person has' : 'people have' }} clicked to join Patreon
                </template>
                <template v-else>
                  0 people have clicked to join Patreon
                </template>
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="analysisOpen" key="analysis" class="archive-analysis-surface">
          <div class="archive-analysis-surface-header">
            <UColorModeButton class="archive-analysis-color-mode" color="neutral" variant="ghost" />
            <h2 class="archive-analysis-surface-title" aria-live="polite">{{ analysisSectionTitle }}</h2>
            <UButton class="archive-info-close archive-analysis-close" color="neutral" variant="ghost" size="lg" icon="i-lucide-x"
              aria-label="Close archive analysis" title="Close archive analysis" @click="closeSearch" />
          </div>
          <ArchiveAnalysis @section-change="analysisSectionTitle = $event" />
        </div>

        <div v-else-if="!showSearchResults" ref="feedViewport" key="feed" class="archive-feed">
          <section v-for="(deal, dealIndex) in shuffledDeals" :id="`deal-${deal.id}`" :key="deal.id" class="deal-screen"
            :aria-label="deal.title || deal.logline">
            <div class="archive-frame">
              <DealPanel
                v-if="isDealRendered(dealIndex)"
                :deal="deal"
              />
              <div
                v-else
                class="deal-stage deal-stage--fallback"
                aria-hidden="true"
              >
                <section class="deal-copy">
                  <div
                    v-if="deal.year || deal.genre"
                    class="deal-eyebrow"
                  >
                    <span v-if="deal.year" class="deal-eyebrow-year">{{ deal.year }}</span>
                    <span
                      v-if="deal.year && deal.genre"
                      class="deal-eyebrow-separator"
                      aria-hidden="true"
                    >·</span>
                    <span v-if="deal.genreGroup || deal.genre" class="deal-eyebrow-genre">{{ deal.genreGroup || deal.genre }}</span>
                  </div>
                  <h2
                    v-if="deal.title"
                    :class="['deal-title', dealTitleClass(deal.title)]"
                  >
                    {{ deal.title }}
                  </h2>
                  <div
                    v-if="deal.writers"
                    class="deal-byline"
                  >
                    <p class="deal-writers">
                      {{ deal.writers }}
                    </p>
                  </div>
                  <div class="deal-logline-wrap">
                    <p
                      :class="['deal-logline', dealLoglineClass(deal.logline)]"
                    >
                      {{ deal.logline }}
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>

        <section v-else key="search" class="search-surface" aria-label="Search results">
          <div class="search-surface-inner">
            <div class="search-surface-head">
              <div class="search-surface-meta">
                <p v-if="resultLabel">
                  {{ resultLabel }}
                </p>
                <UButton label="Close" color="neutral" variant="ghost" size="xs" @click="closeSearch" />
              </div>
            </div>

            <div id="archive-search-results" class="search-results" aria-live="polite">
              <button v-for="deal in searchResults" :key="deal.id" type="button" class="search-result"
                :aria-label="deal.title ? `${deal.title}. ${deal.logline}` : deal.logline" @click="selectDeal(deal)">
                <DealPanel :deal="deal" compact />
              </button>
            </div>
          </div>
        </section>
      </Transition>

      <div class="search-dock">
        <UButton class="archive-info-button" color="neutral" variant="outline" size="xl" icon="i-lucide-info"
          :ui="{ base: 'justify-center p-0', leadingIcon: 'mx-0' }" aria-label="About this archive"
          :aria-pressed="infoOpen" title="About this archive" @click="toggleInfo" />

        <div class="search-dock-inner">
          <UInput ref="searchInput" v-model="query" class="archive-search-input" color="neutral" variant="outline"
            size="xl" placeholder="e.g. father thriller" aria-label="Search the archive"
            :aria-expanded="showSearchResults" aria-controls="archive-search-results" @focus="searchOpen = true">
            <template #leading>
              <UIcon name="i-lucide-search" class="size-5 text-muted" />
            </template>

            <template #trailing>
              <UButton v-if="query" color="neutral" variant="ghost" size="xs" icon="i-lucide-x"
                aria-label="Clear search" @click.stop="clearSearch" />
            </template>
          </UInput>
        </div>

        <button type="button" class="archive-analysis-link" :class="{ 'archive-analysis-link--active': analysisOpen }"
          aria-label="Toggle archive analysis" :aria-pressed="analysisOpen" title="Toggle archive analysis" @click="toggleAnalysis">
          <UIcon name="i-lucide-chart-no-axes-combined" class="size-6" aria-hidden="true" />
        </button>

        <div class="deal-refresh-slot">
          <UButton v-if="!showSearchResults" class="deal-refresh-control" color="primary" variant="solid" size="xl"
            icon="i-lucide-refresh-cw" :ui="{ base: 'p-0', leadingIcon: 'mx-0' }" aria-label="Shuffle logline order"
            title="Shuffle logline order" @click="shuffleFeed(true)" />
        </div>
      </div>
    </div>
  </main>
</template>
