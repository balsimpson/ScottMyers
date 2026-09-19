#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const dataPath = path.resolve(process.argv[2] ?? 'data/deals.json')
const sourceClaimedCount = 2560
const expectedExtractedCount = 2562
const requiredFields = ['id', 'entryNumber', 'year', 'logline', 'sourcePage']

let deals

try {
  deals = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
} catch (error) {
  throw new Error(`Could not parse ${dataPath}: ${error.message}`, { cause: error })
}

if (!Array.isArray(deals)) {
  throw new Error('The dataset root must be an array')
}

if (deals.length !== expectedExtractedCount) {
  throw new Error(`Expected ${expectedExtractedCount} extracted records, found ${deals.length}`)
}

const ids = new Set()
const missingFields = []
const invalidYears = []

deals.forEach((deal) => {
  if (ids.has(deal.id)) throw new Error(`Duplicate id: ${deal.id}`)
  ids.add(deal.id)

  requiredFields.forEach((field) => {
    if (deal[field] === null || deal[field] === undefined || deal[field] === '') {
      missingFields.push(`${deal.id}:${field}`)
    }
  })

  if (!Number.isInteger(deal.year) || deal.year < 1991 || deal.year > 2025) {
    invalidYears.push(`${deal.id}:${deal.year}`)
  }
})

if (missingFields.length) {
  throw new Error(`Missing required fields: ${missingFields.slice(0, 10).join(', ')}`)
}

if (invalidYears.length) {
  throw new Error(`Invalid years: ${invalidYears.slice(0, 10).join(', ')}`)
}

const fieldCoverage = Object.fromEntries(
  ['title', 'logline', 'writers', 'genre', 'agency', 'management', 'lawyer', 'studio', 'productionCompany', 'producer', 'date', 'notes', 'dealAmount', 'sourceNote', 'sourcePage']
    .map(field => [field, deals.filter(deal => deal[field] !== null && deal[field] !== '').length])
)

const knownDealChecks = [
  ['Ocean Boulevard', deal => deal?.logline?.startsWith('Actress takes on the mental')],
  ['Face/Off', deal => deal?.writers?.includes('Mike Werb')],
  ['The Operator', deal => deal?.year === 2025 && deal?.studio === 'Netflix']
]

knownDealChecks.forEach(([label, check]) => {
  const deal = deals.find(item => item.title === label)
  if (!check(deal)) throw new Error(`Known deal check failed: ${label}`)
})

console.log(JSON.stringify({
  validJson: true,
  extractedRecords: deals.length,
  sourceClaimedCount,
  countDifference: deals.length - sourceClaimedCount,
  uniqueIds: ids.size,
  fieldCoverage,
  knownDealChecks: knownDealChecks.map(([label]) => label)
}, null, 2))
