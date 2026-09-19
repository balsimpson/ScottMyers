#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const dataPath = path.resolve(process.argv[2] ?? 'data/deals.json')
const deals = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

const contaminatedFields = ['genre', 'agency', 'management', 'studio']
const embeddedFieldPattern = /\b(Production Company|Production Co\.?|Manager|Lawyer)\s*:\s*/gi

function normalizeSearch(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

function mergeValue(current, incoming) {
  if (!incoming) return current ?? null
  if (!current) return incoming
  if (current === incoming) return current
  return `${current}; ${incoming}`
}

function extractEmbeddedFields(deal) {
  let repaired = false

  for (const field of contaminatedFields) {
    const value = String(deal[field] ?? '')
    const matches = [...value.matchAll(embeddedFieldPattern)]
    if (!matches.length) continue

    const firstMatch = matches[0]
    const prefix = value.slice(0, firstMatch.index).trim()
    deal[field] = prefix || null

    matches.forEach((match, index) => {
      const label = match[1].toLocaleLowerCase().replace(/\.$/, '')
      const valueStart = (match.index ?? 0) + match[0].length
      const valueEnd = matches[index + 1]?.index ?? value.length
      const extractedValue = value.slice(valueStart, valueEnd).trim()

      if (label === 'manager') {
        deal.management = mergeValue(deal.management, extractedValue)
      } else if (label === 'lawyer') {
        deal.lawyer = mergeValue(deal.lawyer, extractedValue)
      } else {
        deal.productionCompany = mergeValue(deal.productionCompany, extractedValue)
      }
    })

    repaired = true
  }

  return repaired
}

let repairedRecords = 0

for (const deal of deals) {
  if (extractEmbeddedFields(deal)) repairedRecords += 1
  if (deal.lawyer === undefined) deal.lawyer = null

  deal.searchText = normalizeSearch([
    deal.title,
    deal.logline,
    deal.writers,
    deal.genre,
    deal.agency,
    deal.management,
    deal.lawyer,
    deal.studio,
    deal.productionCompany,
    deal.date,
    deal.notes
  ].filter(Boolean).join(' '))
}

fs.writeFileSync(dataPath, `${JSON.stringify(deals, null, 2)}\n`)

console.log(JSON.stringify({
  dataPath,
  records: deals.length,
  repairedRecords
}, null, 2))
