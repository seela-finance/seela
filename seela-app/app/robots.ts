import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

// robots.txt — allow crawling of public pages, disallow authenticated areas
// and API routes. Points crawlers to the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/auth', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
