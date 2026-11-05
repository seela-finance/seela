// Pied de page commun (landing, Solutions, Secteurs), structure du canvas v2.
// Liens internes vers toutes les pages Solutions et Secteurs (silo SEO), rendus
// côté serveur. Les mentions non connues restent marquées « À COMPLÉTER ».
import Link from 'next/link'
import Brand from '@/components/landing/Brand'
import { SOLUTIONS } from '@/lib/seo/solutions'
import { SECTORS } from '@/lib/seo/sectors'

export default function MarketingFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__grid">
          <div className="foot__col">
            <Brand />
            <p className="small" style={{ margin: '8px 0 0', color: 'var(--ink-2)', maxWidth: 300 }}>Financement locatif d&apos;équipements professionnels. Un seul dossier, présenté aux financeurs adaptés.</p>
            <p className="legal" style={{ margin: '6px 0 0' }}>Location financière · Crédit-bail · LLD · LOA · Lease-back</p>
          </div>
          <div className="foot__col">
            <div className="foot__lbl">Solutions</div>
            <Link href="/solutions">Tous les financements</Link>
            {SOLUTIONS.map((s) => (
              <Link key={s.slug} href={`/solutions/${s.slug}`}>{s.nav}</Link>
            ))}
          </div>
          <div className="foot__col">
            <div className="foot__lbl">Secteurs</div>
            <Link href="/secteurs">Tous les secteurs</Link>
            {SECTORS.map((s) => (
              <Link key={s.slug} href={`/secteurs/${s.slug}`}>{s.nav}</Link>
            ))}
          </div>
          <div className="foot__col">
            <div className="foot__lbl">Everlease</div>
            <Link href="/">Accueil</Link>
            <Link href="/#comment">Comment ça marche</Link>
            <Link href="/#financeurs">Financeurs</Link>
            <Link href="/auth">Se connecter</Link>
            <Link href="/auth">Déposer un devis</Link>
          </div>
        </div>
        <div className="foot__legal">
          <p className="legal" style={{ margin: 0 }}>Les montants affichés sur cette page sont des exemples illustratifs, hors assurance et services. Tout financement est soumis à l&apos;acceptation du dossier par le financeur, qui fixe seul ses conditions.</p>
        </div>
        <div className="foot__bottom legal">
          <span>© 2026 Everlease SAS · <span className="todo">[À COMPLÉTER : RCS et siège]</span></span>
          <span><Link href="/mentions-legales">Mentions légales</Link> · <Link href="/confidentialite">Confidentialité</Link></span>
        </div>
      </div>
    </footer>
  )
}
