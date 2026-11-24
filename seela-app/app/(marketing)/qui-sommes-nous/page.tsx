import type { Metadata } from 'next'
import Link from 'next/link'
import { BtnGauge } from '@/components/landing/Gauge'
import { IconCheck } from '@/components/landing/icons'
import { JsonLd, breadcrumbSchema, organizationSchema } from '@/lib/seo/jsonld'

// Page « Qui sommes-nous » — portée du canvas Design « Home everlease ·
// exploration design » (24/11/2026). Le parcours de l'équipe sans nommer les
// sociétés précédentes ni les personnes, pas de chiffres en gros : deux faits
// seulement (plus de 10 ans, plus de 2 000 entreprises équipées).
const TITLE = 'Qui sommes-nous : dix ans à financer des équipements'
const DESCRIPTION =
  "Everlease est fondé par une équipe qui finance des équipements professionnels depuis plus de dix ans. Notre parcours, ce que nous croyons, et ce que nous faisons pour votre dossier."
const PATH = '/qui-sommes-nous'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH },
}

export default function AboutPage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Qui sommes-nous', path: PATH },
      ])} />

      <main>
        <header className="ab-hero">
          <div className="wrap">
            <div className="kicker">Qui sommes-nous</div>
            <h1 className="display h1">Dix ans à financer des équipements.</h1>

            <div className="ab-story">
              <div>
                <div className="kicker">Notre parcours</div>
                <h2 className="display hm-h2" style={{ marginTop: 14 }}>Nous connaissons le dossier des deux côtés.</h2>
                <ul className="ab-facts">
                  <li><IconCheck size={16} /><span><strong>Plus de 10 ans</strong> d&apos;expérience du financement locatif</span></li>
                  <li><IconCheck size={16} /><span><strong>Plus de 2&nbsp;000 entreprises</strong> équipées</span></li>
                </ul>
              </div>
              <div className="ab-text">
                <p className="ab-lead">Everlease est né d&apos;une conviction&nbsp;: financer un équipement devrait être aussi simple que signer son devis.</p>
                <p>Avant everlease, nous avons construit une société de location d&apos;équipements pour les entreprises. Elle a grandi, s&apos;est rapprochée d&apos;un loueur indépendant, puis a été cédée.</p>
                <p>Pendant ces années, nous avons monté des dossiers, et nous en avons instruit. Nous savons ce qu&apos;un financeur regarde, ce qui le fait hésiter et ce qui le décide.</p>
                <p>Nous avons aussi vu ce que cela coûte à une entreprise&nbsp;: des pièces à réunir plusieurs fois, des semaines d&apos;attente, une seule proposition sur la table. Everlease retire ce travail-là.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="sec hm-band">
          <div className="wrap">
            <div className="kicker">Ce que nous croyons</div>
            <h2 className="display hm-h2" style={{ marginTop: 14, maxWidth: 820 }}>La technologie retire la paperasse. Le métier ne se remplace pas.</h2>
            <div className="ab-beliefs">
              <div>
                <div className="n">01</div>
                <h3>Un équipement se paie avec ce qu&apos;il rapporte.</h3>
                <p>Un four, une machine ou un véhicule produisent chaque mois. Leur coût devrait suivre le même rythme.</p>
              </div>
              <div>
                <div className="n">02</div>
                <h3>Un dossier bien préparé est à moitié accepté.</h3>
                <p>L&apos;IA lit, trie et rassemble. Notre équipe relit et choisit à qui présenter. Rien ne part sans relecture.</p>
              </div>
              <div>
                <div className="n">03</div>
                <h3>La décision appartient au financeur.</h3>
                <p>Nous ne promettons ni accord ni délai à sa place. Nous vous disons où en est votre dossier, à chaque étape.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="ab-final">
          <div className="wrap">
            <div className="stage stage--dark hm-final__in">
              <h2 className="display hm-final__t" style={{ fontSize: 'clamp(32px, 4.4vw, 60px)' }}>
                <span style={{ display: 'block' }}>Parlons de votre</span>
                <span style={{ display: 'block' }}>prochain équipement.</span>
              </h2>
              <div>
                <div className="cta-row" style={{ marginTop: 0 }}>
                  <Link className="btn btn--light" href="/auth"><BtnGauge />Déposer un devis</Link>
                  <Link className="btn btn--outline-light" href="/#comment">Voir comment ça marche</Link>
                </div>
                <p className="small" style={{ margin: '16px 0 0', color: 'var(--dark-muted)' }}>Notre équipe vous rappelle sous 24&nbsp;h ouvrées. Sous réserve d&apos;acceptation du dossier par le financeur.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
