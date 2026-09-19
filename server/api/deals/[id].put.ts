import { normalizeEditableDeal, readDeals, writeDeals } from '../../utils/deals'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const deals = await readDeals()
  const dealIndex = deals.findIndex(deal => deal.id === id)

  if (dealIndex < 0) {
    throw createError({ statusCode: 404, statusMessage: 'Deal not found.' })
  }

  const currentDeal = deals[dealIndex]
  if (!currentDeal) {
    throw createError({ statusCode: 404, statusMessage: 'Deal not found.' })
  }

  const body = await readBody<Record<string, unknown>>(event)
  const updatedFields = normalizeEditableDeal(body ?? {})

  deals[dealIndex] = {
    ...currentDeal,
    ...updatedFields
  }

  await writeDeals(deals)
  return deals[dealIndex]
})
