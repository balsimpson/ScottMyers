import fs from 'node:fs'

const dealsPath = new URL('../data/deals.json', import.meta.url)
const deals = JSON.parse(fs.readFileSync(dealsPath, 'utf8'))

const groups = [
  ['Sci-Fi', /science[- ]fiction|sci[- ]fi/i],
  ['Fantasy', /fantasy|fairy tale/i],
  ['Horror', /horror/i],
  ['Thriller', /thriller|suspense/i],
  ['Mystery', /mystery/i],
  ['Crime', /crime|heist|gangster|mob/i],
  ['Action', /action/i],
  ['Adventure', /adventure/i],
  ['Comedy', /comedy|satire/i],
  ['Drama', /drama/i],
  ['Romance', /romance|romantic|rom-com/i],
  ['Family', /family/i],
  ['Western', /western/i],
  ['War', /war|military/i],
  ['Sports', /sports?/i],
  ['Biography', /biopic|biography|\bbio\b/i],
  ['Political', /political/i],
  ['Psychological', /psychological/i],
  ['Supernatural', /supernatural/i],
  ['Legal', /legal/i],
  ['Teen', /teen/i],
  ['Historical', /historical/i],
  ['Musical', /musical/i],
  ['Erotic', /erotic/i],
  ['Religious', /religious/i],
  ['Documentary', /documentary/i]
]

function genreGroup(genre) {
  if (!genre || genre === 'N/A') return null
  return groups.find(([, pattern]) => pattern.test(genre))?.[0] ?? 'Other'
}

const enriched = deals.map(deal => ({ ...deal, genreGroup: genreGroup(deal.genre) }))
fs.writeFileSync(dealsPath, `${JSON.stringify(enriched, null, 2)}\n`)

const counts = {}
for (const deal of enriched) counts[deal.genreGroup] = (counts[deal.genreGroup] ?? 0) + 1
console.log(JSON.stringify({ sourceLabels: new Set(deals.map(deal => deal.genre).filter(Boolean)).size, genreGroups: Object.keys(counts).filter(Boolean).length, counts }, null, 2))
