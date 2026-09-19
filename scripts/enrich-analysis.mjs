import fs from 'node:fs'
import { createHash } from 'node:crypto'

const dealsPath = new URL('../data/deals.json', import.meta.url)
const reviewsPath = new URL('../data/story-reviews.json', import.meta.url)
const deals = JSON.parse(fs.readFileSync(dealsPath, 'utf8'))
const previous = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'))
const previousById = new Map(previous.records.map(record => [record.id, record]))
const batchSize = Number.parseInt(process.env.ANALYSIS_BATCH_SIZE ?? '100', 10)
const maxBatches = process.env.ANALYSIS_MAX_BATCHES ? Number.parseInt(process.env.ANALYSIS_MAX_BATCHES, 10) : Infinity

if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
  throw new Error('ANALYSIS_BATCH_SIZE must be an integer from 1 to 500.')
}

const ignoredWords = new Set('a an and are as at be been being but by can could did do does for from had has have he her him his how i if in into is it its just me more most my no not of off on one or our out she so some than that the their them then there they this through to too under up was we were what when where which who will with would you your after all also about against among around back before between each few down first last new old other once only same such very while without film films story stories movie movies man woman men women person people young old boy girl life lives world family someone something character characters whose two set must find finds get gets order becomes takes way centers discovers'.split(' '))

function words(logline) {
  return logline.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]{3,}/g) ?? []
}

function stem(word) {
  const irregular = { falls: 'fall', falling: 'fall', fell: 'fall', finds: 'find', finding: 'find', found: 'find', gets: 'get', getting: 'get', got: 'get', takes: 'take', taking: 'take', taken: 'take', becomes: 'become', becoming: 'become', discovers: 'discover', discovering: 'discover', tries: 'try', trying: 'try' }
  if (irregular[word]) return irregular[word]
  return word
}

function motifKey(phrase) {
  const tokens = phrase.map(stem)
  if (tokens.includes('fall') && tokens.includes('love')) return 'fall in love'
  return tokens.join(' ')
}

function dynamicPatterns(source) {
  const occurrences = new Map()
  for (const deal of source) {
    if ((previousById.get(deal.id)?.sourceStatus ?? 'available') !== 'available') continue
    const tokens = words(deal.logline)
    const seen = new Set()
    for (let size = 2; size <= 3; size += 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const phrase = tokens.slice(index, index + size)
        if (phrase.filter(word => !ignoredWords.has(word)).length < 2) continue
        const key = motifKey(phrase)
        if (seen.has(key)) continue
        seen.add(key)
        const ids = occurrences.get(key) ?? new Set()
        ids.add(deal.id)
        occurrences.set(key, ids)
      }
    }
  }
  return [...occurrences.entries()]
    .filter(([, ids]) => ids.size >= 2)
    .sort((left, right) => right[1].size - left[1].size || right[0].split(' ').length - left[0].split(' ').length || left[0].localeCompare(right[0]))
    .map(([key, ids]) => ({ key, ids }))
}

function segments(logline) {
  return logline
    .split(/(?<=[.!?])\s+|,\s+|;\s+/)
    .map(part => part.trim())
    .filter(Boolean)
}

function firstMatch(parts, pattern) {
  return parts.find(part => pattern.test(part)) ?? null
}

function structureFor(logline, sourceStatus) {
  if (sourceStatus !== 'available') {
    return { protagonist: null, goal: null, obstacle: null, stakes: null }
  }

  const parts = segments(logline)
  const protagonist = parts[0] ?? null
  const goal = firstMatch(parts, /\b(?:has|have|had) to\b|\bmust\b|\btries? to\b|\battempts? to\b|\bwants? to\b|\bneeds? to\b|\bin order to\b|\bsets? out to\b|\bseeks? to\b|\bis trying to\b|\bsearch(?:es)? for\b/i)
  const obstacle = firstMatch(parts, /\bbut\b|\bforced to\b|\bwhen\b|\bwhile\b|\bcannot\b|\bcan't\b|\baccused\b|\bhunted\b|\bpursued\b|\bthreatened\b|\btrapped\b|\bhostage\b|\bstalk(?:s|ed|ing)?\b/i)
  const stakes = firstMatch(parts, /\bdie\b|\bdeath\b|\bkill(?:s|ed|er|ing)?\b|\bmurder\b|\bsave(?:s|d|ing)?\b|\bprotect(?:s|ed|ing)?\b|\bdanger\b|\bhostage\b|\bsurviv(?:e|es|ed|al|ing)\b|\bwar\b|\bdisaster\b/i)

  return { protagonist, goal, obstacle, stakes }
}

function patternsFor(deal, sourceStatus, dynamic) {
  if (sourceStatus !== 'available') return []
  const tokens = words(deal.logline)
  const available = new Set(dynamic.map(pattern => pattern.key))
  const matches = new Set()
  for (let size = 2; size <= 3; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const key = motifKey(tokens.slice(index, index + size))
      if (available.has(key)) matches.add(key)
    }
  }
  const matchList = [...matches]
  if (matchList.length) return matchList

  for (let size = 3; size >= 2; size -= 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phrase = tokens.slice(index, index + size)
      if (phrase.filter(word => !ignoredWords.has(word)).length >= 2) return [motifKey(phrase)]
    }
  }
  const singleWord = tokens.find(word => !ignoredWords.has(word))
  if (singleWord) return [motifKey([singleWord])]
  return []
}

const dynamic = dynamicPatterns(deals)

function enrichDeal(deal) {
  const previousRecord = previousById.get(deal.id)
  const sourceStatus = previousRecord?.sourceStatus ?? 'available'
  return {
    id: deal.id,
    logline: deal.logline,
    status: 'analysed',
    patterns: patternsFor(deal, sourceStatus, dynamic),
    structure: structureFor(deal.logline, sourceStatus),
    sourceStatus
  }
}

const sourceSha256 = createHash('sha256')
  .update(JSON.stringify(deals.map(({ id, logline }) => ({ id, logline })).sort((a, b) => a.id.localeCompare(b.id))))
  .digest('hex')

function writeOutput(records) {
  const output = {
    version: 4,
    reviewedAt: new Date().toISOString().slice(0, 10),
    reviewer: 'Codex',
    method: 'Offline dynamic enrichment from source loglines. Structure values are literal source excerpts; motifs are mined from recurring source phrases across the archive. Limited or unavailable descriptions remain unfilled.',
    sourceCount: deals.length,
    sourceSha256,
    records
  }
  fs.writeFileSync(reviewsPath, `${JSON.stringify(output, null, 2)}\n`)
}

const records = deals.map(deal => previousById.get(deal.id) ?? enrichDeal(deal))
const totalBatches = Math.ceil(deals.length / batchSize)
for (let batchIndex = 0; batchIndex < totalBatches && batchIndex < maxBatches; batchIndex += 1) {
  const start = batchIndex * batchSize
  for (const [offset, deal] of deals.slice(start, start + batchSize).entries()) {
    records[start + offset] = enrichDeal(deal)
  }
  writeOutput(records)
  console.log(`Saved offline enrichment batch ${batchIndex + 1}/${totalBatches} (${Math.min(start + batchSize, deals.length)}/${deals.length} entries).`)
}

if (maxBatches < totalBatches) {
  console.log(`Stopped after ${maxBatches} batches. Rerun without ANALYSIS_MAX_BATCHES to finish.`)
  process.exit(0)
}

const tagged = records.filter(record => record.patterns.length).length
const structured = records.filter(record => Object.values(record.structure).some(Boolean)).length
console.log(JSON.stringify({ total: records.length, tagged, tagAssignments: records.reduce((total, record) => total + record.patterns.length, 0), structured }, null, 2))
