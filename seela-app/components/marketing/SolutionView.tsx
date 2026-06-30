// Renders a full solution page from a Solution data object. The SEO/GEO
// structure (H1, answer-first intro, steps, pros/cons, comparison, FAQ,
// internal links) is identical across pages; only the data differs.
import Link from 'next/link'
import {
  SparkleGlyph, IconArrowRight, IconCheckSm, IconClose,
} from '@/components/landing/icons'
import { CONTACT_EMAIL } from '@/lib/seo/site'
import { getSolution, type Solution } from '@/lib/seo/solutions'
import Breadcrumbs from './Breadcrumbs'
import ComparisonTable from './ComparisonTable'

export default function SolutionView({ solution }: { solution: Solution }) {
  const related = solution.related.map(getSolution).filter(Boolean) as Solution[]

  return (
    <main>
      {/* Hero */}
      <header className="lp-section" style={{ paddingBottom: 40 }}>
        <div className="lp-wrap" style={{ maxWidth: 820 }}>
          <Breadcrumbs items={[
            { name: 'Accueil', path: '/' },
            { name: 'Solutions', path: '/solutions' },
            { name: solution.name },
          ]} />
          <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> Solution de financement</span>
          <h1 className="lp-h1" style={{ fontSize: 40, marginTop: 18 }}>{solution.h1}</h1>
          <p className="lp-lede" style={{ fontSize: 18, marginTop: 18, maxWidth: 680 }}>{solution.tagline}</p>
          <div className="lp-cta-row" style={{ marginTop: 28 }}>
            <Link className="btn btn--accent btn--lg" href="/auth">Estimer mon financement <IconArrowRight /></Link>
            <a className="btn btn--secondary btn--lg" href={`mailto:${CONTACT_EMAIL}`}>Parler à un expert</a>
          </div>
        </div>
      </header>

      {/* Answer-first definition (GEO extract) + quick facts */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap mk-split">
          <div className="mk-split__main">
            <h2 className="lp-h2" style={{ fontSize: 26 }}>{solution.name} : définition</h2>
            <p className="lp-lede" style={{ fontSize: 16, marginTop: 16 }}>{solution.definition}</p>
          </div>
          <aside className="card mk-facts" aria-label="Repères clés">
            <div className="mk-facts__title">En bref</div>
            {solution.facts.map((f) => (
              <div key={f.label} className="mk-facts__row">
                <span className="mk-facts__label">{f.label}</span>
                <span className="mk-facts__value">{f.value}</span>
              </div>
            ))}
          </aside>
        </div>
      </section>

      {/* How it works */}
      <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap" style={{ maxWidth: 920 }}>
          <h2 className="lp-h2" style={{ fontSize: 26 }}>{solution.name} : comment ça fonctionne ?</h2>
          <div className="mk-steps">
            {solution.howItWorks.map((step, i) => (
              <div key={i} className="mk-step">
                <div className="mk-step__num">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="mk-step__title">{step.title}</h3>
                <p className="mk-step__body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pros / cons */}
      <section className="lp-section">
        <div className="lp-wrap" style={{ maxWidth: 920 }}>
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Avantages et points d&apos;attention</h2>
          <div className="mk-proscons">
            <div className="card mk-pc">
              <div className="mk-pc__head mk-pc__head--pro">Avantages</div>
              {solution.pros.map((p, i) => (
                <div key={i} className="mk-pc__row">
                  <span className="mk-pc__ic mk-pc__ic--pro"><IconCheckSm size={11} /></span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
            <div className="card mk-pc">
              <div className="mk-pc__head mk-pc__head--con">Points d&apos;attention</div>
              {solution.cons.map((c, i) => (
                <div key={i} className="mk-pc__row">
                  <span className="mk-pc__ic mk-pc__ic--con"><IconClose size={11} /></span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Best for */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap" style={{ maxWidth: 920 }}>
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Pour qui ?</h2>
          <div className="mk-bestfor">
            {solution.bestFor.map((b, i) => (
              <div key={i} className="mk-bestfor__item">
                <span className="mk-pc__ic mk-pc__ic--pro"><IconCheckSm size={11} /></span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <h2 className="lp-h2" style={{ fontSize: 26 }}>{solution.name} vs autres financements</h2>
          <p className="lp-lede" style={{ fontSize: 15, marginTop: 12, marginBottom: 24, maxWidth: 640 }}>
            Comparez {solution.name.toLowerCase()} aux autres modes de financement locatif d&apos;équipement.
          </p>
          <ComparisonTable highlight={solution.slug} />
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <div className="lp-wrap" style={{ maxWidth: 760 }}>
          <h2 className="lp-h2" style={{ fontSize: 26 }}>Questions fréquentes</h2>
          <div className="mk-faq">
            {solution.faq.map((f, i) => (
              <details key={i} className="mk-faq__item" open={i === 0}>
                <summary className="mk-faq__q">{f.q}</summary>
                <p className="mk-faq__a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related + CTA */}
      <section className="lp-section--tight" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="lp-wrap" style={{ maxWidth: 920 }}>
          <div className="mk-related">
            <div className="mk-related__label">Autres solutions de financement</div>
            <div className="mk-related__row">
              {related.map((r) => (
                <Link key={r.slug} href={`/solutions/${r.slug}`} className="card mk-related__card">
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <IconArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <h2 className="lp-h2">Estimez votre financement en quelques minutes.</h2>
            <p className="lp-lede" style={{ margin: '14px auto 0', maxWidth: 480 }}>
              Déposez un devis, comparez les offres de nos partenaires financeurs, recevez une estimation sous 48h.
            </p>
            <div className="lp-cta-row" style={{ marginTop: 28 }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Financer un équipement <IconArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
