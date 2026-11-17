import type { Metadata } from 'next'
import DistributorsView from '@/components/marketing/DistributorsView'
import { JsonLd, breadcrumbSchema, faqSchema, serviceSchema } from '@/lib/seo/jsonld'
import { DISTRIBUTORS_FAQ, DISTRIBUTORS_META, DISTRIBUTORS_PATH } from '@/lib/seo/distributors'

// Page dédiée aux fournisseurs et distributeurs : trois arguments (moins
// d'administratif, plus d'acceptation, sur mesure). Statique, comme les
// autres pages marketing.
export const metadata: Metadata = {
  title: DISTRIBUTORS_META.title,
  description: DISTRIBUTORS_META.description,
  alternates: { canonical: DISTRIBUTORS_PATH },
  openGraph: {
    title: DISTRIBUTORS_META.title,
    description: DISTRIBUTORS_META.description,
    url: DISTRIBUTORS_PATH,
  },
}

export default function DistributorsPage() {
  return (
    <>
      <JsonLd data={serviceSchema({
        name: 'Financement des ventes pour distributeurs et fournisseurs',
        description: DISTRIBUTORS_META.description,
        path: DISTRIBUTORS_PATH,
      })} />
      <JsonLd data={faqSchema(DISTRIBUTORS_FAQ)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Distributeurs', path: DISTRIBUTORS_PATH },
      ])} />
      <DistributorsView />
    </>
  )
}
