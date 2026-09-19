<script setup lang="ts">
import type { Deal } from '~/data/deals'
import type { AnalysisBar, comparePeriods } from '~/utils/deal-analysis'
import { formatCount } from '~/utils/deal-analysis'

const first = defineModel<number>('first', { required: true })
const second = defineModel<number>('second', { required: true })
const basis = defineModel<'genre' | 'pattern'>('basis', { required: true })
const genreNote = 'Canonical genre families consolidate source labels. Shares use all matching entries in each period, including those with no genre listed.'
const patternNote = 'An entry can have several motifs. Untagged entries are included in the denominator.'
defineProps<{
  periods: { label: string, value: number }[]
  rows: ReturnType<typeof comparePeriods>
  left: Deal[]
  right: Deal[]
  coverage: { left: { reviewed: number }, right: { reviewed: number } }
}>()
defineEmits<{ select: [row: AnalysisBar, description: string] }>()
function range(source: Deal[]) {
  return source.length ? `${Math.min(...source.map(deal => deal.year))}–${Math.max(...source.map(deal => deal.year))}` : 'No matching years'
}
</script>

<template>
  <section class="analysis-section" aria-labelledby="comparison-heading">
    <div class="analysis-section-heading">
      <div>
        <h2 id="comparison-heading">
          What changes over time?
        </h2>
        <p>Compare the share of entries in two periods. Your year and genre filters apply to both.</p>
      </div>
    </div>
    <div class="analysis-comparison-controls grid grid-cols-1 gap-4 sm:grid-cols-3">
      <UFormField label="Compare" name="comparison-basis">
        <USelect v-model="basis"
          :items="[{ label: 'Recorded genres', value: 'genre' }, { label: 'AI-tagged patterns', value: 'pattern' }]"
          class="w-full" :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }" />
      </UFormField>
      <UFormField label="First period" name="first-period">
        <USelect v-model="first" :items="periods" class="w-full"
          :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }" />
      </UFormField>
      <UFormField label="Second period" name="second-period">
        <USelect v-model="second" :items="periods" class="w-full"
          :ui="{ base: 'analysis-select', content: 'analysis-select-menu' }" />
      </UFormField>
    </div>
    <p v-if="basis === 'pattern'" class="analysis-note">
      Saved analysis covers {{ formatCount(coverage.left.reviewed) }} of {{ formatCount(left.length) }} entries in the
      first period and {{ formatCount(coverage.right.reviewed) }} of {{ formatCount(right.length) }} in the second. Tags
      reflect the information in each logline; sparse descriptions may leave a pattern unestablished.
    </p>
    <p v-if="first === second" class="analysis-note">
      Both columns use the same period. Choose different periods to compare change.
    </p>
    <p v-if="!left.length || !right.length" class="analysis-note" role="status">
      At least one period has no entries under these filters. Widen the year range or change the periods to compare
      their shares.
    </p>
    <div class="analysis-table-scroll" role="region" aria-label="Period comparison" tabindex="0">
      <table class="analysis-comparison-table">
        <caption class="visually-hidden">
          {{ basis === 'genre' ? 'Genre' : 'Tagged pattern' }} shares within filtered archive entries. Change is in
          percentage points.
        </caption>
        <thead>
          <tr>
            <th scope="col">
              {{ basis === 'genre' ? 'Genre' : 'Pattern' }}
            </th>
            <th scope="col">
              {{ range(left) }}<small>{{ formatCount(left.length) }} entries</small>
            </th>
            <th scope="col">
              {{ range(right) }}<small>{{ formatCount(right.length) }} entries</small>
            </th>
            <th scope="col">
              Change<small>percentage points</small>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <th scope="row">
              {{ row.label }}
            </th>
            <td v-for="(cell, index) in [row.first, row.second]" :key="index">
              <button type="button" :disabled="!cell.count"
                :aria-label="`${row.label}, ${index === 0 ? 'first' : 'second'} period: ${cell.count} entries. View entries`"
                @click="$emit('select', cell, `Entries in ${index === 0 ? range(left) : range(right)}, within the current filters.`)">
                {{ (index === 0 ? left.length : right.length) ? `${cell.share}%` : '—' }}<small>{{
                  formatCount(cell.count) }} entries</small>
              </button>
            </td>
            <td class="analysis-delta">
              {{ row.delta === null ? '—' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)}` }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="analysis-note">
      {{ basis === 'genre' ? genreNote : patternNote }} Archive coverage is uneven; these are not market-wide trends.
    </p>
  </section>
</template>
