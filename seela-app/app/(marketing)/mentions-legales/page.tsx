import type { Metadata } from 'next'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: `Mentions légales du site everlease.fr (${SITE_NAME}).`,
  alternates: { canonical: '/mentions-legales' },
}

export default function MentionsLegales() {
  return (
    <main>
      <header className="lp-section" style={{ paddingBottom: 24 }}>
        <div className="lp-wrap">
          <div className="mk-measure">
            <Breadcrumbs items={[{ name: 'Accueil', path: '/' }, { name: 'Mentions légales' }]} />
            <h1 className="lp-h1" style={{ fontSize: 36, marginTop: 18 }}>Mentions légales</h1>
          </div>
        </div>
      </header>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="mk-measure mk-article__body">
            <h2 className="mk-article__h2">Éditeur du site</h2>
            <p className="mk-article__p">
              Le site everlease.fr est édité par une société à responsabilité limitée au capital de 1&nbsp;000&nbsp;€,
              immatriculée au RCS de Paris sous le numéro 944&nbsp;710&nbsp;367.
            </p>
            <ul className="mk-article__ul">
              <li>Siège social : 78 avenue des Champs-Élysées, 75008 Paris</li>
              <li>Contact : {CONTACT_EMAIL}</li>
            </ul>

            <h2 className="mk-article__h2">Hébergement</h2>
            <p className="mk-article__p">
              Le site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.
              Les données applicatives sont hébergées par Supabase (infrastructure située dans l&apos;Union européenne).
            </p>

            <h2 className="mk-article__h2">Propriété intellectuelle</h2>
            <p className="mk-article__p">
              L&apos;ensemble des contenus de ce site (textes, visuels, logo, marque {SITE_NAME}) est protégé par le droit
              de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans autorisation
              écrite préalable est interdite.
            </p>

            <h2 className="mk-article__h2">Données personnelles</h2>
            <p className="mk-article__p">
              Les modalités de traitement de vos données personnelles sont décrites dans notre{' '}
              <a className="mk-article__link" href="/confidentialite">politique de confidentialité</a>.
            </p>

            <h2 className="mk-article__h2">Responsabilité</h2>
            <p className="mk-article__p">
              Les informations financières présentées sur ce site (loyers, exemples de mensualités) sont des exemples
              illustratifs, donnés hors assurance et services. Tout financement est soumis à l&apos;acceptation du dossier
              par le financeur, qui fixe seul ses conditions. {SITE_NAME} présente les dossiers à des partenaires financeurs
              mais n&apos;octroie pas directement de financement.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
