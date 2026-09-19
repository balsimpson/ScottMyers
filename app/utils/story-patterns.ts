import reviews from '../../data/story-reviews.json'
import type { Deal } from '../data/deals'

export const storyPatterns = [
  { key: 'rescue', label: 'Rescue & captivity', description: 'Someone is abducted, held hostage, or needs to be brought out of danger.' },
  { key: 'survival', label: 'Survival & escape', description: 'The premise centres on staying alive or escaping physical confinement.' },
  { key: 'revenge', label: 'Revenge', description: 'A character retaliates for a wrong, betrayal, or death.' },
  { key: 'heist', label: 'Heists & robberies', description: 'Planning, committing, or investigating a robbery drives the story.' },
  { key: 'identity', label: 'Hidden & mistaken identities', description: 'An undercover role, impersonation, body swap, or identity mix-up shapes the premise.' },
  { key: 'second', label: 'Reconnection & second chances', description: 'Characters rebuild a relationship or get a chance to change their lives.' },
  { key: 'time', label: 'Time travel & repeating days', description: 'A character moves through time or experiences the same events again.' },
  { key: 'forbidden', label: 'Forbidden relationships', description: 'An affair or prohibited romantic relationship is central to the premise.' }
] as const

export type PatternKey = typeof storyPatterns[number]['key']
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
