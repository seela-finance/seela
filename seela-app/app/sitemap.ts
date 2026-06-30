import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'
import { SOLUTIONS } from '@/lib/seo/solutions'
import { SECTORS } from '@/lib/seo/sectors'

// Auto-generated sitemap.xml. Lists the public, indexable marketing pages.
// Authenticated (/app/*) and auth routes are intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/solutions`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/secteurs`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ]

  const solutionPages: MetadataRoute.Sitemap = SOLUTIONS.map((s) => ({
    url: `${SITE_URL}/solutions/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const sectorPages: MetadataRoute.Sitemap = SECTORS.map((s) => ({
    url: `${SITE_URL}/secteurs/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticPages, ...solutionPages, ...sectorPages]
}
