import { normalizedSiteUrl } from '~/utils/site'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = normalizedSiteUrl(config.public.siteUrl)

  setHeader(event, 'cache-control', 'public, max-age=3600')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /qa/',
    `Sitemap: ${siteUrl}/sitemap.xml`
  ].join('\n')
})
