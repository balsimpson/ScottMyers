import { deals } from '~/data/deals'
import { analyzeDeals, patternRows, rankField, type AnalysisBar } from '~/utils/deal-analysis'
import { storyCoverage } from '~/utils/story-patterns'

export function useArchiveAnalysis() {
  const firstYear = Math.min(...deals.map(deal => deal.year))
  const lastYear = Math.max(...deals.map(deal => deal.year))
  const year = ref<number | 'all'>('all')
  const genre = ref('all')
  const buyerField = ref<'studio' | 'productionCompany'>('studio')
  const selection = shallowRef<{ label: string, ids: string[] } | null>(null)
  const drawerOpen = ref(false)

  const years = [{ label: 'All years', value: 'all' as const }, ...Array.from({ length: lastYear - firstYear + 1 }, (_, index) => ({ label: String(firstYear + index), value: firstYear + index }))]
  const genres = [{ label: 'All genres', value: 'all' }, ...rankField(deals, 'genre').sort((a, b) => a.label.localeCompare(b.label)).map(row => ({ label: row.label, value: row.key }))]
  const filtered = computed(() => deals.filter(deal => (year.value === 'all' || deal.year === year.value) && (genre.value === 'all' || deal.genreGroup === genre.value)))
  const analysis = computed(() => analyzeDeals(filtered.value, year.value === 'all' ? firstYear : year.value, year.value === 'all' ? lastYear : year.value))
  const patterns = computed(() => patternRows(filtered.value))
  const coverage = computed(() => storyCoverage(filtered.value))
  const buyers = computed(() => rankField(filtered.value, buyerField.value))
  const buyerCoverage = computed(() => filtered.value.filter(deal => deal[buyerField.value]).length)
  const selectionDeals = computed(() => {
    const ids = new Set(selection.value?.ids ?? [])
    return filtered.value.filter(deal => ids.has(deal.id)).sort((a, b) => b.year - a.year || a.entryNumber - b.entryNumber)
  })
  const isFiltered = computed(() => year.value !== 'all' || genre.value !== 'all')

  watch([year, genre], () => {
    drawerOpen.value = false
  })

  function showDeals(row: AnalysisBar, label = row.label) {
    selection.value = { label, ids: row.ids }
    drawerOpen.value = true
  }

  function resetFilters() {
    year.value = 'all'
    genre.value = 'all'
  }

  return { deals, year, genre, years, genres, filtered, analysis, patterns, coverage, buyers, buyerField, buyerCoverage, selection, drawerOpen, selectionDeals, isFiltered, showDeals, resetFilters }
}
