import { recordEngagement, type EngagementAction } from '../utils/engagement'

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')

  const body = await readBody<{ action?: EngagementAction }>(event)

  if (body?.action !== 'thanks' && body?.action !== 'patreon') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid engagement action'
    })
  }

  return recordEngagement(event, body.action)
})
