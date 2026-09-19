#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)

function readArg(name) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const inputPath = readArg('--input')
const outputPath = readArg('--output')

if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/extract-deals.mjs --input <pdf> --output <json>')
  process.exit(1)
}

if (!fs.existsSync(inputPath)) {
  console.error(`Input PDF does not exist: ${inputPath}`)
  process.exit(1)
}

const inputLiteral = JSON.stringify(path.resolve(inputPath))
const jxaSource = `
  ObjC.import('Foundation');
  ObjC.import('PDFKit');

  const filePath = ${inputLiteral};
  const document = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(filePath));
  if (!document) {
    throw new Error('PDFKit could not open the input PDF');
  }

  const pages = [];
  for (let index = 0; index < document.pageCount; index += 1) {
    const raw = document.pageAtIndex(index).string;
    pages.push(raw ? $(raw).js : '');
  }

  console.log(JSON.stringify(pages));
`

const extraction = spawnSync('/usr/bin/osascript', ['-l', 'JavaScript', '-'], {
  input: jxaSource,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 256
})

const outputLines = `${extraction.stderr ?? ''}\n${extraction.stdout ?? ''}`.split(/\r?\n/)
const extractedText = outputLines.find(line => line.trimStart().startsWith('['))

if (!extractedText) {
  console.error(extraction.stderr || 'PDF text extraction failed')
  process.exit(extraction.status || 1)
}

let pages

try {
  pages = JSON.parse(extractedText)
} catch (error) {
  console.error('PDFKit returned invalid JSON:', error.message)
  process.exit(1)
}

function cleanPage(text) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/©\s*2026\s*Scott\s*Myers/gi, '')
    .split('\n')
    .filter(line => !/^\s*\d+\s*$/.test(line))
    .join('\n')
}

function normalizeText(value) {
  return value
    .replace(/\u00ad/g, '')
    .replace(/-\s*\n\s*/g, '-')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const cleanedPages = pages.map(cleanPage)
const pageRanges = []
let combined = ''

cleanedPages.forEach((page, index) => {
  const start = combined.length
  combined += `${page}\n`
  pageRanges.push({ start, end: combined.length, page: index + 1 })
})

function pageAtOffset(offset) {
  return pageRanges.find(range => offset >= range.start && offset < range.end)?.page ?? null
}

const yearHeader = /Spec Script Deals\s*:?\s*((?:19|20)\d{2})(?![-\d])/gi
const sections = []
let headerMatch

while ((headerMatch = yearHeader.exec(combined))) {
  const year = Number(headerMatch[1])
  if (year < 1991 || year > 2025) continue

  sections.push({
    year,
    start: headerMatch.index,
    headerEnd: yearHeader.lastIndex
  })
}

if (sections.length !== 35) {
  throw new Error(`Expected 35 yearly sections, found ${sections.length}`)
}

function trimAtAnalysis(text, year) {
  const analysisMarker = new RegExp(`\\b${year}\\s+Spec Script Deals Analysis|\\b${year}\\s+SPEC SCRIPT DEALS:`, 'i')
  const match = analysisMarker.exec(text)
  return match ? text.slice(0, match.index) : text
}

function parseFields(entryText) {
  const fieldPattern = /\b(Production Company|Production Co\.?|Prod\.?\s*Co\.?|Writers?|Logline|Title|Genre|Gen|Agency|Management|Manager|Lawyer|Studio|Date|Notes|Producer)(?=\s*:|\s)\s*:?\s*/g
  const matches = [...entryText.matchAll(fieldPattern)]
  const fields = {}

  matches.forEach((match, index) => {
    const label = match[1]
    const valueStart = match.index + match[0].length
    const valueEnd = matches[index + 1]?.index ?? entryText.length
    const value = normalizeText(entryText.slice(valueStart, valueEnd))

    const key = {
      'Production Company': 'productionCompany',
      'Production Co.': 'productionCompany',
      'Production Co': 'productionCompany',
      'Prod. Co': 'productionCompany',
      'Prod Co': 'productionCompany',
      'Gen': 'genre',
      'Manager': 'management',
      'Writer': 'writers',
      'Writers': 'writers'
    }[label] ?? label.toLowerCase()

    if (value && fields[key] === undefined) fields[key] = value
  })

  return fields
}

const deals = []
const skippedEntries = []
const extractedDealCount = 2562
const sourceRepairs = {
  '1995-45': {
    title: null,
    sourceNote: 'The source entry leaves the title blank after the Title label.'
  },
  '2009-41': {
    title: 'Vatican Tapes',
    logline: 'The story centers on a series of events that unfold after a tape gets leaked from the Vatican displaying an exorcism that goes wrong.',
    sourceNote: 'The source omits the Logline label; the title and logline were split at the next field boundary.'
  },
  '2014-38': {
    title: 'Berliner',
    logline: 'As the Berlin Wall is being constructed at the height of the Cold War, a veteran CIA agent searches for a Soviet mole who has already killed several fellow agents, including a young agent he’s mentored.',
    sourceNote: 'The source omits the Logline label; the title and logline were split at the next field boundary.'
  },
  '2011-32': {
    title: 'Ness/Capone',
    sourceNote: 'The source entry omits the Title label.'
  }
}

sections.forEach((section, sectionIndex) => {
  const nextSectionStart = sections[sectionIndex + 1]?.start ?? combined.length
  const sectionText = trimAtAnalysis(
    combined.slice(section.headerEnd, nextSectionStart),
    section.year
  )
  const entryPattern = /(?:^|\n)\s*(\d+)\s*[.:]\s*(?=(?:Title\b|Logline\b|[A-Z][^\n]{0,120}\s+Logline\b))/g
  const entryMatches = [...sectionText.matchAll(entryPattern)]

  entryMatches.forEach((entryMatch, entryIndex) => {
    const entryStart = entryMatch.index + entryMatch[0].search(/\d/)
    const entryEnd = entryMatches[entryIndex + 1]?.index ?? sectionText.length
    const entryText = sectionText.slice(entryStart, entryEnd)
    const fields = parseFields(entryText)
    const entryNumber = Number(entryMatch[1] ?? entryIndex + 1)
    const repair = sourceRepairs[`${section.year}-${entryNumber}`]

    if (repair) Object.assign(fields, repair)

    if (!fields.logline) {
      skippedEntries.push({
        year: section.year,
        entry: entryText.slice(0, 260),
        fields
      })
      return
    }

    const record = {
      id: `${section.year}-${String(entryNumber).padStart(2, '0')}-${slugify(fields.title || 'untitled-entry')}`,
      entryNumber,
      year: section.year,
      title: fields.title ?? null,
      logline: fields.logline,
      writers: fields.writers ?? null,
      genre: fields.genre ?? null,
      agency: fields.agency ?? null,
      management: fields.management ?? null,
      lawyer: fields.lawyer ?? null,
      studio: fields.studio ?? null,
      productionCompany: fields.productionCompany ?? null,
      producer: fields.producer ?? null,
      date: fields.date ?? null,
      notes: fields.notes ?? null,
      dealAmount: fields.notes?.match(/\$\s*[\d.,]+\s*[KMB]?(?:\s*\/\s*\$?\s*[\d.,]+\s*[KMB]?)?/i)?.[0]?.replace(/\s+/g, '') ?? null,
      sourceNote: fields.sourceNote ?? null,
      sourcePage: pageAtOffset(section.headerEnd + entryStart)
    }

    record.searchText = normalizeText([
      record.title,
      record.logline,
      record.writers,
      record.genre,
      record.agency,
      record.management,
      record.lawyer,
      record.studio,
      record.productionCompany,
      record.date,
      record.notes
    ].filter(Boolean).join(' ')).toLocaleLowerCase()

    deals.push(record)
  })
})

const requiredFields = ['logline', 'year', 'entryNumber', 'sourcePage']
const missingRequired = deals.flatMap(deal => requiredFields
  .filter(field => deal[field] === null || deal[field] === undefined || deal[field] === '')
  .map(field => `${deal.id}:${field}`))

if (missingRequired.length) {
  throw new Error(`Missing required fields: ${missingRequired.slice(0, 10).join(', ')}`)
}

if (skippedEntries.length) {
  throw new Error(`Skipped entries without loglines: ${JSON.stringify(skippedEntries.slice(0, 5))}`)
}

if (deals.length !== extractedDealCount) {
  const counts = Object.fromEntries(
    [...new Set(sections.map(section => section.year))]
      .map(year => [year, deals.filter(deal => deal.year === year).length])
  )
  throw new Error(`Expected ${extractedDealCount} enumerated deals, found ${deals.length}. Year counts: ${JSON.stringify(counts)}`)
}

const ids = new Set()
const duplicateIds = deals.filter(deal => ids.has(deal.id)).map(deal => deal.id)
deals.forEach(deal => ids.add(deal.id))

if (duplicateIds.length) {
  throw new Error(`Duplicate deal ids: ${duplicateIds.slice(0, 10).join(', ')}`)
}

const absoluteOutput = path.resolve(outputPath)
fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true })
fs.writeFileSync(absoluteOutput, `${JSON.stringify(deals, null, 2)}\n`)

console.log(`Extracted ${deals.length} deals from ${pages.length} PDF pages`)
console.log(`Wrote ${absoluteOutput}`)
