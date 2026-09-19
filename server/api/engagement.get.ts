import { getEngagementState } from '../utils/engagement'

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')

  return getEngagementState(event)
})
