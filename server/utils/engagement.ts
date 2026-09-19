import { Redis } from '@upstash/redis'
import { randomUUID } from 'node:crypto'

const deviceCookieName = 'scott-myers-device'
const thanksKey = 'scott-myers:thanks'
const patreonKey = 'scott-myers:patreon'
const cookieMaxAge = 60 * 60 * 24 * 365

let redis: Redis | undefined

const redisUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL
  ?? process.env.UPSTASH_REDIS_REST_URL
  ?? process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
  ?? process.env.UPSTASH_REDIS_REST_TOKEN
  ?? process.env.KV_REST_API_TOKEN

export type EngagementAction = 'thanks' | 'patreon'

export interface EngagementState {
  thanksCount: number
  patreonCount: number
  thanked: boolean
  patreonClicked: boolean
}

function getRedis() {
  if (!redisUrl || !redisToken) {
    throw new Error('Missing Upstash Redis environment variables.')
  }

  redis ??= new Redis({
    token: redisToken,
    url: redisUrl
  })

  return redis
}

function getDeviceId(event: Parameters<typeof getCookie>[0]) {
  const existingDeviceId = getCookie(event, deviceCookieName)

  if (existingDeviceId) return existingDeviceId

  const deviceId = randomUUID()

  setCookie(event, deviceCookieName, deviceId, {
    httpOnly: true,
    maxAge: cookieMaxAge,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })

  return deviceId
}

export async function getEngagementState(event: Parameters<typeof getCookie>[0]): Promise<EngagementState> {
  const deviceId = getDeviceId(event)
  const store = getRedis()
  const [thanksCount, patreonCount, thanked, patreonClicked] = await Promise.all([
    store.scard(thanksKey),
    store.scard(patreonKey),
    store.sismember(thanksKey, deviceId),
    store.sismember(patreonKey, deviceId)
  ])

  return {
    thanksCount: Number(thanksCount),
    patreonCount: Number(patreonCount),
    thanked: Boolean(thanked),
    patreonClicked: Boolean(patreonClicked)
  }
}

export async function recordEngagement(event: Parameters<typeof getCookie>[0], action: EngagementAction) {
  const deviceId = getDeviceId(event)
  const key = action === 'thanks' ? thanksKey : patreonKey

  await getRedis().sadd(key, deviceId)

  return getEngagementState(event)
}
