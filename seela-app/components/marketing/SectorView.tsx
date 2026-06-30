// Renders a full sector page from a Sector data object. The hero pairs text
// with a photo slot; the solution × secteur mapping is the centrepiece and
// links contextually to each /solutions/[slug] page.
//
// Layout: every section uses the full-width `.lp-wrap` (one shared left
// gutter); prose-only blocks (intro, FAQ) are width-capped with `.mk-measure`
// but stay LEFT-aligned so all blocks line up on the same left edge.
import Link from 'next/link'
import { SparkleGlyph, IconArrowRight, IconCheckSm } from '@/components/landing/icons'
import { CONTACT_EMAIL } from '@/lib/seo/site'
import { getSolution } from '@/lib/seo/solutions'
import { getSector, type Sector } from '@/lib/seo/sectors'
import Breadcrumbs from './Breadcrumbs'
import ComparisonTable from './ComparisonTable'
import ImageSlot from './ImageSlot'

export default function SectorView({ sector }: { sector: Sector }) {
  const related = sector.related.map(getSector).filter(Boolean) as Sector[]

  return (
    <main>
      {/* Hero with photo */}
      <header className="lp-section" style={{ paddingBottom: 48 }}>
        <div className="lp-wrap mk-hero">
          <div className="mk-hero__text">
            <Breadcrumbs items={[
              { name: 'Accueil', path: '/' },
              { name: 'Secteurs', path: '/secteurs' },
              { name: sector.name },
            ]} />
            <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> Secteur d&apos;activité</span>
            <h1 className="lp-h1" style={{ fontSize: 40, marginTop: 18 }}>{sector.h1}</h1>
            <p className="lp-lede" style={{ fontSize: 18, marginTop: 18 }}>{sector.tagline}</p>
            <div className="lp-cta-row" style={{ marginTop: 28 }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Estimer mon financement <IconArrowRight /></Link>
              <a className="btn btn--secondary btn--lg" href={`mailto:${CONTACT_EMAIL}`}>Parler à un expert</a>
            </div>
          </div>
          <div className="mk-hero__media">
            <ImageSlot photo={sector.photos.hero} src={`/secteurs/${sector.slug}-hero.jpg`} ratio="4 / 3" />
          </div>
        </div>
      </header>

      {/* Intro (answer-first) */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <p className="lp-lede mk-measure--sm" style={{ fontSize: 17 }}>{sector.intro}</p>
        </div>
      </section>

      {/* Equipment financed */}
      <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Quels équipements financer ?</h2>
          <div className="mk-eqgrid2">
            {sector.equipment.map((e) => (
              <div key={e.category} className="card mk-eqcard">
                <div className="mk-eqcard__cat">{e.category}</div>
                <div className="mk-eqcard__ex">{e.examples}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why finance + contextual photo */}
      <section className="lp-section">
        <div className="lp-wrap mk-split-media">
          <div className="mk-split-media__text">
            <h2 className="lp-h2" style={{ fontSize: 26 }}>Pourquoi financer plutôt qu&apos;acheter ?</h2>
            <p className="lp-lede" style={{ fontSize: 16, marginTop: 16 }}>{sector.whyFinance}</p>
          </div>
          <div className="mk-split-media__img">
            <ImageSlot photo={sector.photos.equipment} src={`/secteurs/${sector.slug}-equipement.jpg`} ratio="4 / 3" />
          </div>
        </div>
      </section>

      {/* Solution × secteur mapping — the centrepiece */}
      <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Quel financement pour quel équipement ?</h2>
          <p className="lp-lede" style={{ fontSize: 15, marginTop: 12, marginBottom: 28, maxWidth: 640 }}>
            Chaque type d&apos;équipement a son financement idéal. Voici les associations recommandées pour votre secteur.
          </p>
          <div className="mk-fit">
            {sector.solutionFit.map((f, i) => {
              const sol = getSolution(f.solutionSlug)
              if (!sol) return null
              return (
                <div key={i} className="card mk-fit__card">
                  <div className="mk-fit__equip">{f.equipment}</div>
                  <div className="mk-fit__arrow">recommandé&nbsp;:</div>
                  <Link href={`/solutions/${sol.slug}`} className="mk-fit__sol">
                    {sol.name} <IconArrowRight size={13} />
                  </Link>
                  <p className="mk-fit__why">{f.why}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Indicative examples */}
      <section className="lp-section">
        <div className="lp-wrap">
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Exemples de financement</h2>
          <div className="mk-examples">
            {sector.examples.map((ex, i) => (
              <div key={i} className="card mk-example">
                <div className="mk-example__label">{ex.label}</div>
                <div className="mk-example__total">{ex.total} financés</div>
                <div className="mk-example__monthly">{ex.monthly}<span> / mois</span></div>
                <div className="mk-example__dur">sur {ex.duration}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 16 }}>
            Estimations indicatives, hors assurance et services, à titre d&apos;exemple. Votre offre est confirmée par nos partenaires financeurs sous 48h ouvrées.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Comparer les solutions de financement</h2>
          <p className="lp-lede" style={{ fontSize: 15, marginTop: 12, marginBottom: 24, maxWidth: 640 }}>
            Les différences entre location financière, crédit-bail, LLD, LOA et lease-back en un coup d&apos;œil.
          </p>
          <ComparisonTable />
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="mk-measure--sm">
            <h2 className="lp-h2" style={{ fontSize: 26 }}>Questions fréquentes</h2>
            <div className="mk-faq">
              {sector.faq.map((f, i) => (
                <details key={i} className="mk-faq__item" open={i === 0}>
                  <summary className="mk-faq__q">{f.q}</summary>
                  <p className="mk-faq__a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ambiance photo band */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <ImageSlot photo={sector.photos.ambiance} src={`/secteurs/${sector.slug}-ambiance.jpg`} ratio="21 / 9" />
        </div>
      </section>

      {/* Related + CTA */}
      <section className="lp-section--tight" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <div className="mk-related">
            <div className="mk-related__label">Autres secteurs</div>
            <div className="mk-related__row">
              {related.map((r) => (
                <Link key={r.slug} href={`/secteurs/${r.slug}`} className="card mk-related__card">
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <IconArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
          <div className="mk-cta-center">
            <h2 className="lp-h2">Équipez votre activité dès aujourd&apos;hui.</h2>
            <p className="lp-lede" style={{ margin: '14px auto 0', maxWidth: 480 }}>
              Déposez un devis : Everlease analyse votre besoin et met en concurrence ses partenaires pour vous proposer la meilleure offre.
            </p>
            <div className="lp-cta-row" style={{ marginTop: 28, justifyContent: 'center' }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Financer un équipement <IconArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
