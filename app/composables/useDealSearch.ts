import {
  deals,
  facetOptions,
  filterDeals,
  sortNewest
} from '~/data/deals'

export function useDealSearch() {
  const query = ref('')
  const genre = ref('all')
  const agency = ref('all')
  const searchOpen = ref(false)

  const genreOptions = computed(() => [
    { label: 'All genres', value: 'all' },
    ...facetOptions('genre').map(value => ({ label: value, value }))
  ])

  const agencyOptions = computed(() => [
    { label: 'All agencies', value: 'all' },
    ...facetOptions('agency').map(value => ({ label: value, value }))
  ])

  const matches = computed(() => filterDeals(deals, query.value, genre.value, agency.value))
  const hasFilters = computed(() => Boolean(query.value.trim()) || genre.value !== 'all' || agency.value !== 'all')
  const searchResults = computed(() => {
    if (hasFilters.value) return matches.value.slice(0, 48)
    return sortNewest(deals).slice(0, 12)
  })

  function clearSearch() {
    query.value = ''
    genre.value = 'all'
    agency.value = 'all'
  }

  return {
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
  }
}
