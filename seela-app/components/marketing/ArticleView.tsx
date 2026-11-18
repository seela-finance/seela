// Renders a full blog article from an Article data object. The SEO/GEO
// structure (breadcrumb, H1, answer-first standfirst, H2 sections, FAQ,
// internal links, CTA) is identical across articles; only the data differs.
//
// Layout follows the marketing convention: full-width `.lp-wrap` left gutter,
// prose capped with `.mk-measure` but LEFT-aligned. Article-specific styling
// lives under `.mk-article*` / `.mk-blog*` in app/landing.css.
import React from 'react'
import Link from 'next/link'
import { SparkleGlyph, IconArrowRight, IconCalendar, IconClock } from '@/components/landing/icons'
import { CONTACT_EMAIL } from '@/lib/seo/site'
import type { Article } from '@/lib/seo/blog'
import { getArticle } from '@/lib/seo/blog'
import { getSolution } from '@/lib/seo/solutions'
import { getSector } from '@/lib/seo/sectors'
import Breadcrumbs from './Breadcrumbs'

/** Slugify an H2 text into a stable anchor id for the table of contents. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Parse a minimal inline markup: `[label](/path)` links and `**bold**`. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Alternate between links and the rest; handle bold inside the rest.
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) nodes.push(...renderBold(text.slice(last, m.index), key++))
    const [, label, href] = m
    nodes.push(
      href.startsWith('/') ? (
        <Link key={`l${key++}`} href={href} className="mk-article__link">{label}</Link>
      ) : (
        <a key={`l${key++}`} href={href} className="mk-article__link" rel="noopener">{label}</a>
      ),
    )
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(...renderBold(text.slice(last), key++))
  return nodes
}

function renderBold(text: string, baseKey: number): React.ReactNode[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={`b${baseKey}-${i}`}>{part}</strong> : <React.Fragment key={`t${baseKey}-${i}`}>{part}</React.Fragment>,
  )
}

export default function ArticleView({ article }: { article: Article }) {
  const tocItems = article.body
    .filter((b): b is { type: 'h2'; text: string } => b.type === 'h2')
    .map((b) => ({ id: headingId(b.text), text: b.text }))

  const relSolutions = article.relatedSolutions.map(getSolution).filter(Boolean)
  const relSectors = article.relatedSectors.map(getSector).filter(Boolean)
  const relArticles = article.relatedArticles.map(getArticle).filter(Boolean) as Article[]

  const dateLabel = new Date(article.dateModified).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <main>
      {/* Hero */}
      <header className="lp-section" style={{ paddingBottom: 24 }}>
        <div className="lp-wrap">
          <div className="mk-measure">
            <Breadcrumbs items={[
              { name: 'Accueil', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: article.nav },
            ]} />
            <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> {article.kicker}</span>
            <h1 className="lp-h1" style={{ fontSize: 38, marginTop: 16 }}>{article.title}</h1>
            <p className="lp-lede" style={{ fontSize: 18, marginTop: 18 }}>{article.standfirst}</p>
            <div className="mk-article__meta" aria-label="Informations article">
              <span className="mk-article__metaitem"><IconCalendar size={14} /> Mis à jour le {dateLabel}</span>
              <span className="mk-article__metaitem"><IconClock size={14} /> {article.readingMinutes} min de lecture</span>
            </div>
          </div>
        </div>
      </header>

      <section className="lp-section" style={{ paddingTop: 8 }}>
        <div className="lp-wrap mk-article__layout">
          {/* Table of contents */}
          {tocItems.length > 2 && (
            <aside className="mk-article__toc" aria-label="Sommaire">
              <div className="mk-article__toclabel">Sommaire</div>
              <nav>
                {tocItems.map((t) => (
                  <a key={t.id} href={`#${t.id}`} className="mk-article__toclink">{t.text}</a>
                ))}
              </nav>
            </aside>
          )}

          {/* Body */}
          <article className="mk-article__body">
            {article.body.map((block, i) => {
              switch (block.type) {
                case 'h2':
                  return <h2 key={i} id={headingId(block.text)} className="mk-article__h2">{block.text}</h2>
                case 'h3':
                  return <h3 key={i} className="mk-article__h3">{block.text}</h3>
                case 'p':
                  return <p key={i} className="mk-article__p">{renderInline(block.text)}</p>
                case 'ul':
                  return (
                    <ul key={i} className="mk-article__ul">
                      {block.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
                    </ul>
                  )
                case 'callout':
                  return (
                    <div key={i} className="mk-article__callout card">
                      {block.title && <div className="mk-article__calltitle">{block.title}</div>}
                      <p className="mk-article__callbody">{renderInline(block.text)}</p>
                    </div>
                  )
                case 'table':
                  return (
                    <div key={i} className="mk-table__wrap">
                      <table className="mk-table">
                        {block.caption && <caption className="mk-article__tablecap">{block.caption}</caption>}
                        <thead>
                          <tr>{block.head.map((h, j) => <th key={j} scope="col">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row, r) => (
                            <tr key={r}>
                              {row.map((cell, c) => (
                                c === 0
                                  ? <th key={c} scope="row" className="mk-table__rowhead">{renderInline(cell)}</th>
                                  : <td key={c}>{renderInline(cell)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                default:
                  return null
              }
            })}
          </article>
        </div>
      </section>

      {/* FAQ */}
      {article.faq.length > 0 && (
        <section className="lp-section" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="mk-measure--sm">
              <h2 className="lp-h2" style={{ fontSize: 26 }}>Questions fréquentes</h2>
              <div className="mk-faq">
                {article.faq.map((f, i) => (
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

      {/* Related internal links (maillage) */}
      {(relSolutions.length > 0 || relSectors.length > 0 || relArticles.length > 0) && (
        <section className="lp-section" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            {relSolutions.length > 0 && (
              <div className="mk-related" style={{ marginBottom: 28 }}>
                <div className="mk-related__label">Solutions de financement citées</div>
                <div className="mk-related__row">
                  {relSolutions.map((s) => (
                    <Link key={s!.slug} href={`/solutions/${s!.slug}`} className="card mk-related__card">
                      <span style={{ fontWeight: 600 }}>{s!.name}</span>
                      <IconArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {relSectors.length > 0 && (
              <div className="mk-related" style={{ marginBottom: 28 }}>
                <div className="mk-related__label">Secteurs concernés</div>
                <div className="mk-related__row">
                  {relSectors.map((s) => (
                    <Link key={s!.slug} href={`/secteurs/${s!.slug}`} className="card mk-related__card">
                      <span style={{ fontWeight: 600 }}>{s!.name}</span>
                      <IconArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {relArticles.length > 0 && (
              <div className="mk-related">
                <div className="mk-related__label">À lire aussi</div>
                <div className="mk-related__row">
                  {relArticles.map((a) => (
                    <Link key={a.slug} href={`/blog/${a.slug}`} className="card mk-related__card">
                      <span style={{ fontWeight: 600 }}>{a.nav}</span>
                      <IconArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="lp-section--tight" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="lp-wrap">
          <div className="mk-cta-center">
            <h2 className="lp-h2">Un projet d’équipement à financer ?</h2>
            <p className="lp-lede" style={{ margin: '14px auto 0', maxWidth: 500 }}>
              Déposez votre devis : everlease prépare un seul dossier et le présente à des financeurs adaptés à votre projet. Un conseiller vous rappelle sous 24 h ouvrées.
            </p>
            <div className="lp-cta-row" style={{ marginTop: 28, justifyContent: 'center' }}>
              <Link className="btn btn--accent btn--lg" href="/auth">Estimer mon financement <IconArrowRight /></Link>
              <a className="btn btn--secondary btn--lg" href={`mailto:${CONTACT_EMAIL}`}>Parler à un expert</a>
            </div>
            <p className="mk-legal" style={{ marginTop: 18 }}>Sous réserve d&apos;acceptation du dossier par le financeur.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
