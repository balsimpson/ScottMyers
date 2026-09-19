import fs from 'node:fs'

const deals = JSON.parse(fs.readFileSync(new URL('../data/deals.json', import.meta.url), 'utf8'))
const saved = JSON.parse(fs.readFileSync(new URL('../data/story-reviews.json', import.meta.url), 'utf8'))
const records = new Map(saved.records.map(record => [record.id, record]))
const sourceIds = new Set(deals.map(deal => deal.id))
const pending = deals.flatMap((deal) => {
  const record = records.get(deal.id)
  if (record?.logline === deal.logline && record.structure && record.status === 'analysed') return []
  return [{ id: deal.id, title: deal.title, logline: deal.logline, reason: !record ? 'new' : record.logline !== deal.logline ? 'changed' : 'incomplete' }]
})
console.log(JSON.stringify({
  total: deals.length,
  savedAndCurrent: deals.length - pending.length,
  pending,
  orphanedIds: saved.records.filter(record => !sourceIds.has(record.id)).map(record => record.id)
}, null, 2))
