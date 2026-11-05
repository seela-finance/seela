'use client'

// Navigation commune (landing, Solutions, Secteurs), style du canvas v2 :
// marque, liens, « Se connecter » + bouton encre, burger sous 900px.
// Les liens Solutions et Secteurs gardent un menu déroulant au survol pour
// le maillage SEO ; les liens sont de vrais <Link> (crawlables).
import React from 'react'
import Link from 'next/link'
import Brand from '@/components/landing/Brand'
import { BtnGauge } from '@/components/landing/Gauge'
import { IconArrowRight, IconUser } from '@/components/landing/icons'
import { SOLUTIONS } from '@/lib/seo/solutions'
import { SECTORS } from '@/lib/seo/sectors'
import { createClient } from '@/lib/supabase/client'

type MenuKey = 'solutions' | 'secteurs'

export default function MarketingNav() {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [open, setOpen] = React.useState<MenuKey | null>(null)
  const [userEmail, setUserEmail] = React.useState<string | null>(null)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Session lue côté client pour que les pages restent statiques
  // (aucune lecture de cookie côté serveur).
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
  }, [])

  const enter = (key: MenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(key)
  }
  const leave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(null), 120)
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="wrap">
        <div className="nav__in">
          <Brand />

          <div className="nav__links">
            <div className="mk-nav__item" onMouseEnter={() => enter('solutions')} onMouseLeave={leave} onFocus={() => enter('solutions')} onBlur={leave}>
              <Link href="/solutions" aria-expanded={open === 'solutions'}>Solutions</Link>
              {open === 'solutions' && (
                <div className="mk-dropdown" role="menu">
                  <Link className="mk-dropdown__lead" href="/solutions" role="menuitem">
                    Tous les financements <IconArrowRight size={13} />
                  </Link>
                  {SOLUTIONS.map((s) => (
                    <Link key={s.slug} className="mk-dropdown__item" href={`/solutions/${s.slug}`} role="menuitem">
                      {s.nav}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="mk-nav__item" onMouseEnter={() => enter('secteurs')} onMouseLeave={leave} onFocus={() => enter('secteurs')} onBlur={leave}>
              <Link href="/secteurs" aria-expanded={open === 'secteurs'}>Secteurs</Link>
              {open === 'secteurs' && (
                <div className="mk-dropdown" role="menu">
                  <Link className="mk-dropdown__lead" href="/secteurs" role="menuitem">
                    Tous les secteurs <IconArrowRight size={13} />
                  </Link>
                  {SECTORS.map((s) => (
                    <Link key={s.slug} className="mk-dropdown__item" href={`/secteurs/${s.slug}`} role="menuitem">
                      {s.nav}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/#comment">Comment ça marche</Link>
            <Link href="/#financeurs">Financeurs</Link>
          </div>

          <div className="nav__cta">
            {userEmail ? (
              <Link className="lp-user" href="/app/dashboard">
                <span className="lp-user__avatar"><IconUser size={15} /></span>
                <span>
                  <span className="lp-user__action">Ouvrir l&apos;application <IconArrowRight size={13} /></span>
                  <span className="lp-user__email" style={{ display: 'block' }}>{userEmail}</span>
                </span>
              </Link>
            ) : (
              <>
                <Link className="login" href="/auth">Se connecter</Link>
                <Link className="btn btn--ink btn--sm" href="/auth"><BtnGauge />Estimer mon financement</Link>
              </>
            )}
          </div>

          <button className="burger" type="button" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              {menuOpen
                ? <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                : <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="mnav">
            <Link href="/solutions" onClick={closeMenu}>Solutions</Link>
            <Link href="/secteurs" onClick={closeMenu}>Secteurs</Link>
            <Link href="/#comment" onClick={closeMenu}>Comment ça marche</Link>
            <Link href="/#financeurs" onClick={closeMenu}>Financeurs</Link>
            {userEmail ? (
              <Link className="btn btn--ink" href="/app/dashboard" onClick={closeMenu}>Ouvrir l&apos;application</Link>
            ) : (
              <>
                <Link href="/auth" onClick={closeMenu}>Se connecter</Link>
                <Link className="btn btn--ink" href="/auth" onClick={closeMenu}>Estimer mon financement</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
