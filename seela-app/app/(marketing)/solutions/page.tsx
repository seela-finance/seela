import type { Metadata } from 'next'
import Link from 'next/link'
import { SparkleGlyph, IconArrowRight } from '@/components/landing/icons'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import ComparisonTable from '@/components/marketing/ComparisonTable'
import { JsonLd, breadcrumbSchema } from '@/lib/seo/jsonld'
import { absoluteUrl } from '@/lib/seo/site'
import { SOLUTIONS } from '@/lib/seo/solutions'

export const metadata: Metadata = {
  title: "Solutions de financement d'équipement professionnel",
  description:
    "Location financière, crédit-bail, LLD, LOA, lease-back : comparez les modes de financement locatif d'équipement professionnel et trouvez celui adapté à votre entreprise.",
  alternates: { canonical: '/solutions' },
  openGraph: {
    title: "Solutions de financement d'équipement professionnel",
    description:
      "Comparez la location financière, le crédit-bail, la LLD, la LOA et le lease-back pour financer vos équipements professionnels.",
    url: '/solutions',
  },
}

function collectionSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: "Solutions de financement d'équipement",
    url: absoluteUrl('/solutions'),
    hasPart: SOLUTIONS.map((s) => ({
      '@type': 'WebPage',
      name: s.name,
      url: absoluteUrl(`/solutions/${s.slug}`),
    })),
  }
}

export default function SolutionsHub() {
  return (
    <>
      <JsonLd data={collectionSchema()} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Solutions', path: '/solutions' },
      ])} />

      <main>
        <header className="lp-section" style={{ paddingBottom: 32 }}>
          <div className="lp-wrap">
            <div className="mk-measure">
              <Breadcrumbs items={[{ name: 'Accueil', path: '/' }, { name: 'Solutions' }]} />
              <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> Modes de financement</span>
              <h1 className="lp-h1" style={{ fontSize: 40, marginTop: 18 }}>Financer vos équipements professionnels</h1>
              <p className="lp-lede" style={{ fontSize: 18, marginTop: 18, maxWidth: 660 }}>
                Location financière, crédit-bail, LLD, LOA, lease-back : chaque mode de financement a ses atouts. Everlease vous conseille et met en concurrence ses partenaires financeurs pour trouver le bon.
              </p>
            </div>
          </div>
        </header>

        {/* Solution cards */}
        <section className="lp-section" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="mk-hubgrid">
              {SOLUTIONS.map((s) => (
                <Link key={s.slug} href={`/solutions/${s.slug}`} className="card mk-hubcard">
                  <h2 className="mk-hubcard__title">{s.name}</h2>
                  <p className="mk-hubcard__body">{s.tagline}</p>
                  <span className="mk-hubcard__cta">En savoir plus <IconArrowRight size={13} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="lp-wrap">
            <h2 className="lp-h2" style={{ fontSize: 26 }}>Comparatif des financements</h2>
            <p className="lp-lede" style={{ fontSize: 15, marginTop: 12, marginBottom: 24, maxWidth: 640 }}>
              Les principales différences entre location financière, crédit-bail, LLD, LOA et lease-back en un coup d&apos;œil.
            </p>
            <ComparisonTable />
          </div>
        </section>

        <section className="lp-section--tight" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="lp-wrap" style={{ textAlign: 'center', maxWidth: 560 }}>
            <h2 className="lp-h2">Pas sûr du bon financement ?</h2>
            <p className="lp-lede" style={{ margin: '14px auto 0', maxWidth: 460 }}>
              Déposez un devis : Everlease analyse votre besoin et vous propose les offres les plus adaptées.
            </p>
            <div className="lp-cta-row" style={{ marginTop: 28 }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Estimer mon financement <IconArrowRight /></Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
