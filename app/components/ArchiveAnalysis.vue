<script setup lang="ts">
import '~/assets/css/analysis.css'
import { formatCount, percentage, analysisRow } from '~/utils/deal-analysis'
import { storyReviewFor } from '~/utils/story-patterns'
import type { AnalysisBar } from '~/utils/deal-analysis'

const {
  deals, year, genre, years, genres, filtered, analysis,
  patterns, coverage, buyers, buyerField,
  selection, drawerOpen, selectionDeals, isFiltered, showDeals, resetFilters
} = useArchiveAnalysis()

const reviewedPercentage = computed(() => percentage(coverage.value.reviewed, analysis.value.total))
const activePatternCount = computed(() => patterns.value.filter(row => row.count > 0).length)
const buyerLabel = computed(() => buyerField.value === 'studio' ? 'studio' : 'production company')
const buyerTitle = computed(() => buyerField.value === 'studio' ? 'Studio' : 'Production company')
const selectedYearSpan = computed(() => {
  const selectedYears = [...new Set(filtered.value.map(deal => deal.year))].sort((a, b) => a - b)
  const first = selectedYears[0]
  const last = selectedYears.at(-1)

  if (first === undefined || last === undefined) return '—'
  return first === last ? String(first) : `${first}–${last}`
})
const analysisContent = ref<HTMLElement | null>(null)
const drawerScrollTop = ref<number | null>(null)
const defaultSectionTitle = 'Story patterns'
const activeSectionTitle = ref(defaultSectionTitle)
const emit = defineEmits<{ sectionChange: [title: string] }>()
let scrollFrame: number | null = null
let scrollHandler: (() => void) | null = null
let restoreScrollFrame: number | null = null

function showPattern(row: AnalysisBar) {
  showDeals(row, `Story pattern: ${row.label}`)
}

function showAnalysedEntries() {
  const reviewed = filtered.value.filter(deal => storyReviewFor(deal))
  showDeals(analysisRow('analysed', 'Analysed loglines', reviewed, filtered.value.length), 'Analysed loglines')
}

function showStoryWord(row: AnalysisBar) {
  showDeals(row, `Story word: ${row.label}`)
}

function showBuyer(row: AnalysisBar) {
  showDeals(row, `${buyerTitle.value}: ${row.label}`)
}

function showYear(row: AnalysisBar) {
  showDeals(row, `Year: ${row.label}`)
}

function showGenre(row: AnalysisBar) {
  showDeals(row, `Genre: ${row.label}`)
}

function showLength(row: AnalysisBar) {
  showDeals(row, `Logline length: ${row.label}`)
}

function restoreDrawerScroll() {
  const scrollTop = drawerScrollTop.value
  if (scrollTop === null || !import.meta.client) return

  if (restoreScrollFrame !== null) {
    cancelAnimationFrame(restoreScrollFrame)
  }

  restoreScrollFrame = requestAnimationFrame(() => {
    restoreScrollFrame = requestAnimationFrame(() => {
      analysisContent.value?.scrollTo({ top: scrollTop, behavior: 'auto' })
      drawerScrollTop.value = null
      restoreScrollFrame = null
    })
  })
}

function updateSectionTitle() {
  const content = analysisContent.value
  if (!content) return

  const sections = [...content.querySelectorAll<HTMLElement>('.analysis-section')]
  if (!sections.length) return

  const threshold = content.getBoundingClientRect().top + Math.min(240, content.clientHeight * 0.3)
  const activeSection = sections.reduce((active, section) => {
    return section.getBoundingClientRect().top <= threshold ? section : active
  }, sections[0])
  const title = activeSection?.querySelector('h2')?.textContent?.trim() || defaultSectionTitle

  if (title === activeSectionTitle.value) return
  activeSectionTitle.value = title
  emit('sectionChange', title)
}

onMounted(async () => {
  await nextTick()
  const content = analysisContent.value
  if (!content) return

  scrollHandler = () => {
    if (scrollFrame !== null) return
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null
      updateSectionTitle()
    })
  }
  content.addEventListener('scroll', scrollHandler, { passive: true })
  emit('sectionChange', defaultSectionTitle)
  updateSectionTitle()
})

watch([year, genre], () => {
  nextTick(updateSectionTitle)
})

watch(drawerOpen, (open) => {
  if (open) {
    if (restoreScrollFrame !== null) {
      cancelAnimationFrame(restoreScrollFrame)
      restoreScrollFrame = null
    }
    drawerScrollTop.value = analysisContent.value?.scrollTop ?? 0
    return
  }

  restoreDrawerScroll()
}, { flush: 'sync' })

onBeforeUnmount(() => {
  const content = analysisContent.value
  if (content && scrollHandler) content.removeEventListener('scroll', scrollHandler)
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
  if (restoreScrollFrame !== null) cancelAnimationFrame(restoreScrollFrame)
})
</script>

<template>
  <main class="analysis-page analysis-explorer">
    <div class="analysis-dashboard">
      <div
        ref="analysisContent"
        class="analysis-content"
      >
        <div
          v-if="!filtered.length"
          class="analysis-empty"
          role="status"
        >
          <h2>No entries match these filters</h2>
          <p>Choose another genre or widen the year range.</p>
          <UButton
            color="neutral"
            variant="outline"
            @click="resetFilters"
          >
            Show the full archive
          </UButton>
        </div>

        <div v-else>
          <div class="analysis-filter-bar">
            <div class="analysis-filter-header">
              <div>
                <span class="analysis-filter-label">Archive scope</span>
                <p
                  class="analysis-filter-summary"
                  role="status"
                >
                  <strong>{{ formatCount(analysis.total) }}</strong> of {{ formatCount(deals.length) }} entries
                  <span v-if="year !== 'all'"> · {{ year }}</span>
                  <span v-if="genre !== 'all'"> · {{ genre }}</span>
                </p>
              </div>
              <UButton
                v-if="isFiltered"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="resetFilters"
              >
                Reset
              </UButton>
            </div>
            <div class="analysis-filter-controls">
              <UFormField
                label="Year"
                name="year"
              >
                <USelect
                  v-model="year"
                  :items="years"
                  class="w-full"
                  :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }"
                />
              </UFormField>
              <UFormField
                label="Genre"
                name="genre"
              >
                <USelectMenu
                  v-model="genre"
                  aria-label="Genre"
                  :items="genres"
                  value-key="value"
                  class="w-full"
                  :ui="{ base: 'analysis-select', content: 'analysis-select-menu', input: 'w-full' }"
                />
              </UFormField>
            </div>
          </div>
          <div
            class="analysis-overview"
            aria-label="Selection summary"
          >
            <div class="analysis-overview-item analysis-overview-item--primary">
              <span>Entries</span>
              <strong>{{ formatCount(analysis.total) }}</strong>
              <small>in this selection</small>
            </div>
            <div class="analysis-overview-item">
              <span>Year span</span>
              <strong>{{ selectedYearSpan }}</strong>
              <small>selected archive</small>
            </div>
            <div class="analysis-overview-item">
              <span>Median logline</span>
              <strong>{{ analysis.median ?? '—' }}</strong>
              <small>words</small>
            </div>
            <div class="analysis-overview-item">
              <span>Saved analysis</span>
              <strong>{{ reviewedPercentage }}%</strong>
              <small>{{ formatCount(coverage.reviewed) }} entries</small>
            </div>
          </div>
          <section
            id="patterns"
            class="analysis-section"
            aria-labelledby="patterns-heading"
          >
            <div class="analysis-section-heading">
              <div>
                <h2 id="patterns-heading">
                  Story patterns
                </h2>
                <p>Recurring dramatic setup across the selected archive.</p>
              </div>
              <span class="analysis-source-label">Curated tags</span>
            </div>
            <div class="analysis-pattern-layout">
              <AnalysisBarList
                :rows="patterns"
                :limit="20"
                @select="showPattern"
              />
              <aside class="analysis-pattern-note">
                <h3>Coverage</h3>
                <p>
                  <strong>{{ formatCount(coverage.reviewed) }} of {{ formatCount(analysis.total)
                  }}</strong> loglines in this slice have saved analysis. Coverage sits at {{
                    reviewedPercentage }}%.
                </p>
                <p>
                  {{ formatCount(coverage.tagged) }} entries match at least one of these patterns. {{
                    formatCount(coverage.withoutPattern) }} do not.
                </p>
                <p>
                  Showing the top 20 of {{ formatCount(activePatternCount) }} patterns in this selection.
                  A
                  logline can match more than one pattern, so pattern counts are not meant to add up to
                  the
                  entry total.
                </p>
                <p v-if="coverage.limited">
                  {{ formatCount(coverage.limited) }} entries are too thin to extract a clear
                  protagonist,
                  goal, obstacle or stakes.
                </p>
                <UButton
                  color="neutral"
                  variant="outline"
                  :disabled="!coverage.reviewed"
                  @click="showAnalysedEntries"
                >
                  Open analysed loglines
                </UButton>
              </aside>
            </div>
          </section>

          <section
            id="words"
            class="analysis-section"
            aria-labelledby="words-heading"
          >
            <div class="analysis-section-heading">
              <div>
                <h2 id="words-heading">
                  Language of the loglines
                </h2>
                <p>The twenty story words with the widest footprint in the selected loglines.</p>
              </div>
              <span class="analysis-source-label">Source loglines</span>
            </div>
            <AnalysisBarList
              :rows="analysis.words"
              :limit="20"
              @select="showStoryWord"
            />
            <p class="analysis-note">
              Counts show how many selected loglines contain each word. Repeated uses in one logline count once.
            </p>
          </section>

          <section
            id="buyers"
            class="analysis-section"
            aria-labelledby="buyers-heading"
          >
            <div class="analysis-section-heading">
              <div>
                <h2 id="buyers-heading">
                  Buyers
                </h2>
                <p>Top recorded studios and production companies.</p>
              </div>
              <UFormField
                label="Company type"
                name="company-type"
                class="analysis-buyer-select"
              >
                <USelect
                  v-model="buyerField"
                  :items="[{ label: 'Studios', value: 'studio' }, { label: 'Production companies', value: 'productionCompany' }]"
                  class="w-full"
                  :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }"
                />
              </UFormField>
            </div>
            <AnalysisBarList
              v-if="buyers.length"
              :rows="buyers"
              @select="showBuyer"
            />
            <p
              v-else
              class="analysis-note"
            >
              No recorded {{ buyerLabel }} in this slice.
            </p>
          </section>

          <section
            id="archive-data"
            class="analysis-section"
            aria-labelledby="years-heading"
          >
            <div class="analysis-section-heading">
              <div>
                <h2 id="years-heading">
                  Yearly trend
                </h2>
                <p>Deal volume across the selected range.</p>
              </div>
            </div>
            <AnalysisYearChart
              :rows="analysis.years"
              @select="showYear"
            />
          </section>

          <AnalysisPeriodComparison
            :trend="analysis.genreTrend"
            @select="showDeals"
          />

          <div class="analysis-grid">
            <section
              class="analysis-section"
              aria-labelledby="genres-heading"
            >
              <div class="analysis-section-heading">
                <div>
                  <h2 id="genres-heading">
                    Genres
                  </h2>
                  <p>Most common labels in the current selection.</p>
                </div>
              </div>
              <AnalysisBarList
                :rows="analysis.genres"
                :limit="8"
                @select="showGenre"
              />
            </section>
            <section
              class="analysis-section"
              aria-labelledby="length-heading"
            >
              <div class="analysis-section-heading">
                <div>
                  <h2 id="length-heading">
                    Logline length
                  </h2>
                  <p>Median {{ analysis.median }} words · Avg {{ analysis.average }} words</p>
                </div>
              </div>
              <AnalysisLengthChart
                :rows="analysis.lengths"
                @select="showLength"
              />
            </section>
          </div>
        </div>
      </div>
    </div>

    <AnalysisDealDrawer
      v-model:open="drawerOpen"
      :title="selection?.label ?? 'Archive entries'"
      :deals="selectionDeals"
    />
  </main>
</template>
