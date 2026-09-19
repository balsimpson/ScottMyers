import type { Deal } from '~/data/deals'

const shortMonthYearFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric'
})

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

function formatDateParts(month: number, day: number | undefined, year: number) {
  if (month < 1 || month > 12 || !Number.isInteger(year)) return ''

  const parsed = new Date(year, month - 1, day ?? 1)
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || (day && parsed.getDate() !== day)
  ) {
    return ''
  }

  return day
    ? shortDateFormatter.format(parsed)
    : shortMonthYearFormatter.format(parsed)
}

export function formatDealDate(value: string | null, dealYear: number) {
  const normalized = value?.trim().replace(/[.,]+$/, '')
  if (!normalized || /^n\/?a$/i.test(normalized)) return ''

  const parts = normalized.split('/').map(Number)
  if (parts.some(part => !Number.isInteger(part))) return normalized

  if (parts.length === 2) {
    const [month, rawYear] = parts
    if (month === undefined || rawYear === undefined) return normalized
    const year = rawYear < 100 ? dealYear : rawYear
    return formatDateParts(month, undefined, year) || normalized
  }

  if (parts.length === 3) {
    const [month, day, rawYear] = parts
    if (month === undefined || day === undefined || rawYear === undefined) return normalized
    const year = rawYear < 100 ? dealYear : rawYear
    return formatDateParts(month, day, year) || normalized
  }

  return normalized
}

function noteValue(deal: Deal) {
  if (!deal.notes) return ''
  if (!deal.dealAmount) return deal.notes

  return deal.notes
    .replace(deal.dealAmount, '')
    .replace(/^[\s.,;:–—-]+|[\s.,;:–—-]+$/g, '')
    .trim()
}

export interface DealMetadata {
  label: string
  icon: string
  value: string
}

export function metadataFor(deal: Deal): DealMetadata[] {
  return [
    { label: 'Release date', icon: 'i-lucide-calendar-days', value: formatDealDate(deal.date, deal.year) },
    { label: 'Agency', icon: 'i-lucide-building-2', value: deal.agency ?? '' },
    { label: 'Management', icon: 'i-lucide-briefcase-business', value: deal.management ?? '' },
    { label: 'Studio', icon: 'i-lucide-clapperboard', value: deal.studio ?? '' },
    { label: 'Production co.', icon: 'i-lucide-factory', value: deal.productionCompany ?? '' },
    { label: 'Producer', icon: 'i-lucide-user-round', value: deal.producer ?? '' },
    { label: 'Deal', icon: 'i-lucide-banknote', value: deal.dealAmount ?? '' },
    { label: 'Notes', icon: 'i-lucide-sticky-note', value: noteValue(deal) }
  ].filter(item => item.value)
}
