// Renders a "money" pillar page (head-term landing) from a Pillar data object.
// Structure: hero + value props + rich prose body + Solutions grid + audience
// teaser (secteurs/métiers) + FAQ + cross-links + CTA. Heavy internal linking
// is the point: these pages consolidate and distribute authority across the silo.
import Link from 'next/link'
import { SparkleGlyph, IconArrowRight } from '@/components/landing/icons'
import { CONTACT_EMAIL } from '@/lib/seo/site'
import type { Pillar } from '@/lib/seo/pillars'
import { SOLUTIONS } from '@/lib/seo/solutions'
import Breadcrumbs from './Breadcrumbs'
import ProseBlocks from './ProseBlocks'

export default function PillarView({ pillar }: { pillar: Pillar }) {
  return (
    <main>
      {/* Hero */}
      <header className="lp-section" style={{ paddingBottom: 32 }}>
        <div className="lp-wrap">
          <div className="mk-measure">
            <Breadcrumbs items={[{ name: 'Accueil', path: '/' }, { name: pillar.kicker }]} />
            <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> {pillar.kicker}</span>
            <h1 className="lp-h1" style={{ fontSize: 40, marginTop: 18 }}>{pillar.h1}</h1>
            <p className="lp-lede" style={{ fontSize: 18, marginTop: 18 }}>{pillar.standfirst}</p>
            <div className="lp-cta-row" style={{ marginTop: 28, justifyContent: 'flex-start' }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Estimer mon financement <IconArrowRight /></Link>
              <a className="btn btn--secondary btn--lg" href={`mailto:${CONTACT_EMAIL}`}>Parler à un expert</a>
            </div>
          </div>
        </div>
      </header>

      {/* Value props */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="mk-hubgrid">
            {pillar.valueProps.map((v) => (
              <div key={v.title} className="card mk-hubcard">
                <h2 className="mk-hubcard__title" style={{ fontSize: 19 }}>{v.title}</h2>
                <p className="mk-hubcard__body" style={{ marginBottom: 0 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Body prose */}
      <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <div className="mk-article__body" style={{ maxWidth: 820 }}>
            <ProseBlocks blocks={pillar.body} />
          </div>
        </div>
      </section>

      {/* Solutions grid */}
      {pillar.showSolutions && (
        <section className="lp-section">
          <div className="lp-wrap">
            <h2 className="lp-h2" style={{ fontSize: 26 }}>Les solutions de financement</h2>
            <p className="lp-lede" style={{ fontSize: 15, marginTop: 12, marginBottom: 24, maxWidth: 640 }}>
              Chaque formule répond à un besoin. Comparez-les et choisissez celle qui colle à votre matériel.
            </p>
            <div className="mk-hubgrid">
              {SOLUTIONS.map((s) => (
                <Link key={s.slug} href={`/solutions/${s.slug}`} className="card mk-hubcard">
                  <h3 className="mk-hubcard__title" style={{ fontSize: 19 }}>{s.name}</h3>
                  <p className="mk-hubcard__body">{s.tagline}</p>
                  <span className="mk-hubcard__cta">Voir la solution <IconArrowRight size={13} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Audiences teaser (secteurs + métiers) */}
      {pillar.showAudiences && (
        <section className="lp-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="lp-wrap">
            <h2 className="lp-h2" style={{ fontSize: 26 }}>Un financement adapté à votre activité</h2>
            <div className="mk-related__row" style={{ marginTop: 20 }}>
              <Link href="/secteurs" className="card mk-related__card">
                <span style={{ fontWeight: 600 }}>Financement par secteur</span>
                <IconArrowRight size={14} />
              </Link>
              <Link href="/metiers" className="card mk-related__card">
                <span style={{ fontWeight: 600 }}>Financement par métier</span>
                <IconArrowRight size={14} />
              </Link>
              <Link href="/blog" className="card mk-related__card">
                <span style={{ fontWeight: 600 }}>Guides & comparatifs</span>
                <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {pillar.faq.length > 0 && (
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="mk-measure--sm">
              <h2 className="lp-h2" style={{ fontSize: 26 }}>Questions fréquentes</h2>
              <div className="mk-faq">
                {pillar.faq.map((f, i) => (
                  <details key={i} className="mk-faq__item" open={i === 0}>
                    <summary className="mk-faq__q">{f.q}</summary>
                    <p className="mk-faq__a">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related + CTA */}
      <section className="lp-section--tight" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          {pillar.related.length > 0 && (
            <div className="mk-related">
              <div className="mk-related__label">À voir aussi</div>
              <div className="mk-related__row">
                {pillar.related.map((r) => (
                  <Link key={r.href} href={r.href} className="card mk-related__card">
                    <span style={{ fontWeight: 600 }}>{r.label}</span>
                    <IconArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="mk-cta-center">
            <h2 className="lp-h2">Estimez votre financement en quelques minutes.</h2>
            <p className="lp-lede" style={{ margin: '14px auto 0', maxWidth: 500 }}>
              Déposez votre devis : everlease prépare un seul dossier et le présente à des financeurs adaptés. Un conseiller vous rappelle sous 24 h ouvrées.
            </p>
            <div className="lp-cta-row" style={{ marginTop: 28, justifyContent: 'center' }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Financer un équipement <IconArrowRight /></Link>
            </div>
            <p className="mk-legal" style={{ marginTop: 18 }}>Sous réserve d&apos;acceptation du dossier par le financeur.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
