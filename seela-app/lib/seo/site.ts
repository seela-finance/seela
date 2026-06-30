// Centralised SEO/site constants. Single source of truth for canonical URL,
// brand name and the marketing route map (used by the nav, sitemap and JSON-LD).

export const SITE_URL = 'https://everlease.fr'
export const SITE_NAME = 'Everlease'
export const SITE_TAGLINE = 'Le financement locatif des équipements professionnels'
export const CONTACT_EMAIL = 'contact@everlease.fr'

/** Absolute URL helper — keeps canonical/OG/sitemap URLs consistent. */
export function absoluteUrl(path = ''): string {
  if (!path) return SITE_URL
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
