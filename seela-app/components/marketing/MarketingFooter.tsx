// Marketing footer with internal links to the solution pages — reinforces the
// SEO silo (every page links to every sibling) and mirrors the landing footer.
import Link from 'next/link'
import { EverleaseMark } from '@/components/landing/icons'
import { SOLUTIONS } from '@/lib/seo/solutions'
import { SECTORS } from '@/lib/seo/sectors'

function Logo({ size = 20 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: size + 4, height: size + 4, borderRadius: 7, background: 'var(--text)', display: 'grid', placeItems: 'center' }}>
        <EverleaseMark size={size + 4} color="#FAFAF9" />
      </div>
      <div style={{ fontSize: size * 0.74, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text)' }}>everlease</div>
    </div>
  )
}

export default function MarketingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="mk-footer__cols">
          <div>
            <Logo size={20} />
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12, maxWidth: 280, lineHeight: 1.5 }}>
              Le financement locatif des équipements professionnels, en quelques minutes.
            </p>
          </div>
          <div>
            <div className="mk-footer__label">Solutions</div>
            <Link className="mk-footer__link" href="/solutions">Tous les financements</Link>
            {SOLUTIONS.map((s) => (
              <Link key={s.slug} className="mk-footer__link" href={`/solutions/${s.slug}`}>{s.nav}</Link>
            ))}
          </div>
          <div>
            <div className="mk-footer__label">Secteurs</div>
            <Link className="mk-footer__link" href="/secteurs">Tous les secteurs</Link>
            {SECTORS.map((s) => (
              <Link key={s.slug} className="mk-footer__link" href={`/secteurs/${s.slug}`}>{s.name}</Link>
            ))}
          </div>
          <div>
            <div className="mk-footer__label">Everlease</div>
            <Link className="mk-footer__link" href="/">Accueil</Link>
            <Link className="mk-footer__link" href="/auth">Se connecter</Link>
            <Link className="mk-footer__link" href="/auth">Financer un équipement</Link>
          </div>
        </div>
        <div className="mk-footer__bottom">
          <span>© 2026 Everlease SAS — Tous droits réservés.</span>
          <span>Conçu et hébergé en France 🇫🇷</span>
        </div>
      </div>
    </footer>
  )
}
