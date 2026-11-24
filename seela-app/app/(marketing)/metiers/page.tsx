import type { Metadata } from 'next'
import Link from 'next/link'
import { SparkleGlyph, IconArrowRight } from '@/components/landing/icons'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import { JsonLd, breadcrumbSchema } from '@/lib/seo/jsonld'
import { absoluteUrl } from '@/lib/seo/site'
import { METIERS } from '@/lib/seo/metiers'
import { getSector } from '@/lib/seo/sectors'

export const metadata: Metadata = {
  title: "Financer le matériel de votre métier",
  description:
    "Studio de Pilates, box de CrossFit, hôtel, institut de beauté, salon de coiffure, cabinet de kiné ou vétérinaire, garage : financez le matériel de votre métier en leasing, sans apport.",
  alternates: { canonical: '/metiers' },
  openGraph: {
    title: "Financer le matériel de votre métier",
    description:
      "Des solutions de financement locatif adaptées au matériel précis de votre métier.",
    url: '/metiers',
  },
}

function collectionSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Financement de matériel par métier',
    url: absoluteUrl('/metiers'),
    hasPart: METIERS.map((m) => ({
      '@type': 'WebPage',
      name: m.name,
      url: absoluteUrl(`/metiers/${m.slug}`),
    })),
  }
}

export default function MetiersHub() {
  return (
    <>
      <JsonLd data={collectionSchema()} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Métiers', path: '/metiers' },
      ])} />

      <main>
        <header className="lp-section" style={{ paddingBottom: 32 }}>
          <div className="lp-wrap">
            <div className="mk-measure">
              <Breadcrumbs items={[{ name: 'Accueil', path: '/' }, { name: 'Métiers' }]} />
              <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> Par métier</span>
              <h1 className="lp-h1" style={{ fontSize: 40, marginTop: 18 }}>Financer le matériel de votre métier</h1>
              <p className="lp-lede" style={{ fontSize: 18, marginTop: 18, maxWidth: 680 }}>
                Chaque métier a son matériel et ses contraintes. Retrouvez le financement adapté à l&apos;équipement précis de votre activité — et l&apos;estimation de votre loyer.
              </p>
            </div>
          </div>
        </header>

        <section className="lp-section" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="mk-hubgrid">
              {METIERS.map((m) => {
                const parent = getSector(m.parentSectorSlug)
                return (
                  <Link key={m.slug} href={`/metiers/${m.slug}`} className="card mk-hubcard">
                    {parent && <span className="mk-blog__kicker">{parent.nav}</span>}
                    <h2 className="mk-hubcard__title" style={{ fontSize: 20 }}>{m.h1}</h2>
                    <p className="mk-hubcard__body">{m.tagline}</p>
                    <span className="mk-hubcard__cta">Voir le métier <IconArrowRight size={13} /></span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section className="lp-section--tight">
          <div className="lp-wrap">
          <div className="mk-cta-center" style={{ marginTop: 0 }}>
            <h2 className="lp-h2">Votre métier n&apos;est pas listé ?</h2>
            <p className="lp-lede" style={{ margin: '14px auto 0', maxWidth: 460 }}>
              Si c&apos;est un actif physique professionnel, ça se finance. Déposez un devis pour vérifier votre éligibilité.
            </p>
            <div className="lp-cta-row" style={{ marginTop: 28 }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Estimer mon financement <IconArrowRight /></Link>
            </div>
          </div>
          </div>
        </section>
      </main>
    </>
  )
}
