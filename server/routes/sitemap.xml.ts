import {
  archiveDeals,
  archivePageCount,
  archivePagePath,
  loglinePath
} from '~/utils/logline-routes'
import { absoluteSiteUrl, normalizedSiteUrl } from '~/utils/site'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = normalizedSiteUrl(config.public.siteUrl)
  const paths = [
    '/',
    '/loglines',
    '/what-is-a-logline',
    ...Array.from({ length: archivePageCount - 1 }, (_, index) => archivePagePath(index + 2)),
    ...archiveDeals.map(deal => loglinePath(deal))
  ]
  const urls = [...new Set(paths)]
    .map(path => `    <url><loc>${escapeXml(absoluteSiteUrl(siteUrl, path))}</loc></url>`)
    .join('\n')

  setHeader(event, 'cache-control', 'public, max-age=3600')
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>'
  ].join('\n')
})
