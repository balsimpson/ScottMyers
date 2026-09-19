import fs from 'node:fs/promises'
import path from 'node:path'

import type { Deal, SourceDealField } from '~/data/deals'

export type EditableDeal = Pick<Deal, SourceDealField>

const dealsPath = path.resolve(process.cwd(), 'data/deals.json')

export async function readDeals() {
  return JSON.parse(await fs.readFile(dealsPath, 'utf8')) as Deal[]
}

export async function writeDeals(deals: Deal[]) {
  await fs.writeFile(dealsPath, `${JSON.stringify(deals, null, 2)}\n`, 'utf8')
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

function dealAmountFromNotes(notes: string | null) {
  return notes?.match(/\$\s*[\d.,]+\s*[KMB]?(?:\s*\/\s*\$?\s*[\d.,]+\s*[KMB]?)?/i)?.[0]?.replace(/\s+/g, '') ?? null
}

function searchTextForDeal(deal: EditableDeal) {
  return normalizeSearch([
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

function nullableString(value: unknown) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

function requiredInteger(value: unknown, field: string) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed)) {
    throw createError({ statusCode: 400, statusMessage: `${field} must be a whole number.` })
  }
  return parsed
}

export function normalizeEditableDeal(body: Record<string, unknown>) {
  const logline = String(body.logline ?? '').trim()
  if (!logline) {
    throw createError({ statusCode: 400, statusMessage: 'Logline is required.' })
  }

  const deal: EditableDeal = {
    entryNumber: requiredInteger(body.entryNumber, 'Entry number'),
    year: requiredInteger(body.year, 'Year'),
    title: nullableString(body.title),
    logline,
    writers: nullableString(body.writers),
    genre: nullableString(body.genre),
    agency: nullableString(body.agency),
    management: nullableString(body.management),
    lawyer: nullableString(body.lawyer),
    studio: nullableString(body.studio),
    productionCompany: nullableString(body.productionCompany),
    producer: nullableString(body.producer),
    date: nullableString(body.date),
    notes: nullableString(body.notes),
    sourcePage: requiredInteger(body.sourcePage, 'Source page')
  }

  return {
    ...deal,
    dealAmount: dealAmountFromNotes(deal.notes),
    searchText: searchTextForDeal(deal)
  }
}
