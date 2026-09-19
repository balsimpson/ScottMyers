import { deals } from '~/data/deals'
import { analyzeDeals, comparePeriods, patternRows, rankField, type AnalysisBar } from '~/utils/deal-analysis'
import { storyCoverage } from '~/utils/story-patterns'

export function useArchiveAnalysis() {
  const firstYear = Math.min(...deals.map(deal => deal.year))
  const lastYear = Math.max(...deals.map(deal => deal.year))
  const fromYear = ref(firstYear)
  const toYear = ref(lastYear)
  const genre = ref('all')
  const comparisonBasis = ref<'genre' | 'pattern'>('genre')
  const buyerField = ref<'studio' | 'productionCompany'>('studio')
  const periodA = ref(2000)
  const periodB = ref(2010)
  const selection = shallowRef<{ label: string, description: string, ids: string[] } | null>(null)
  const drawerOpen = ref(false)

  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => ({ label: String(firstYear + index), value: firstYear + index }))
  const genres = [{ label: 'All genres', value: 'all' }, ...rankField(deals, 'genre').sort((a, b) => a.label.localeCompare(b.label)).map(row => ({ label: row.label, value: row.key }))]
  const periods = Array.from({ length: Math.floor(lastYear / 10) - Math.floor(firstYear / 10) + 1 }, (_, index) => {
    const start = Math.floor(firstYear / 10) * 10 + index * 10
    return { label: `${Math.max(firstYear, start)}–${Math.min(lastYear, start + 9)}`, value: start }
  })
  const filtered = computed(() => deals.filter(deal => deal.year >= fromYear.value && deal.year <= toYear.value && (genre.value === 'all' || deal.genreGroup === genre.value)))
  const analysis = computed(() => analyzeDeals(filtered.value, fromYear.value, toYear.value))
  const patterns = computed(() => patternRows(filtered.value))
  const coverage = computed(() => storyCoverage(filtered.value))
  const buyers = computed(() => rankField(filtered.value, buyerField.value))
  const buyerCoverage = computed(() => filtered.value.filter(deal => deal[buyerField.value]).length)
  const leftPeriod = computed(() => filtered.value.filter(deal => deal.year >= periodA.value && deal.year <= periodA.value + 9))
  const rightPeriod = computed(() => filtered.value.filter(deal => deal.year >= periodB.value && deal.year <= periodB.value + 9))
  const comparison = computed(() => comparePeriods(leftPeriod.value, rightPeriod.value, comparisonBasis.value).slice(0, 10))
  const periodCoverage = computed(() => ({ left: storyCoverage(leftPeriod.value), right: storyCoverage(rightPeriod.value) }))
  const selectionDeals = computed(() => {
    const ids = new Set(selection.value?.ids ?? [])
    return filtered.value.filter(deal => ids.has(deal.id)).sort((a, b) => b.year - a.year || a.entryNumber - b.entryNumber)
  })
  const isFiltered = computed(() => fromYear.value !== firstYear || toYear.value !== lastYear || genre.value !== 'all')

  watch(fromYear, (value) => {
    if (value > toYear.value) toYear.value = value
  })
  watch(toYear, (value) => {
    if (value < fromYear.value) fromYear.value = value
  })
  watch([fromYear, toYear, genre], () => {
    drawerOpen.value = false
  })

  function showDeals(row: AnalysisBar, description = 'Recorded entries within the current year and genre filters.') {
    selection.value = { label: row.label, description, ids: row.ids }
    drawerOpen.value = true
  }

  function resetFilters() {
    fromYear.value = firstYear
    toYear.value = lastYear
    genre.value = 'all'
  }

  return { deals, fromYear, toYear, genre, years, genres, periods, filtered, analysis, patterns, coverage, buyers, buyerField, buyerCoverage, comparisonBasis, periodA, periodB, leftPeriod, rightPeriod, comparison, periodCoverage, selection, drawerOpen, selectionDeals, isFiltered, showDeals, resetFilters }
}
