import rawDeals from '../../data/deals.json'

export interface Deal {
  id: string
  entryNumber: number
  year: number
  title: string | null
  logline: string
  writers: string | null
  genre: string | null
  agency: string | null
  management: string | null
  lawyer: string | null
  studio: string | null
  productionCompany: string | null
  producer: string | null
  date: string | null
  notes: string | null
  dealAmount: string | null
  sourceNote: string | null
  sourcePage: number
  searchText: string
}

export type SourceDealField = Exclude<keyof Deal, 'id' | 'dealAmount' | 'searchText' | 'sourceNote'>

export const sourceDealFields: SourceDealField[] = [
  'entryNumber',
  'year',
  'title',
  'logline',
  'writers',
  'genre',
  'agency',
  'management',
  'lawyer',
  'studio',
  'productionCompany',
  'producer',
  'date',
  'notes',
  'sourcePage'
]

export const deals = rawDeals as Deal[]
export const SOURCE_CLAIMED_COUNT = 2560

export function normalizeSearch(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

export function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Not listed'
  return String(value)
}

export function filterDeals(
  source: Deal[],
  query: string,
  genre: string,
  agency: string
) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)

  return source.filter((deal) => {
    const matchesQuery = terms.every(term => deal.searchText.includes(term))
    const matchesGenre = genre === 'all' || deal.genre === genre
    const matchesAgency = agency === 'all' || deal.agency === agency

    return matchesQuery && matchesGenre && matchesAgency
  })
}

export function facetOptions(field: 'genre' | 'agency') {
  return [...new Set(
    deals
      .map(deal => deal[field])
      .filter((value): value is string => Boolean(value))
  )].sort((left, right) => left.localeCompare(right))
}

export function sortNewest(source: Deal[]) {
  return [...source].sort((left, right) => {
    if (left.year !== right.year) return right.year - left.year
    return right.entryNumber - left.entryNumber
  })
}
