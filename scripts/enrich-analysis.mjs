import fs from 'node:fs'
import { createHash } from 'node:crypto'

const dealsPath = new URL('../data/deals.json', import.meta.url)
const reviewsPath = new URL('../data/story-reviews.json', import.meta.url)
const deals = JSON.parse(fs.readFileSync(dealsPath, 'utf8'))
const previous = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'))
const taxonomy = JSON.parse(fs.readFileSync(new URL('../data/story-patterns.json', import.meta.url), 'utf8'))
const previousById = new Map(previous.records.map(record => [record.id, record]))
const batchSize = Number.parseInt(process.env.ANALYSIS_BATCH_SIZE ?? '100', 10)
const maxBatches = process.env.ANALYSIS_MAX_BATCHES ? Number.parseInt(process.env.ANALYSIS_MAX_BATCHES, 10) : Infinity

if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
  throw new Error('ANALYSIS_BATCH_SIZE must be an integer from 1 to 500.')
}

const cueRules = {
  'coming-of-age': text => /\b(?:coming[- ]of[- ]age|teen(?:age|aged)?|adolescent|high[- ]school|young (?:boy|girl)|(?:twelve|thirteen|fourteen|fifteen|sixteen|seventeen)-year-old)\b/i.test(text),
  'identity-disguise': text => /\b(?:disguis(?:e|ed|es|ing)|masquerad(?:e|es|ed|ing)|impersonat(?:e|es|ed|ing)|pretends? to be|poses? as|assumes? (?:a|the) identity|body[- ]swap|switches? bodies|takes on the (?:identity|qualities))\b/i.test(text),
  'fish-out-of-water': text => /\b(?:fish out of water|culture shock|stranger in|newcomer to|new to|transplanted|moves? to|arrives? in)\b/i.test(text) || /\b(?:small[- ]town|country|rural)\b[\s\S]{0,80}\b(?:big city|city|urban)\b/i.test(text) || /\b(?:big city|city|urban)\b[\s\S]{0,80}\b(?:small[- ]town|country|rural)\b/i.test(text),
  'unlikely-partnership': text => /\b(?:team(?:s|ed)? up|join(?:s|ed)? forces|forced to work together|reluctant allies|unlikely (?:pair|duo|partners?)|paired with|partners? with|takes up with|must work together)\b/i.test(text),
  'family-reconciliation': text => /\b(?:estranged|reunite(?:s|d)? with (?:his|her|their|the) (?:family|mother|father|parent|son|daughter|child)|reconnect(?:s|ed)? with|reconcile(?:s|d)? with|repair(?:s|ed)? (?:the|their) (?:relationship|marriage|family)|return(?:s|ed)? home to (?:his|her|their) (?:family|mother|father|parents?))\b/i.test(text),
  'forbidden-romance': text => /\b(?:forbidden love|forbidden romance|cannot be together|can't be together|famil(?:y|ies) (?:opposes?|oppose|forbids?)|against (?:his|her|their) (?:family|religion|faith|class)|love across|star[- ]crossed|socially unacceptable romance)\b/i.test(text),
  'love-triangle': text => /\b(?:love triangle|romantic triangle|two (?:men|women|people) (?:compete|vie) for|torn between (?:two|two different)|chooses between (?:two|two different))\b/i.test(text),
  'revenge-quest': text => /\b(?:revenge|avenge|avenges|avenging|retaliat(?:e|es|ed|ing)|payback|settle the score|gets even|murdered (?:his|her|their)|killed (?:his|her|their) (?:family|wife|husband|child|children|father|mother))\b/i.test(text),
  'rescue-mission': text => /\b(?:rescue|rescues|rescued|rescuing|save|saves|saved|saving|free(?!\s+trial)|frees|freed|freeing|liberat(?:e|es|ed|ing))\b[\s\S]{0,100}\b(?:hostages?|prisoners?|captives?|victims?|child(?:ren)?|sons?|daughters?|wives?|husbands?|friends?|people|towns?|cities|world|crews?|teams?|famil(?:y|ies)|comrades?|refugees?|soldiers?)\b/i.test(text) || /\b(?:hostages?|prisoners?|captives?|victims?|child(?:ren)?|sons?|daughters?|wives?|husbands?|friends?|people|towns?|cities|world|crews?|teams?|famil(?:y|ies)|comrades?|refugees?|soldiers?)\b[\s\S]{0,100}\b(?:rescue|rescues|rescued|rescuing|save|saves|saved|saving|free(?!\s+trial)|frees|freed|freeing|liberat(?:e|es|ed|ing))\b/i.test(text),
  'missing-person-search': text => /\b(?:missing|disappeared|disappears|disappearance|vanished|abducted|kidnapped)\b[\s\S]{0,120}\b(?:find|finds|finding|search|searches|searching|look(?:s|ing)? for|track(?:s|ing)? down|reunite|recover)\b/i.test(text) || /\b(?:find|finds|finding|search|searches|searching|look(?:s|ing)? for|track(?:s|ing)? down|reunite|recover)\b[\s\S]{0,120}\b(?:missing|disappeared|disappears|disappearance|vanished|abducted|kidnapped)\b/i.test(text),
  'survival': text => /\b(?:surviv(?:e|es|ed|al|ing)|stranded|marooned|trapped|fight(?:s|ing)? for (?:his|her|their|their own) life|stay(?:s|ing)? alive|against the elements|against nature)\b/i.test(text),
  'pursuit-escape': text => /\b(?:on the run|flee(?:s|ing)?|escape(?:s|d|ing)?|hunted|pursued|chased|chase|manhunt|stalk(?:s|ed|ing)?)\b/i.test(text),
  'witness-protection': text => /\b(?:witness protection|protected witness|witness.{0,50}(?:hide|hiding|on the run|flee)|hide.{0,50}witness)\b/i.test(text),
  'undercover-infiltration': text => /\b(?:undercover|infiltrat(?:e|es|ed|ing)|goes? inside|inside the (?:gang|mob|organization|company|enemy)|posing as (?:a|an|the)|pretends? to be (?:a|an|the) (?:cop|criminal|employee|soldier|member))\b/i.test(text),
  'heist': text => /\b(?:heists?|robbery|rob(?:s|bed|bing)?|steal(?:s|ing|en)?|burgl(?:ar|ary)|breaks? into|break[- ]in|con (?:artists?|men|women)|scam(?:s|med|ming)?|sting operation|swindlers?)\b/i.test(text),
  'investigation': text => /\b(?:detective|investigator|police|cop|sheriff|fbi|private eye|journalist|reporter)\b[\s\S]{0,100}\b(?:murder|killer|crime|case|mystery|investigat|solve|homicide)\b/i.test(text) || /\b(?:investigat(?:e|es|ed|ing)|solve(?:s|d|ing)?|unravels?|find(?:s|ing)? the killer|murder mystery|homicide case|criminal case)\b/i.test(text),
  'conspiracy': text => /\b(?:conspir(?:acy|acies|e|es|ed|ing)|cover[- ]?up|secret plot|hidden agenda|government secret|secret organization|plot to (?:kill|overthrow|control))\b/i.test(text),
  'corruption-exposure': text => /\b(?:corrupt(?:ion|ed)|cover[- ]?up|whistleblower|blow(?:s|ing)? the whistle|expose(?:s|d|ing)?|uncover(?:s|ed|ing)?|reveal(?:s|ed|ing)?|scandal)\b[\s\S]{0,100}\b(?:government|police|company|corporate|institution|official|politician|military|system|corrupt|truth|secret)\b/i.test(text) || /\b(?:corrupt(?:ion|ed)|whistleblower|blow(?:s|ing)? the whistle|scandal)\b/i.test(text),
  'courtroom-defense': text => /\b(?:courtroom|courts?|lawyer|attorney|prosecutor|defend(?:s|ed|ing)?|legal battle|lawsuit|sued|jury|verdict|(?:murder|criminal|civil|legal) trial)\b/i.test(text),
  'treasure-hunt': text => /\b(?:treasure|treasures|artifact|artifacts|relic|relics|lost city|buried gold|ancient gold|legendary fortune|treasure map|hidden fortune)\b/i.test(text),
  'redemption': text => /\b(?:redemption|redeem(?:s|ed|ing)?|atone(?:s|d|ing)?|make(?:s|ing)? amends|second chance at (?:life|redemption)|former (?:criminal|thief|addict|killer|convict)|ex[- ]con|reform(?:s|ed|ing)?)\b/i.test(text),
  'outsider-vs-institution': text => /\b(?:maverick|outsider|lone wolf|against the (?:system|establishment|government|military|company|corporation)|pitted against the (?:government|military|system|establishment|corporate)|def(?:y|ies|ied|ying) authority|takes on the (?:system|establishment|government|company|corporation))\b/i.test(text),
  'political-rebellion': text => /\b(?:rebellion|revolt|rebel(?:s|led|ling)?|uprising|revolution|resistance|overthrow(?:s|ing)?|liberat(?:e|es|ed|ing) the (?:people|country|nation))\b/i.test(text),
  'wartime-mission': text => /\b(?:world war|wwi|wwii|soldier|army|navy|marine|military|combat|front line|troops?)\b/i.test(text) && /\b(?:mission|sent to|ordered to|fight|fights|fighting|battle|combat|track|rescue|protect|defend|survive|return)\b/i.test(text),
  'disaster-response': text => /\b(?:earthquake|tidal wave|tsunami|hurricane|tornado|flood|firestorm|natural disaster|catastroph(?:e|ic)|volcano|asteroid|meteor|nuclear (?:catastrophe|disaster)|pandemic|surface of the earth|planet is dying)\b/i.test(text),
  'monster-threat': text => /\b(?:monster|monsters|creature|creatures|alien|aliens|vampire|vampires|werewolf|werewolves|zombie|zombies|ghost|ghosts|haunted|demon|demons|supernatural force|beast|beasts)\b/i.test(text),
  'supernatural-bargain': text => /\b(?:devil|demon|curse|cursed|bargain|wishes? granted|magical deal|supernatural bargain|sells? (?:his|her|their) soul|30[- ]day free trial)\b/i.test(text),
  'time-pressure': text => /\b(?:deadline|race against (?:time|the clock)|before it(?:'s| is) too late|countdown|time is running out|within (?:one|two|three|four|five|six|seven|ten|twenty|thirty|24|48|72) hours?|days? to|hours? to|expires?|30[- ]day)\b/i.test(text),
  'sports-underdog': text => /\b(?:quarterback|football|baseball|basketball|hockey|soccer|boxing|boxer|wrestl(?:e|ing)|athlete|athletic|race car|racer|team)\b/i.test(text) && /\b(?:championship|league|game|season|competition|tournament|underdog|win|victory|comeback|coach|playoffs?)\b/i.test(text),
  'performance-competition': text => /\b(?:band|musician|singer|songwriter|actor|actress|performer|dancer|dance troupe|theater|theatre|audition|concert)\b/i.test(text) && /\b(?:competition|contest|audition|role|perform|performance|show|career|breakthrough|win)\b/i.test(text),
  'mentor-protege': text => /\b(?:mentor|mentors|mentored|protégé|protege|under the wing|teaches|trains|coach(?:es|ed|ing)?)\b/i.test(text),
  'power-struggle': text => /\b(?:power struggle|fight(?:s|ing)? for control|battle(?:s|ling)? for control|compete(?:s|ing)? for control|succession|vying for power|control of the (?:family|company|organization|kingdom|territory))\b/i.test(text),
  'second-chance': text => /\b(?:second chance|another chance|start over|relive(?:s|d|ing)?|redo(?:es|ing)?|gets? to live (?:his|her|their) life over|returns? to the past|time travel(?:s|ing)?)\b/i.test(text)
}

function hasFrame(context) {
  return Boolean(context.structure.protagonist && context.text.trim())
}

function hasField(context, field) {
  return Boolean(context.structure[field])
}

function hasPlotFunction(context, key) {
  if (!hasFrame(context)) return false
  const hasStructureSignal = ['goal', 'obstacle', 'stakes'].some(field => hasField(context, field))
  return hasStructureSignal || cueRules[key](context.text)
}

const rules = Object.fromEntries(Object.keys(cueRules).map(key => [key, context => hasPlotFunction(context, key) && cueRules[key](context.text)]))

for (const pattern of taxonomy) {
  if (typeof pattern.key !== 'string' || typeof pattern.label !== 'string' || typeof pattern.description !== 'string' || !rules[pattern.key]) {
    throw new Error(`Invalid or unimplemented story pattern: ${pattern.key ?? '<missing key>'}`)
  }
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

function patternsFor(logline, sourceStatus, structure) {
  if (sourceStatus !== 'available') return []
  const context = { text: logline, structure }
  const matches = new Set(taxonomy.filter(pattern => rules[pattern.key](context)).map(pattern => pattern.key))

  // Keep the most specific canonical label when a broad cue would duplicate it.
  if (matches.has('missing-person-search')) matches.delete('rescue-mission')
  if (matches.has('witness-protection')) matches.delete('pursuit-escape')
  if (matches.has('undercover-infiltration')) matches.delete('identity-disguise')
  if (matches.has('monster-threat') || matches.has('disaster-response')) matches.delete('survival')
  return taxonomy.filter(pattern => matches.has(pattern.key)).map(pattern => pattern.key)
}

function enrichDeal(deal) {
  const previousRecord = previousById.get(deal.id)
  const sourceStatus = previousRecord?.sourceStatus ?? 'available'
  const structure = structureFor(deal.logline, sourceStatus)
  return {
    id: deal.id,
    logline: deal.logline,
    status: 'analysed',
    patterns: patternsFor(deal.logline, sourceStatus, structure),
    structure,
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
    method: 'Offline screenplay-pattern classification from current source loglines using a curated canonical taxonomy. Structure values are preserved literal source excerpts; limited or unavailable descriptions remain unfilled.',
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
