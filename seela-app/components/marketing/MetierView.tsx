// Renders a full métier page from a Metier data object. Same SEO/GEO structure
// as the sector pages (answer-first intro, equipment kit, solution×équipement
// mapping, illustrative example, FAQ) but trade-granular, photo-free, and it
// links UP to its parent sector so the maillage stays coherent.
import Link from 'next/link'
import { SparkleGlyph, IconArrowRight } from '@/components/landing/icons'
import { getSolution } from '@/lib/seo/solutions'
import { getSector } from '@/lib/seo/sectors'
import { getMetier, type Metier } from '@/lib/seo/metiers'
import Breadcrumbs from './Breadcrumbs'
import ComparisonTable from './ComparisonTable'
import CallbackSection from './CallbackSection'

export default function MetierView({ metier }: { metier: Metier }) {
  const parent = getSector(metier.parentSectorSlug)
  const relatedMetiers = metier.relatedMetiers.map(getMetier).filter(Boolean) as Metier[]
  const relatedSolutions = metier.relatedSolutions.map(getSolution).filter(Boolean)

  return (
    <main>
      {/* Hero */}
      <header className="lp-section" style={{ paddingBottom: 32 }}>
        <div className="lp-wrap">
          <div className="mk-measure">
            <Breadcrumbs items={[
              { name: 'Accueil', path: '/' },
              { name: 'Métiers', path: '/metiers' },
              { name: metier.nav },
            ]} />
            <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> Financement par métier</span>
            <h1 className="lp-h1" style={{ fontSize: 38, marginTop: 18 }}>{metier.h1}</h1>
            <p className="lp-lede" style={{ fontSize: 18, marginTop: 18 }}>{metier.tagline}</p>
            <div className="lp-cta-row" style={{ marginTop: 28, justifyContent: 'flex-start' }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Estimer mon financement <IconArrowRight /></Link>
              <a className="btn btn--secondary btn--lg" href="#rappel">Parler à un expert</a>
            </div>
          </div>
        </div>
      </header>

      {/* Intro (answer-first) */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <p className="lp-lede" style={{ fontSize: 17, maxWidth: 820 }}>{metier.intro}</p>
        </div>
      </section>

      {/* Equipment financed */}
      <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Quel matériel financer ?</h2>
          <div className="mk-eqgrid2">
            {metier.equipment.map((e) => (
              <div key={e.category} className="card mk-eqcard">
                <div className="mk-eqcard__cat">{e.category}</div>
                <div className="mk-eqcard__ex">{e.examples}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution × équipement mapping */}
      <section className="lp-section">
        <div className="lp-wrap">
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Quel financement pour quel équipement ?</h2>
          <p className="lp-lede" style={{ fontSize: 15, marginTop: 12, marginBottom: 28, maxWidth: 640 }}>
            Chaque type de matériel a son financement idéal. Voici les associations recommandées pour votre activité.
          </p>
          <div className="mk-fit">
            {metier.solutionFit.map((f, i) => {
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

      {/* Indicative example */}
      <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <div className="mk-section-head">
            <h2 className="lp-h2" style={{ fontSize: 26 }}>Exemple de financement</h2>
            <span className="badge badge--accent">Exemple illustratif</span>
          </div>
          <div className="mk-examples">
            <div className="card mk-example">
              <div className="mk-example__label">{metier.example.label}</div>
              <div className="mk-example__total"><span className="mono">{metier.example.total}</span> financés</div>
              <div className="mk-example__monthly">{metier.example.monthly}<span> / mois</span></div>
              <div className="mk-example__dur">sur {metier.example.duration}</div>
            </div>
          </div>
          <p className="mk-legal" style={{ marginTop: 16 }}>
            Exemple illustratif. Montant HT, hors assurance et services. Sous réserve d&apos;acceptation du dossier par le financeur.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="lp-section">
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
              {metier.faq.map((f, i) => (
                <details key={i} className="mk-faq__item" open={i === 0}>
                  <summary className="mk-faq__q">{f.q}</summary>
                  <p className="mk-faq__a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Related + CTA */}
      <section className="lp-section--tight" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          {parent && (
            <div className="mk-related" style={{ marginBottom: relatedMetiers.length || relatedSolutions.length ? 28 : 0 }}>
              <div className="mk-related__label">Secteur</div>
              <div className="mk-related__row">
                <Link href={`/secteurs/${parent.slug}`} className="card mk-related__card">
                  <span style={{ fontWeight: 600 }}>{parent.name}</span>
                  <IconArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
          {relatedSolutions.length > 0 && (
            <div className="mk-related" style={{ marginBottom: relatedMetiers.length ? 28 : 0 }}>
              <div className="mk-related__label">Solutions adaptées</div>
              <div className="mk-related__row">
                {relatedSolutions.map((s) => (
                  <Link key={s!.slug} href={`/solutions/${s!.slug}`} className="card mk-related__card">
                    <span style={{ fontWeight: 600 }}>{s!.name}</span>
                    <IconArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          {relatedMetiers.length > 0 && (
            <div className="mk-related">
              <div className="mk-related__label">Autres métiers</div>
              <div className="mk-related__row">
                {relatedMetiers.map((m) => (
                  <Link key={m.slug} href={`/metiers/${m.slug}`} className="card mk-related__card">
                    <span style={{ fontWeight: 600 }}>{m.nav}</span>
                    <IconArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          <CallbackSection
            title="Équipez votre activité dès aujourd'hui."
            lede="Déposez un devis : everlease prépare votre dossier et le présente à des financeurs adaptés à votre métier."
            cta="Financer un équipement"
            origine={`Page métier · ${metier.nav}`}
          />
        </div>
      </section>
    </main>
  )
}
