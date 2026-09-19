<script setup lang="ts">
import '~/assets/css/analysis.css'
import { formatCount, percentage, analysisRow } from '~/utils/deal-analysis'
import { storyPatterns, storyReviewFor } from '~/utils/story-patterns'
import type { AnalysisBar } from '~/utils/deal-analysis'

const {
    deals, fromYear, toYear, genre, years, genres, periods, filtered, analysis,
    patterns, coverage, buyers, buyerField, buyerCoverage, comparisonBasis,
    periodA, periodB, leftPeriod, rightPeriod, comparison, periodCoverage,
    selection, drawerOpen, selectionDeals, isFiltered, showDeals, resetFilters
} = useArchiveAnalysis()

const peakYear = computed(() => [...analysis.value.years].sort((a, b) => b.count - a.count)[0])
const topGenre = computed(() => analysis.value.genres[0] ?? null)
const reviewedPercentage = computed(() => percentage(coverage.value.reviewed, analysis.value.total))
const taggedPercentage = computed(() => percentage(coverage.value.tagged, analysis.value.total))
const activePatternCount = computed(() => patterns.value.filter(row => row.count > 0).length)
const missingGenres = computed(() => filtered.value.filter(deal => !deal.genre).length)
const buyerLabel = computed(() => buyerField.value === 'studio' ? 'studio' : 'production company')

function showPattern(row: AnalysisBar) {
    const definition = storyPatterns.find(pattern => pattern.key === row.key)
    showDeals(row, `AI interpretation. ${definition?.description ?? ''} Based on saved logline reviews, not source genre labels.`)
}

function showAnalysedEntries() {
    const reviewed = filtered.value.filter(deal => storyReviewFor(deal))
    showDeals(analysisRow('analysed', 'Analysed loglines', reviewed, filtered.value.length), 'Saved AI analysis. Open an entry’s source details to see its protagonist, goal, obstacle and stakes.')
}
</script>

<template>
    <main class="analysis-page analysis-explorer">
        <div class="analysis-dashboard">
            <header class="analysis-header">
                <div class="analysis-dashboard-summary">
                    <div class="analysis-stat-card analysis-stat-card--primary">
                        <span class="analysis-stat-label">Entries</span>
                        <strong>{{ formatCount(analysis.total) }}</strong>
                        <small>{{ fromYear }}–{{ toYear }}</small>
                    </div>
                    <div class="analysis-stat-card">
                        <span class="analysis-stat-label">Tagged</span>
                        <strong>{{ formatCount(coverage.tagged) }}</strong>
                        <small>{{ taggedPercentage }}% matched</small>
                    </div>
                    <div class="analysis-stat-card">
                        <span class="analysis-stat-label">Peak year</span>
                        <strong>{{ peakYear?.label ?? '—' }}</strong>
                        <small>{{ peakYear?.count ? `${formatCount(peakYear.count)} entries` : 'No data' }}</small>
                    </div>
                    <div class="analysis-stat-card">
                        <span class="analysis-stat-label">Top genre</span>
                        <strong>{{ topGenre?.label ?? '—' }}</strong>
                        <small>{{ topGenre?.count ? `${formatCount(topGenre.count)} matches` : 'No genre data'
                        }}</small>
                    </div>
                </div>
            </header>

            <div v-if="!filtered.length" class="analysis-content analysis-empty" role="status">
                <h2>No entries match these filters</h2>
                <p>Choose another genre or widen the year range.</p>
                <UButton color="neutral" variant="outline" @click="resetFilters">
                    Show the full archive
                </UButton>
            </div>

            <div v-else class="analysis-content">
                <div class="analysis-filter-bar">
                    <div class="analysis-filter-controls">
                        <UFormField label="From" name="from-year">
                            <USelect v-model="fromYear" :items="years" class="w-full"
                                :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }" />
                        </UFormField>
                        <UFormField label="To" name="to-year">
                            <USelect v-model="toYear" :items="years" class="w-full"
                                :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }" />
                        </UFormField>
                        <UFormField label="Genre" name="genre" class="col-span-2 md:col-span-1">
                            <USelectMenu v-model="genre" aria-label="Genre" :items="genres" value-key="value"
                                class="w-full"
                                :ui="{ base: 'analysis-select', content: 'analysis-select-menu', input: 'w-full' }" />
                        </UFormField>
                        <UButton color="neutral" variant="ghost" size="sm" :disabled="!isFiltered"
                            @click="resetFilters">
                            Clear
                        </UButton>
                    </div>
                    <p class="analysis-filter-summary" role="status">
                        <strong>{{ formatCount(analysis.total) }}</strong> of {{ formatCount(deals.length) }} entries
                        <span v-if="genre !== 'all'"> · {{ genre }}</span>
                    </p>
                </div>
                <section id="patterns" class="analysis-section" aria-labelledby="patterns-heading">
                    <div class="analysis-section-heading">
                        <div>
                            <h2 id="patterns-heading">Story patterns</h2>
                            <p>Recurring dramatic setup across the selected archive.</p>
                        </div>
                        <span class="analysis-source-label">AI tags</span>
                    </div>
                    <div class="analysis-pattern-layout">
                        <AnalysisBarList :rows="patterns" :limit="20" @select="showPattern" />
                        <aside class="analysis-pattern-note">
                            <h3>Saved interpretation</h3>
                            <p><strong>{{ formatCount(coverage.reviewed) }} of {{ formatCount(analysis.total)
                            }}</strong> loglines in this slice have saved analysis. Coverage sits at {{
                                        reviewedPercentage }}%.</p>
                            <p>{{ formatCount(coverage.tagged) }} entries match at least one of these patterns. {{
                                formatCount(coverage.withoutPattern) }} do not.</p>
                            <p>Showing the top 20 of {{ formatCount(activePatternCount) }} motifs in this selection. A
                                logline can match more than one motif, so pattern counts are not meant to add up to the
                                entry total.</p>
                            <p v-if="coverage.limited">
                                {{ formatCount(coverage.limited) }} entries are too thin to extract a clear protagonist,
                                goal, obstacle or stakes.
                            </p>
                            <UButton color="neutral" variant="outline" :disabled="!coverage.reviewed"
                                @click="showAnalysedEntries">
                                Open analysed loglines
                            </UButton>
                        </aside>
                    </div>
                </section>

                <section id="words" class="analysis-section" aria-labelledby="words-heading">
                    <div class="analysis-section-heading">
                        <div>
                            <h2 id="words-heading">Top 10 words</h2>
                            <p>Most common story words in the selected loglines, including the current genre filter.</p>
                        </div>
                        <span class="analysis-source-label">Source loglines</span>
                    </div>
                    <div class="analysis-chart analysis-words-chart">
                        <AnalysisBarList :rows="analysis.words" :limit="10"
                            @select="row => showDeals(row, 'Each selected source logline contains this word. Repeated occurrences count once.')" />
                    </div>
                    <p class="analysis-note">
                        Counts show how many selected loglines contain each word; repeated uses in one logline count
                        once.
                    </p>
                </section>

                <AnalysisPeriodComparison v-model:first="periodA" v-model:second="periodB"
                    v-model:basis="comparisonBasis" :periods="periods" :rows="comparison" :left="leftPeriod"
                    :right="rightPeriod" :coverage="periodCoverage" @select="showDeals" />

                <section id="buyers" class="analysis-section" aria-labelledby="buyers-heading">
                    <div class="analysis-section-heading">
                        <div>
                            <h2 id="buyers-heading">Buyers</h2>
                            <p>Top recorded studios and production companies.</p>
                        </div>
                        <UFormField label="Company type" name="company-type" class="analysis-buyer-select">
                            <USelect v-model="buyerField"
                                :items="[{ label: 'Studios', value: 'studio' }, { label: 'Production companies', value: 'productionCompany' }]"
                                class="w-full" :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }" />
                        </UFormField>
                    </div>
                    <div class="analysis-chart">
                        <AnalysisBarList v-if="buyers.length" :rows="buyers" @select="showDeals" />
                        <p v-else class="analysis-note">No recorded {{ buyerLabel }} in this slice.</p>
                    </div>
                </section>

                <section id="archive-data" class="analysis-section" aria-labelledby="years-heading">
                    <div class="analysis-section-heading">
                        <div>
                            <h2 id="years-heading">Yearly trend</h2>
                            <p>Deal volume across the selected range.</p>
                        </div>
                        <span v-if="peakYear?.count" class="analysis-source-label">{{ peakYear.label }} peak</span>
                    </div>
                    <AnalysisYearChart :rows="analysis.years" @select="showDeals" />
                </section>

                <div class="analysis-grid">
                    <section class="analysis-section" aria-labelledby="genres-heading">
                        <div class="analysis-section-heading">
                            <div>
                                <h2 id="genres-heading">Genres</h2>
                                <p>Most common labels in the current selection.</p>
                            </div>
                        </div>
                        <div class="analysis-chart">
                            <AnalysisBarList :rows="analysis.genres" @select="showDeals" />
                        </div>
                    </section>
                    <section class="analysis-section" aria-labelledby="length-heading">
                        <div class="analysis-section-heading">
                            <div>
                                <h2 id="length-heading">Logline length</h2>
                                <p>Median {{ analysis.median }} words · Avg {{ analysis.average }} words</p>
                            </div>
                        </div>
                        <div class="analysis-chart">
                            <AnalysisBarList :rows="analysis.lengths"
                                @select="row => showDeals(row, 'Loglines in this word-count range, within the current filters.')" />
                        </div>
                    </section>
                </div>

                <section class="analysis-section" aria-labelledby="words-heading">
                    <div class="analysis-section-heading">
                        <div>
                            <h2 id="words-heading">Recurring words</h2>
                            <p>Words that appear most often in the selected loglines.</p>
                        </div>
                    </div>
                    <div class="analysis-chart analysis-words-chart">
                        <AnalysisBarList :rows="analysis.words" :limit="20"
                            @select="row => showDeals(row, 'Each source logline contains this exact word form. Repeated occurrences count once.')" />
                    </div>
                </section>
            </div>

        </div>

        <AnalysisDealDrawer v-model:open="drawerOpen" :title="selection?.label ?? 'Archive entries'"
            :description="selection?.description ?? ''" :deals="selectionDeals" />
    </main>
</template>
