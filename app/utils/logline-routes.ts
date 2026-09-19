import {
  deals,
  sortNewest,
  type Deal
} from '~/data/deals'

export const LOGLINE_PAGE_SIZE = 36
export const archiveDeals = sortNewest(deals)
export const archivePageCount = Math.max(1, Math.ceil(archiveDeals.length / LOGLINE_PAGE_SIZE))

export function loglinePath(dealOrId: Deal | string) {
  const id = typeof dealOrId === 'string' ? dealOrId : dealOrId.id
  return `/loglines/${encodeURIComponent(id)}`
}

export function archivePagePath(page: number) {
  return page <= 1 ? '/loglines' : `/loglines/page/${page}`
}

export function getArchivePage(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > archivePageCount) return null

  const start = (page - 1) * LOGLINE_PAGE_SIZE

  return {
    deals: archiveDeals.slice(start, start + LOGLINE_PAGE_SIZE),
    page,
    pageCount: archivePageCount
  }
}

export function findDealById(id: string) {
  return deals.find(deal => deal.id === id) ?? null
}

export function displayDealTitle(deal: Deal) {
  return deal.title?.trim() || `Untitled spec script #${deal.entryNumber}`
}
