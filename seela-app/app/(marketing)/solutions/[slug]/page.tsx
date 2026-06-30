import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SolutionView from '@/components/marketing/SolutionView'
import { JsonLd, breadcrumbSchema, faqSchema, serviceSchema } from '@/lib/seo/jsonld'
import { SOLUTIONS, getSolution } from '@/lib/seo/solutions'

// Static generation — every solution page is prerendered at build time.
export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const sol = getSolution(slug)
  if (!sol) return {}
  const path = `/solutions/${sol.slug}`
  return {
    title: sol.metaTitle,
    description: sol.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: sol.metaTitle,
      description: sol.metaDescription,
      url: path,
      type: 'article',
    },
  }
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sol = getSolution(slug)
  if (!sol) notFound()

  const path = `/solutions/${sol.slug}`

  return (
    <>
      <JsonLd data={serviceSchema({ name: sol.name, description: sol.metaDescription, path })} />
      <JsonLd data={faqSchema(sol.faq)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Solutions', path: '/solutions' },
        { name: sol.name, path },
      ])} />
      <SolutionView solution={sol} />
    </>
  )
}
