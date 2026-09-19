export const DEFAULT_SITE_URL = 'https://scottmyers.vercel.app'

export function normalizedSiteUrl(value: unknown) {
  const source = typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_SITE_URL

  return source.replace(/\/+$/, '')
}

export function absoluteSiteUrl(siteUrl: string, path: string) {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}
