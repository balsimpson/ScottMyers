import type { Deal } from '../data/deals'
import { patternsFor, storyPatterns } from './story-patterns'

export interface AnalysisBar {
  key: string
  label: string
  count: number
  share: number
  ids: string[]
}

export type GenreTrendPoint = AnalysisBar

export interface GenreTrendYear {
  year: number
  label: string
  total: number
  points: GenreTrendPoint[]
}

export interface GenreTrend {
  series: { key: string, label: string }[]
  years: GenreTrendYear[]
}

const stopWords = new Set('a an and are as at be been being but by can could did do does for from had has have he her him his how if in into is it its just me more most my no not of off on one or our out she so some than that the their them then there they this through to too under up was we were what when where which who will with would you your after all also about against among around back before between each few down first last new old other once only same such very while without'.split(' '))

export function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

export function storyWords(value: string) {
  return new Set((value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]{3,}/g) ?? []).filter(word => !stopWords.has(word)))
}

export function percentage(count: number, total: number) {
  return total ? +(count / total * 100).toFixed(1) : 0
}

export function analysisRow(key: string, label: string, matches: Deal[], total: number): AnalysisBar {
  return { key, label, count: matches.length, share: percentage(matches.length, total), ids: matches.map(deal => deal.id) }
}

export function rankField(source: Deal[], field: 'genre' | 'studio' | 'productionCompany') {
  const groups = new Map<string, Deal[]>()
  for (const deal of source) {
    const label = field === 'genre' ? deal.genreGroup : deal[field]
    if (!label) continue
    const group = groups.get(label) ?? []
    group.push(deal)
    groups.set(label, group)
  }
  return [...groups].map(([label, matches]) => analysisRow(label, label, matches, source.length))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function patternRows(source: Deal[]) {
  const memberships = source.map(deal => ({ deal, keys: patternsFor(deal).map(pattern => pattern.key) }))
  return storyPatterns.map(pattern => analysisRow(pattern.key, pattern.label, memberships.filter(item => item.keys.includes(pattern.key)).map(item => item.deal), source.length))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function genreTrendRows(source: Deal[], firstYear: number, lastYear: number, limit = 10): GenreTrend {
  const rankedGenres = rankField(source, 'genre')
  const primaryGenres = rankedGenres.slice(0, limit).map(row => ({ key: row.key, label: row.label }))
  const primaryKeys = new Set(primaryGenres.map(series => series.key))
  const remainingGenres = rankedGenres.some(row => !primaryKeys.has(row.key))
  const hasUnspecified = source.some(deal => !deal.genreGroup)
  const series = [
    ...primaryGenres,
    ...(remainingGenres ? [{ key: '__other__', label: 'Other' }] : []),
    ...(hasUnspecified ? [{ key: '__unspecified__', label: 'Unspecified' }] : [])
  ]

  const years = Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => {
    const year = firstYear + index
    const yearDeals = source.filter(deal => deal.year === year)
    const points = series.map(({ key, label }) => {
      const matches = yearDeals.filter((deal) => {
        const genre = deal.genreGroup
        if (key === '__other__') return genre !== null && !primaryKeys.has(genre)
        if (key === '__unspecified__') return !deal.genreGroup
        return genre === key
      })

      return analysisRow(key, label, matches, yearDeals.length)
    })

    return { year, label: String(year), total: yearDeals.length, points }
  })

  return { series, years }
}

export function analyzeDeals(source: Deal[], firstYear: number, lastYear: number) {
  const lengths = source.map(deal => wordCount(deal.logline)).sort((a, b) => a - b)
  const middle = Math.floor(lengths.length / 2)
  const median = lengths.length ? lengths.length % 2 ? lengths[middle]! : (lengths[middle - 1]! + lengths[middle]!) / 2 : null
  const words = new Map<string, Deal[]>()
  for (const deal of source) {
    // A repeated word contributes once per logline, matching the chart's claim.
    for (const word of storyWords(deal.logline)) {
      const matches = words.get(word) ?? []
      matches.push(deal)
      words.set(word, matches)
    }
  }
  const bins = [
    { label: '1–15', min: 1, max: 15 },
    { label: '16–30', min: 16, max: 30 },
    { label: '31–45', min: 31, max: 45 },
    { label: '46–60', min: 46, max: 60 },
    { label: '61+', min: 61, max: Infinity }
  ]
  return {
    total: source.length,
    median,
    average: lengths.length ? +(lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1) : null,
    genres: rankField(source, 'genre'),
    genreTrend: genreTrendRows(source, firstYear, lastYear),
    years: Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => {
      const year = firstYear + index
      return analysisRow(String(year), String(year), source.filter(deal => deal.year === year), source.length)
    }),
    words: [...words].map(([word, matches]) => analysisRow(word, word, matches, source.length)).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 20),
    lengths: bins.map(bin => analysisRow(bin.label, bin.label, source.filter((deal) => {
      const count = wordCount(deal.logline)
      return count >= bin.min && count <= bin.max
    }), source.length))
  }
}

export function comparePeriods(left: Deal[], right: Deal[], basis: 'genre' | 'pattern') {
  const a = basis === 'genre' ? rankField(left, 'genre') : patternRows(left)
  const b = basis === 'genre' ? rankField(right, 'genre') : patternRows(right)
  const keys = [...new Set([...a, ...b].map(row => row.key))]
  return keys.map((key) => {
    const first = a.find(row => row.key === key) ?? analysisRow(key, key, [], left.length)
    const second = b.find(row => row.key === key) ?? analysisRow(key, first.label, [], right.length)
    // A missing period is unknown, not a zero-share observation.
    const delta = left.length && right.length ? +(percentage(second.count, right.length) - percentage(first.count, left.length)).toFixed(1) : null
    return { key, label: first.label, first, second, delta }
  }).sort((a, b) => (b.first.count + b.second.count) - (a.first.count + a.second.count) || a.label.localeCompare(b.label))
}

export function formatCount(value: number) {
  return value.toLocaleString('en-US')
}
