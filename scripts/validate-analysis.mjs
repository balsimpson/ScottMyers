import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createJiti } from 'jiti'
import { createHash } from 'node:crypto'

const jiti = createJiti(import.meta.url)
const { analyzeDeals, comparePeriods, patternRows, rankField } = await jiti.import('../app/utils/deal-analysis.ts')
const { storyPatterns, storyReviewFor, patternsFor, storyCoverage } = await jiti.import('../app/utils/story-patterns.ts')
const deals = JSON.parse(fs.readFileSync(new URL('../data/deals.json', import.meta.url), 'utf8'))
const reviews = JSON.parse(fs.readFileSync(new URL('../data/story-reviews.json', import.meta.url), 'utf8'))
const byId = new Map(deals.map(deal => [deal.id, deal]))
const keys = new Set(storyPatterns.map(pattern => pattern.key))
const reviewedIds = new Set()
assert([3, 4].includes(reviews.version), 'Expected enriched saved-analysis schema')
assert.equal(reviews.records.length, deals.length, 'Every source entry must have a saved analysis')
assert.equal(reviews.sourceCount, deals.length)
const sourceFingerprint = createHash('sha256').update(JSON.stringify(deals.map(({ id, logline }) => ({ id, logline })).sort((a, b) => a.id.localeCompare(b.id)))).digest('hex')
assert.equal(reviews.sourceSha256, sourceFingerprint, 'Source loglines changed since the saved analysis')

for (const review of reviews.records) {
  assert(!reviewedIds.has(review.id), `Duplicate review: ${review.id}`)
  reviewedIds.add(review.id)
  assert(byId.has(review.id), `Review references a missing deal: ${review.id}`)
  assert.equal(review.status, 'analysed')
  assert.equal(review.logline, byId.get(review.id).logline, `Changed source needs analysis: ${review.id}`)
  assert(['available', 'limited', 'unavailable'].includes(review.sourceStatus))
  assert.deepEqual(Object.keys(review.structure).sort(), ['goal', 'obstacle', 'protagonist', 'stakes'])
  for (const [field, excerpt] of Object.entries(review.structure)) {
    assert(excerpt === null || (typeof excerpt === 'string' && excerpt.trim().length > 0), `Invalid ${field}: ${review.id}`)
    if (excerpt !== null) assert(review.logline.includes(excerpt), `Unsupported ${field} excerpt: ${review.id}`)
  }
  if (review.sourceStatus !== 'available') assert(Object.values(review.structure).every(value => value === null), 'Limited/unavailable source cannot invent structure')
  assert.equal(new Set(review.patterns).size, review.patterns.length)
  for (const key of review.patterns) assert(keys.has(key), `Unknown pattern: ${key}`)
  if (review.logline !== byId.get(review.id).logline) {
    assert.equal(storyReviewFor(byId.get(review.id)), undefined, 'Stale review must be excluded')
  }
}
assert(deals.every(deal => reviewedIds.has(deal.id)), 'A source entry was skipped')
assert.equal(storyCoverage(deals).reviewed, deals.length)
assert.equal(storyCoverage(deals).missing, 0)
assert.equal(storyCoverage(deals).stale, 0)
assert.equal(storyCoverage(deals).tagged + storyCoverage(deals).withoutPattern, deals.length)

const fixture = [
  { ...deals[0], id: 'fixture-a', year: 2000, genre: 'Comedy', genreGroup: 'Comedy', logline: 'Family family family.' },
  { ...deals[0], id: 'fixture-b', year: 2000, genre: null, genreGroup: null, logline: 'Family finds home.' },
  { ...deals[0], id: 'fixture-c', year: 2010, genre: 'Thriller', genreGroup: 'Thriller', logline: 'Friends race to rescue the family.' },
  { ...deals[0], id: 'fixture-d', year: 2010, genre: 'Comedy', genreGroup: 'Comedy', logline: 'Friends travel.' }
]
const stats = analyzeDeals(fixture, 2000, 2010)
assert.equal(stats.words.find(row => row.key === 'family').count, 3, 'Count loglines, not word occurrences')
assert.equal(stats.genres.find(row => row.key === 'Comedy').share, 50, 'Include unknown genres in denominator')
assert.equal(stats.median, 3)
assert.equal(analyzeDeals([fixture[3], fixture[2]], 2000, 2010).median, 4, 'Average both middle values')
assert.equal(stats.lengths.reduce((sum, row) => sum + row.count, 0), fixture.length)
assert.equal(stats.years.reduce((sum, row) => sum + row.count, 0), fixture.length)
assert.equal(stats.years.find(row => row.key === '2001').count, 0)

const equalShares = comparePeriods([fixture[0], fixture[1]], [fixture[2], fixture[3]], 'genre')
assert.equal(equalShares.find(row => row.key === 'Comedy').delta, 0)
assert.equal(equalShares.find(row => row.key === 'Thriller').delta, 50)
assert(comparePeriods([], [fixture[0]], 'genre').every(row => row.delta === null), 'Missing period is not 0%')
const empty = analyzeDeals([], 1991, 2025)
assert.equal(empty.median, null)
assert.equal(empty.average, null)
assert.equal(empty.words.length, 0)
assert(empty.lengths.every(row => row.count === 0 && row.share === 0))

const reviewed = reviews.records.find(review => review.patterns.length && byId.get(review.id).logline === review.logline)
assert(reviewed, 'Need at least one current tagged source')
const changed = { ...byId.get(reviewed.id), logline: `${reviewed.logline} Changed.` }
assert.equal(storyReviewFor(changed), undefined)
assert.deepEqual(patternsFor(changed), [])
assert.equal(storyCoverage([changed]).stale, 1)

for (const subset of [deals, deals.filter(deal => deal.year >= 2020), deals.filter(deal => deal.genre === 'Comedy')]) {
  const allowed = new Set(subset.map(deal => deal.id))
  const summary = analyzeDeals(subset, 1991, 2025)
  const rows = [...summary.years, ...summary.genres, ...summary.words, ...summary.lengths, ...patternRows(subset), ...rankField(subset, 'studio')]
  for (const row of rows) {
    assert.equal(row.count, row.ids.length, 'Drilldown and chart count must agree')
    assert.equal(new Set(row.ids).size, row.count)
    assert(row.ids.every(id => allowed.has(id)), 'Drilldown leaked outside filters')
    assert(row.share >= 0 && row.share <= 100)
  }
  assert.equal(summary.years.reduce((sum, row) => sum + row.count, 0), subset.length)
  assert.equal(summary.lengths.reduce((sum, row) => sum + row.count, 0), subset.length)
}
const unchanged = { ...byId.get(reviewed.id), title: 'A changed title only' }
assert(storyReviewFor(unchanged), 'Unchanged loglines must reuse saved analysis')
const unknown = { ...byId.get(reviewed.id), id: 'new-unanalysed-entry' }
assert.equal(storyReviewFor(unknown), undefined)
assert.equal(storyCoverage([unknown]).missing, 1)
console.log(`Analysis checks passed: ${deals.length}/${deals.length} current saved analyses; source excerpts, counts, percentages, drilldowns, periods, empty data and stale-tag handling verified.`)
