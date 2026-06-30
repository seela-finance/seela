import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SectorView from '@/components/marketing/SectorView'
import { JsonLd, breadcrumbSchema, faqSchema, serviceSchema } from '@/lib/seo/jsonld'
import { SECTORS, getSector } from '@/lib/seo/sectors'

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const sec = getSector(slug)
  if (!sec) return {}
  const path = `/secteurs/${sec.slug}`
  return {
    title: sec.metaTitle,
    description: sec.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: sec.metaTitle,
      description: sec.metaDescription,
      url: path,
      type: 'article',
    },
  }
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sec = getSector(slug)
  if (!sec) notFound()

  const path = `/secteurs/${sec.slug}`

  return (
    <>
      <JsonLd data={serviceSchema({ name: `Financement d'équipement — ${sec.name}`, description: sec.metaDescription, path })} />
      <JsonLd data={faqSchema(sec.faq)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Secteurs', path: '/secteurs' },
        { name: sec.name, path },
      ])} />
      <SectorView sector={sec} />
    </>
  )
}
