import type { Metadata } from 'next'
import Link from 'next/link'
import { SparkleGlyph, IconArrowRight } from '@/components/landing/icons'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import { JsonLd, breadcrumbSchema } from '@/lib/seo/jsonld'
import { absoluteUrl } from '@/lib/seo/site'
import { SECTORS } from '@/lib/seo/sectors'
import CallbackSection from '@/components/marketing/CallbackSection'

export const metadata: Metadata = {
  title: "Financement d'équipement par secteur d'activité",
  description:
    "CHR, santé, BTP, commerce, industrie, transport : découvrez les solutions de financement d'équipement adaptées à votre secteur d'activité et au matériel de votre métier.",
  alternates: { canonical: '/secteurs' },
  openGraph: {
    title: "Financement d'équipement par secteur d'activité",
    description:
      "Des solutions de financement locatif adaptées à chaque secteur : CHR, santé, BTP, commerce, industrie, transport.",
    url: '/secteurs',
  },
}

function collectionSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: "Financement d'équipement par secteur",
    url: absoluteUrl('/secteurs'),
    hasPart: SECTORS.map((s) => ({
      '@type': 'WebPage',
      name: s.name,
      url: absoluteUrl(`/secteurs/${s.slug}`),
    })),
  }
}

export default function SecteursHub() {
  return (
    <>
      <JsonLd data={collectionSchema()} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Secteurs', path: '/secteurs' },
      ])} />

      <main>
        <header className="lp-section" style={{ paddingBottom: 32 }}>
          <div className="lp-wrap">
            <div className="mk-measure">
              <Breadcrumbs items={[{ name: 'Accueil', path: '/' }, { name: 'Secteurs' }]} />
              <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> Secteurs d&apos;activité</span>
              <h1 className="lp-h1" style={{ fontSize: 40, marginTop: 18 }}>Un financement adapté à votre métier</h1>
              <p className="lp-lede" style={{ fontSize: 18, marginTop: 18, maxWidth: 660 }}>
                Chaque secteur a ses équipements et ses contraintes de trésorerie. Everlease adapte le financement au matériel de votre activité et présente votre dossier à des financeurs adaptés.
              </p>
            </div>
          </div>
        </header>

        <section className="lp-section" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="mk-hubgrid">
              {SECTORS.map((s) => (
                <Link key={s.slug} href={`/secteurs/${s.slug}`} className="card mk-hubcard">
                  <h2 className="mk-hubcard__title">{s.name}</h2>
                  <p className="mk-hubcard__body">{s.tagline}</p>
                  <span className="mk-hubcard__cta">Voir le secteur <IconArrowRight size={13} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section--tight">
          <div className="lp-wrap">
          <CallbackSection
            title="Votre secteur n'est pas listé ?"
            lede="Si c'est un actif physique professionnel, ça se finance. Déposez un devis pour vérifier votre éligibilité."
            cta="Estimer mon financement"
            origine={"Page Secteurs"}
            flush
          />
          </div>
        </section>
      </main>
    </>
  )
}
