import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MetierView from '@/components/marketing/MetierView'
import { JsonLd, breadcrumbSchema, faqSchema, serviceSchema } from '@/lib/seo/jsonld'
import { METIERS, getMetier } from '@/lib/seo/metiers'

export function generateStaticParams() {
  return METIERS.map((m) => ({ slug: m.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const metier = getMetier(slug)
  if (!metier) return {}
  const path = `/metiers/${metier.slug}`
  return {
    title: metier.metaTitle,
    description: metier.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: metier.metaTitle,
      description: metier.metaDescription,
      url: path,
      type: 'article',
    },
  }
}

export default async function MetierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const metier = getMetier(slug)
  if (!metier) notFound()

  const path = `/metiers/${metier.slug}`

  return (
    <>
      <JsonLd data={serviceSchema({ name: `Financement de matériel — ${metier.name}`, description: metier.metaDescription, path })} />
      <JsonLd data={faqSchema(metier.faq)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Métiers', path: '/metiers' },
        { name: metier.nav, path },
      ])} />
      <MetierView metier={metier} />
    </>
  )
}
