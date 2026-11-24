import type { Metadata } from 'next'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: `Comment ${SITE_NAME} collecte, utilise et protège vos données personnelles.`,
  alternates: { canonical: '/confidentialite' },
}

export default function Confidentialite() {
  return (
    <main>
      <header className="lp-section" style={{ paddingBottom: 24 }}>
        <div className="lp-wrap">
          <div className="mk-measure">
            <Breadcrumbs items={[{ name: 'Accueil', path: '/' }, { name: 'Confidentialité' }]} />
            <h1 className="lp-h1" style={{ fontSize: 36, marginTop: 18 }}>Politique de confidentialité</h1>
            <p className="lp-lede" style={{ fontSize: 17, marginTop: 16 }}>
              Cette politique décrit les données que {SITE_NAME} collecte, pourquoi, et les droits dont vous disposez.
            </p>
          </div>
        </div>
      </header>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="mk-measure mk-article__body">
            <h2 className="mk-article__h2">Données collectées</h2>
            <p className="mk-article__p">
              Lorsque vous créez un compte et déposez une demande de financement, nous collectons : vos coordonnées
              (nom, e-mail), les informations de votre entreprise (raison sociale, SIREN), les documents que vous
              téléversez (devis, factures) et les informations nécessaires à l&apos;étude de votre demande (équipements,
              durée, éléments déclaratifs de votre situation).
            </p>

            <h2 className="mk-article__h2">Finalités du traitement</h2>
            <ul className="mk-article__ul">
              <li>Analyser votre demande et préparer votre dossier de financement.</li>
              <li>Présenter votre dossier à des partenaires financeurs adaptés à votre projet.</li>
              <li>Vous recontacter au sujet de votre demande (notamment le rappel par un conseiller).</li>
              <li>Assurer le bon fonctionnement, la sécurité et l&apos;amélioration du service.</li>
            </ul>

            <h2 className="mk-article__h2">Analyse des documents</h2>
            <p className="mk-article__p">
              Les documents que vous téléversez sont analysés automatiquement afin d&apos;en extraire les lignes
              d&apos;équipements. Cette analyse s&apos;appuie sur la technologie d&apos;Anthropic (Claude). Les documents
              ne sont pas utilisés pour entraîner des modèles.
            </p>

            <h2 className="mk-article__h2">Destinataires</h2>
            <p className="mk-article__p">
              Vos données sont accessibles aux équipes de {SITE_NAME} en charge de votre dossier et, avec votre démarche,
              aux partenaires financeurs auxquels votre dossier est présenté. Nos prestataires techniques
              (hébergement, stockage, envoi d&apos;e-mails) agissent comme sous-traitants et n&apos;utilisent vos données
              que pour fournir leur service.
            </p>

            <h2 className="mk-article__h2">Durée de conservation</h2>
            <p className="mk-article__p">
              Vos données sont conservées le temps nécessaire au traitement de votre demande et au respect de nos
              obligations légales et comptables, puis archivées ou supprimées.
            </p>

            <h2 className="mk-article__h2">Vos droits</h2>
            <p className="mk-article__p">
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
              limitation, d&apos;opposition et de portabilité de vos données. Pour les exercer, écrivez-nous à{' '}
              <a className="mk-article__link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Vous pouvez également
              introduire une réclamation auprès de la CNIL.
            </p>

            <h2 className="mk-article__h2">Sécurité</h2>
            <p className="mk-article__p">
              Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données. Aucune carte
              bancaire ni aucun RIB ne vous est demandé pour déposer une demande de financement.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
