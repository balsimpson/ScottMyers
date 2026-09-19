import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const deals = JSON.parse(fs.readFileSync(new URL('../data/deals.json', import.meta.url), 'utf8'))
const current = JSON.parse(fs.readFileSync(new URL('../data/story-reviews.json', import.meta.url), 'utf8'))
const progressPath = path.resolve(new URL('../.cache/story-reviews-ai-progress.json', import.meta.url).pathname)
const apiKey = process.env.OPENAI_API_KEY
const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const batchSize = Number.parseInt(process.env.ANALYSIS_AI_BATCH_SIZE ?? '20', 10)
const maxBatches = process.env.ANALYSIS_AI_MAX_BATCHES ? Number.parseInt(process.env.ANALYSIS_AI_MAX_BATCHES, 10) : Infinity

if (!apiKey) {
  throw new Error('Set OPENAI_API_KEY in the shell before running npm run analysis:enrich:ai.')
}
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
  throw new Error('ANALYSIS_AI_BATCH_SIZE must be an integer from 1 to 50.')
}

const patternKeys = new Set(['rescue', 'survival', 'revenge', 'heist', 'identity', 'second', 'time', 'forbidden'])
const dealById = new Map(deals.map(deal => [deal.id, deal]))
const currentById = new Map(current.records.map(record => [record.id, record]))
const sourceSha256 = createHash('sha256')
  .update(JSON.stringify(deals.map(({ id, logline }) => ({ id, logline })).sort((a, b) => a.id.localeCompare(b.id))))
  .digest('hex')

function readProgress() {
  if (!fs.existsSync(progressPath)) return { sourceSha256, records: {} }
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'))
  if (progress.sourceSha256 !== sourceSha256) {
    throw new Error('The source deals changed since the checkpoint. Delete .cache/story-reviews-ai-progress.json and restart.')
  }
  return progress
}

function writeProgress(progress) {
  fs.mkdirSync(path.dirname(progressPath), { recursive: true })
  fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`)
}

function excerpt(value, deal) {
  if (value === null) return null
  if (typeof value !== 'string' || !value.trim() || !deal.logline.includes(value)) {
    throw new Error(`${deal.id}: AI returned a non-source ${value === null ? 'null' : 'excerpt'}.`)
  }
  return value
}

function validateRecord(value, batchIds) {
  if (!value || typeof value !== 'object' || !batchIds.has(value.id)) throw new Error('AI returned an unknown or missing record id.')
  const deal = dealById.get(value.id)
  const structure = value.structure
  if (!structure || typeof structure !== 'object') throw new Error(`${value.id}: missing structure.`)
  const allowedFields = ['protagonist', 'goal', 'obstacle', 'stakes']
  for (const field of allowedFields) excerpt(structure[field] ?? null, deal)
  if (!Array.isArray(value.patterns) || value.patterns.some(pattern => !patternKeys.has(pattern))) {
    throw new Error(`${value.id}: invalid pattern list.`)
  }
  return {
    id: value.id,
    patterns: [...new Set(value.patterns)],
    structure: Object.fromEntries(allowedFields.map(field => [field, excerpt(structure[field] ?? null, deal)]))
  }
}

function promptFor(batch) {
  return [
    'Enrich these source loglines for a screenplay-deal archive.',
    'Return JSON only in this exact shape: {"records":[{"id":"...","patterns":[],"structure":{"protagonist":null,"goal":null,"obstacle":null,"stakes":null}}]}.',
    'For every record, include only the eight allowed pattern keys: rescue, survival, revenge, heist, identity, second, time, forbidden.',
    'Assign a pattern only when the logline explicitly supports it. Do not infer a tag from a vague mood, genre, keyword, or a familiar movie premise.',
    'Every non-null structure value must be copied exactly from that record logline, including punctuation. Use null when the logline does not state it.',
    'Protagonist is the central person or group. Goal is what they are trying to do. Obstacle is the opposing force or problem. Stakes are what can be lost or the danger described.',
    'Do not use outside knowledge, titles, genres, or assumptions. Return exactly one result for each input id.',
    JSON.stringify(batch)
  ].join('\n\n')
}

async function requestBatch(batch) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a careful archive annotator. Source fidelity is more important than filling every field.' },
        { role: 'user', content: promptFor(batch) }
      ]
    })
  })
  if (!response.ok) throw new Error(`AI request failed (${response.status}): ${await response.text()}`)
  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('AI response did not contain message content.')
  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed.records) || parsed.records.length !== batch.length) throw new Error('AI response did not contain exactly one record per input.')
  const batchIds = new Set(batch.map(deal => deal.id))
  return parsed.records.map(record => validateRecord(record, batchIds))
}

function mergeRecord(deal, aiRecord) {
  const previous = currentById.get(deal.id)
  const structure = aiRecord?.structure ?? previous?.structure ?? { protagonist: null, goal: null, obstacle: null, stakes: null }
  return {
    id: deal.id,
    logline: deal.logline,
    status: 'analysed',
    patterns: [...new Set([...(previous?.patterns ?? []), ...(aiRecord?.patterns ?? [])])],
    structure,
    sourceStatus: previous?.sourceStatus ?? 'available'
  }
}

const progress = readProgress()
const pending = deals.filter(deal => currentById.get(deal.id)?.sourceStatus === 'available' && !progress.records[deal.id])
let processedBatches = 0

for (let index = 0; index < pending.length && processedBatches < maxBatches; index += batchSize) {
  const batch = pending.slice(index, index + batchSize)
  const results = await requestBatch(batch)
  for (const result of results) progress.records[result.id] = result
  writeProgress(progress)
  processedBatches += 1
  console.log(`Processed ${Math.min(index + batch.length, pending.length)}/${pending.length} available entries.`)
}

const remaining = deals.filter(deal => currentById.get(deal.id)?.sourceStatus === 'available' && !progress.records[deal.id])
if (remaining.length) {
  console.log(`Checkpoint saved. ${remaining.length} available entries remain. Rerun the same command to continue.`)
  process.exit(0)
}

const records = deals.map(deal => mergeRecord(deal, progress.records[deal.id]))
const output = {
  version: 4,
  reviewedAt: new Date().toISOString().slice(0, 10),
  reviewer: 'AI batch enrichment',
  method: 'AI-assisted batch enrichment from source loglines. Every non-null structure value is a literal source excerpt and every tag is checked against the eight curated patterns. Limited or unavailable descriptions remain unfilled.',
  sourceCount: deals.length,
  sourceSha256,
  records
}
fs.writeFileSync(new URL('../data/story-reviews.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ total: records.length, tagged: records.filter(record => record.patterns.length).length, tagAssignments: records.reduce((total, record) => total + record.patterns.length, 0) }, null, 2))
