// JSON-LD structured data. Server-rendered <script> tags consumed by Google
// (rich results) and by generative engines (GEO) to extract clean facts.

import { SITE_NAME, SITE_URL, absoluteUrl } from './site'
import type { Faq } from './solutions'

/** Inline a JSON-LD object as a <script type="application/ld+json"> tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/everlease-icon.png'),
    description:
      "Everlease accompagne les entreprises dans le financement locatif de leurs équipements professionnels : location financière, crédit-bail, LLD, LOA et lease-back.",
    areaServed: 'FR',
  }
}

export function faqSchema(faq: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function serviceSchema(opts: {
  name: string
  description: string
  path: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    areaServed: 'FR',
    provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  }
}
