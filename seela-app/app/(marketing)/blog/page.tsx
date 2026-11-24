import type { Metadata } from 'next'
import Link from 'next/link'
import { SparkleGlyph, IconArrowRight, IconClock } from '@/components/landing/icons'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import { JsonLd, breadcrumbSchema } from '@/lib/seo/jsonld'
import { absoluteUrl } from '@/lib/seo/site'
import { PILLARS, articlesByPillar, publishedArticles } from '@/lib/seo/blog'

export const metadata: Metadata = {
  title: 'Blog — Guides du financement locatif professionnel',
  description:
    "Crédit-bail, LLD, location financière, lease-back : nos guides pour comprendre, comparer et financer vos équipements professionnels. Conseils concrets, exemples chiffrés.",
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — Guides du financement locatif professionnel',
    description:
      "Comprendre, comparer et financer vos équipements professionnels : nos guides sur le crédit-bail, la LLD, la location financière et le lease-back.",
    url: '/blog',
  },
}

function blogSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog Everlease',
    url: absoluteUrl('/blog'),
    blogPost: publishedArticles().map((a) => ({
      '@type': 'BlogPosting',
      headline: a.metaTitle,
      url: absoluteUrl(`/blog/${a.slug}`),
      datePublished: a.datePublished,
      dateModified: a.dateModified,
    })),
  }
}

export default function BlogHub() {
  const pillars = PILLARS.map((p) => ({ pillar: p, articles: articlesByPillar(p.slug) }))
    .filter((group) => group.articles.length > 0)

  return (
    <>
      <JsonLd data={blogSchema()} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Blog', path: '/blog' },
      ])} />

      <main>
        <header className="lp-section" style={{ paddingBottom: 32 }}>
          <div className="lp-wrap">
            <div className="mk-measure">
              <Breadcrumbs items={[{ name: 'Accueil', path: '/' }, { name: 'Blog' }]} />
              <span className="lp-eyebrow" style={{ marginTop: 18 }}><SparkleGlyph size={12} /> Ressources</span>
              <h1 className="lp-h1" style={{ fontSize: 40, marginTop: 18 }}>Comprendre et financer vos équipements</h1>
              <p className="lp-lede" style={{ fontSize: 18, marginTop: 18, maxWidth: 660 }}>
                Des guides concrets pour choisir le bon financement locatif — crédit-bail, LLD, location financière, lease-back — et équiper votre entreprise sans immobiliser votre trésorerie.
              </p>
            </div>
          </div>
        </header>

        {pillars.map(({ pillar, articles }) => (
          <section key={pillar.slug} className="lp-section" style={{ paddingTop: 0 }}>
            <div className="lp-wrap">
              <div className="mk-section-head">
                <h2 className="lp-h2" style={{ fontSize: 26 }}>{pillar.title}</h2>
                <p className="lp-lede" style={{ fontSize: 15, marginTop: 10, maxWidth: 620 }}>{pillar.description}</p>
              </div>
              <div className="mk-hubgrid" style={{ marginTop: 22 }}>
                {articles.map((a) => (
                  <Link key={a.slug} href={`/blog/${a.slug}`} className="card mk-hubcard">
                    <span className="mk-blog__kicker">{a.kicker}</span>
                    <h3 className="mk-hubcard__title" style={{ fontSize: 20 }}>{a.title}</h3>
                    <p className="mk-hubcard__body">{a.excerpt}</p>
                    <span className="mk-hubcard__cta">
                      Lire l&apos;article <IconArrowRight size={13} />
                      <span className="mk-blog__read"><IconClock size={12} /> {a.readingMinutes} min</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="lp-section--tight">
          <div className="lp-wrap">
          <div className="mk-cta-center" style={{ marginTop: 0 }}>
            <h2 className="lp-h2">Prêt à financer votre équipement ?</h2>
            <p className="lp-lede" style={{ margin: '14px auto 0', maxWidth: 460 }}>
              Déposez un devis : un seul dossier, présenté à des financeurs adaptés à votre projet.
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
