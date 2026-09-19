import reviews from '../../data/story-reviews.json'
import type { Deal } from '../data/deals'

const patternKeys = [...new Set((reviews.records as StoryReview[]).flatMap(review => review.patterns))]

function labelFor(key: string) {
  return key.replace(/\b\w/g, character => character.toUpperCase())
}

export const storyPatterns = patternKeys.map(key => ({
  key,
  label: labelFor(key),
  description: `Recurring phrase found in the archive: “${key}”.`
}))

export type PatternKey = string
export interface StoryStructure {
  protagonist: string | null
  goal: string | null
  obstacle: string | null
  stakes: string | null
}
export interface StoryReview {
  id: string
  logline: string
  status: 'analysed'
  patterns: string[]
  structure: StoryStructure
  sourceStatus: 'available' | 'limited' | 'unavailable'
}
export const storyStructureFields = [
  { key: 'protagonist', label: 'Protagonist' },
  { key: 'goal', label: 'Goal' },
  { key: 'obstacle', label: 'Obstacle' },
  { key: 'stakes', label: 'Stakes' }
] as const
const reviewById = new Map<string, StoryReview>((reviews.records as StoryReview[]).map(review => [review.id, review]))
export const storyReviewMethod = reviews.method
export const storyReviewDate = reviews.reviewedAt

// An edited logline needs a fresh review. Never silently reuse its old interpretation.
export function storyReviewFor(deal: Deal) {
  const review = reviewById.get(deal.id)
  return review?.logline === deal.logline ? review : undefined
}

export function patternsFor(deal: Deal) {
  const keys = storyReviewFor(deal)?.patterns ?? []
  return storyPatterns.filter(pattern => keys.includes(pattern.key))
}

export function storyCoverage(source: Deal[]) {
  const current = source.map(deal => storyReviewFor(deal)).filter((review): review is StoryReview => Boolean(review))
  return {
    reviewed: current.length,
    tagged: current.filter(review => review.patterns.length).length,
    withoutPattern: current.filter(review => !review.patterns.length).length,
    limited: current.filter(review => review.sourceStatus === 'limited' || review.sourceStatus === 'unavailable').length,
    stale: source.filter(deal => reviewById.has(deal.id) && !storyReviewFor(deal)).length,
    missing: source.filter(deal => !reviewById.has(deal.id)).length
  }
}
