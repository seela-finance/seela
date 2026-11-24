// Shared metadata + JSON-LD + render for the "money" pillar routes, so each
// top-level route file (financement-materiel-professionnel, …) stays a 2-liner.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd, breadcrumbSchema, faqSchema, serviceSchema } from '@/lib/seo/jsonld'
import { getPillar } from '@/lib/seo/pillars'
import PillarView from './PillarView'

export function pillarMetadata(slug: string): Metadata {
  const pillar = getPillar(slug)
  if (!pillar) return {}
  const path = `/${pillar.slug}`
  return {
    title: pillar.metaTitle,
    description: pillar.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: pillar.metaTitle,
      description: pillar.metaDescription,
      url: path,
      type: 'website',
    },
  }
}

export function PillarPageBody({ slug }: { slug: string }) {
  const pillar = getPillar(slug)
  if (!pillar) notFound()
  const path = `/${pillar.slug}`
  return (
    <>
      <JsonLd data={serviceSchema({ name: pillar.metaTitle, description: pillar.metaDescription, path })} />
      <JsonLd data={faqSchema(pillar.faq)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: pillar.kicker, path },
      ])} />
      <PillarView pillar={pillar} />
    </>
  )
}
