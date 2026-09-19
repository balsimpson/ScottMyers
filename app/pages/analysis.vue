<script setup lang="ts">
import '~/assets/css/analysis.css'
import { formatCount, percentage, analysisRow } from '~/utils/deal-analysis'
import { storyPatterns, storyReviewDate, storyReviewMethod, storyReviewFor } from '~/utils/story-patterns'
import type { AnalysisBar } from '~/utils/deal-analysis'

const {
  deals, fromYear, toYear, genre, years, genres, periods, filtered, analysis,
  patterns, coverage, buyers, buyerField, buyerCoverage, comparisonBasis,
  periodA, periodB, leftPeriod, rightPeriod, comparison, periodCoverage,
  selection, drawerOpen, selectionDeals, isFiltered, showDeals, resetFilters
} = useArchiveAnalysis()

const peakYear = computed(() => [...analysis.value.years].sort((a, b) => b.count - a.count)[0])
const missingGenres = computed(() => filtered.value.filter(deal => !deal.genre).length)

function showPattern(row: AnalysisBar) {
  const definition = storyPatterns.find(pattern => pattern.key === row.key)
  showDeals(row, `AI interpretation. ${definition?.description ?? ''} Based on saved logline reviews, not source genre labels.`)
}

function showAnalysedEntries() {
  const reviewed = filtered.value.filter(deal => storyReviewFor(deal))
  showDeals(analysisRow('analysed', 'Analysed loglines', reviewed, filtered.value.length), 'Saved AI analysis. Open an entry’s source details to see its protagonist, goal, obstacle and stakes.')
}

useSeoMeta({
  title: 'Archive analysis — Myers Archive',
  description: 'Explore story patterns, compare decades, and read the spec script deals behind the Myers Archive.'
})
</script>

<template>
  <main class="analysis-page analysis-explorer">
    <header class="analysis-header">
      <div class="analysis-header-nav">
        <NuxtLink
          to="/"
          class="analysis-back-link"
        >
          <UIcon
            name="i-lucide-arrow-left"
            aria-hidden="true"
          />
          Back to archive
        </NuxtLink>
        <UColorModeButton
          color="neutral"
          variant="ghost"
        />
      </div>
      <h1>The stories behind the deals</h1>
      <p class="analysis-intro">
        Explore {{ formatCount(deals.length) }} recorded spec script deals. Follow a story pattern, compare periods, and read the loglines behind the numbers.
      </p>
      <nav
        v-if="filtered.length"
        class="analysis-jump-links"
        aria-label="Analysis sections"
      >
        <a href="#patterns">Story patterns</a>
        <a href="#comparison-heading">Compare periods</a>
        <a href="#buyers">Buyers</a>
        <a href="#archive-data">Archive data</a>
      </nav>

      <div class="analysis-filter-bar">
        <div class="grid grid-cols-2 gap-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
          <UFormField
            label="From year"
            name="from-year"
          >
            <USelect
              v-model="fromYear"
              :items="years"
              class="w-full"
              :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }"
            />
          </UFormField>
          <UFormField
            label="To year"
            name="to-year"
          >
            <USelect
              v-model="toYear"
              :items="years"
              class="w-full"
              :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }"
            />
          </UFormField>
          <UFormField
            label="Genre"
            name="genre"
            class="col-span-2 md:col-span-1"
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
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="!isFiltered"
            @click="resetFilters"
          >
            Reset filters
          </UButton>
        </div>
        <p
          class="analysis-filter-summary"
          role="status"
        >
          <strong>{{ formatCount(analysis.total) }}</strong> of {{ formatCount(deals.length) }} entries · {{ fromYear }}–{{ toYear }}
          <span v-if="genre !== 'all'"> · {{ genre }}</span>
        </p>
      </div>
    </header>

    <div
      v-if="!filtered.length"
      class="analysis-content analysis-empty"
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

    <div
      v-else
      class="analysis-content"
    >
      <section
        id="patterns"
        class="analysis-section"
        aria-labelledby="patterns-heading"
      >
        <div class="analysis-section-heading">
          <div>
            <h2 id="patterns-heading">
              Explore story patterns
            </h2>
            <p>Different genres can share the same premise. Choose a pattern to read the loglines that support it.</p>
          </div>
          <span class="analysis-source-label">AI interpretation</span>
        </div>
        <div class="analysis-pattern-layout">
          <AnalysisBarList
            :rows="patterns"
            :limit="8"
            @select="showPattern"
          />
          <aside class="analysis-pattern-note">
            <h3>Saved analysis</h3>
            <p><strong>{{ formatCount(coverage.reviewed) }} of {{ formatCount(analysis.total) }}</strong> loglines analysed in this selection. Coverage: {{ percentage(coverage.reviewed, analysis.total) }}%.</p>
            <p>{{ formatCount(coverage.tagged) }} entries match at least one of these eight patterns. {{ formatCount(coverage.withoutPattern) }} have no established match.</p>
            <p v-if="coverage.limited">
              {{ formatCount(coverage.limited) }} entries contain no usable logline or too little story detail to extract a protagonist, goal, obstacle or stakes.
            </p>
            <p>Every analysis is saved and reused. One story can have several tags; no match does not mean it was skipped.</p>
            <UButton
              color="neutral"
              variant="outline"
              :disabled="!coverage.reviewed"
              @click="showAnalysedEntries"
            >
              Browse analysed loglines
            </UButton>
            <a href="#method">How the analysis was made <UIcon
              name="i-lucide-arrow-down"
              aria-hidden="true"
            /></a>
          </aside>
        </div>
        <p
          v-if="!coverage.tagged"
          class="analysis-note"
        >
          No story patterns have been established for this selection. The source-data charts below still include every matching entry.
        </p>
        <p class="analysis-note">
          Percentages use all {{ formatCount(analysis.total) }} filtered entries. Open any row to inspect the source loglines and tag definitions.
        </p>
      </section>

      <AnalysisPeriodComparison
        v-model:first="periodA"
        v-model:second="periodB"
        v-model:basis="comparisonBasis"
        :periods="periods"
        :rows="comparison"
        :left="leftPeriod"
        :right="rightPeriod"
        :coverage="periodCoverage"
        @select="showDeals"
      />

      <section
        id="buyers"
        class="analysis-section"
        aria-labelledby="buyers-heading"
      >
        <div class="analysis-section-heading">
          <div>
            <h2 id="buyers-heading">
              Who is behind the deals?
            </h2>
            <p>Open a buyer’s entries to see its recorded genres and story patterns.</p>
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
        <div class="analysis-chart">
          <AnalysisBarList
            v-if="buyers.length"
            :rows="buyers"
            @select="showDeals"
          />
          <p
            v-else
            class="analysis-note"
          >
            No {{ buyerField === 'studio' ? 'studio' : 'production company' }} is recorded for this selection.
          </p>
        </div>
        <p class="analysis-note">
          Top 10 recorded names. {{ formatCount(buyerCoverage) }} of {{ formatCount(analysis.total) }} entries list a {{ buyerField === 'studio' ? 'studio' : 'production company' }}. Original names and joint credits stay intact; these are historical credits, not current buying preferences.
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
              The archive, year by year
            </h2>
            <p>Every bar opens the entries behind it.</p>
          </div>
          <span
            v-if="peakYear?.count"
            class="analysis-source-label"
          >Peak: {{ peakYear.label }} · {{ peakYear.count }} entries</span>
        </div>
        <AnalysisYearChart
          :rows="analysis.years"
          @select="showDeals"
        />
      </section>

      <div class="analysis-grid">
        <section
          class="analysis-section"
          aria-labelledby="genres-heading"
        >
          <div class="analysis-section-heading">
            <div>
              <h2 id="genres-heading">
                Recorded genres
              </h2>
              <p>The most common source labels in this selection.</p>
            </div>
          </div>
          <div class="analysis-chart">
            <AnalysisBarList
              :rows="analysis.genres"
              @select="showDeals"
            />
          </div>
          <p class="analysis-note">
            Combined labels stay intact. {{ missingGenres }} entries have no recorded genre. Percentages include those entries.
          </p>
        </section>
        <section
          class="analysis-section"
          aria-labelledby="length-heading"
        >
          <div class="analysis-section-heading">
            <div>
              <h2 id="length-heading">
                How long is a logline?
              </h2>
              <p>Median: {{ analysis.median }} words · Average: {{ analysis.average }} words</p>
            </div>
          </div>
          <div class="analysis-chart">
            <AnalysisBarList
              :rows="analysis.lengths"
              @select="row => showDeals(row, 'Loglines in this word-count range, within the current filters.')"
            />
          </div>
          <p class="analysis-note">
            Words per source logline. Length describes the archive’s summaries, not the quality of a screenplay.
          </p>
        </section>
      </div>

      <section
        class="analysis-section"
        aria-labelledby="words-heading"
      >
        <div class="analysis-section-heading">
          <div>
            <h2 id="words-heading">
              The words that recur
            </h2>
            <p>How many loglines contain each word, counted once per logline.</p>
          </div>
        </div>
        <div class="analysis-chart analysis-words-chart">
          <AnalysisBarList
            :rows="analysis.words"
            :limit="20"
            @select="row => showDeals(row, 'Each source logline contains this exact word form. Repeated occurrences count once.')"
          />
        </div>
        <p class="analysis-note">
          Common function words are excluded. “Find” and “finds” remain separate. Word frequency is not a story-pattern classification.
        </p>
      </section>
    </div>

    <footer
      id="method"
      class="analysis-footer analysis-method"
    >
      <div>
        <h2>About this analysis</h2>
        <p>Counts are calculated from the Myers Archive dataset. Its {{ formatCount(deals.length) }} extracted entries include two more than the source’s stated count of 2,560. Entries are counted as recorded, including possible repeat reports.</p>
        <details>
          <summary>AI tags, coverage &amp; limitations</summary>
          <p>{{ storyReviewMethod }}</p>
          <p>Saved analysis: {{ storyReviewDate }}. Source genres and deal details are preserved. An edited logline keeps its previous analysis on file, but that analysis is excluded from the charts until refreshed. {{ coverage.stale }} changed and {{ coverage.missing }} new entries need analysis in this selection.</p>
          <p>The review uses only the logline, not the full screenplay. It does not establish production outcomes, commercial success, or a script’s likelihood of selling.</p>
        </details>
      </div>
      <NuxtLink
        to="/"
        class="analysis-footer-link"
      >Return to archive <UIcon
        name="i-lucide-arrow-up-right"
        aria-hidden="true"
      /></NuxtLink>
    </footer>
    <AnalysisDealDrawer
      v-model:open="drawerOpen"
      :title="selection?.label ?? 'Archive entries'"
      :description="selection?.description ?? ''"
      :deals="selectionDeals"
    />
  </main>
</template>
