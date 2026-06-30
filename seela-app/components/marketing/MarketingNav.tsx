'use client'

// Marketing nav shared by the SEO pages (Solutions, and future Secteurs).
// Mirrors the landing nav visually but adds a "Solutions" dropdown. Links are
// real <Link> tags so they're crawlable; only the open/close is client-side.
import React from 'react'
import Link from 'next/link'
import { EverleaseMark, IconArrowRight, IconUser, type IconProps } from '@/components/landing/icons'
import { SOLUTIONS } from '@/lib/seo/solutions'
import { SECTORS } from '@/lib/seo/sectors'
import { createClient } from '@/lib/supabase/client'

function Logo({ size = 20 }: { size?: number }) {
  return (
    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-label="Everlease — accueil">
      <div style={{ width: size + 4, height: size + 4, borderRadius: 7, background: 'var(--text)', display: 'grid', placeItems: 'center' }}>
        <EverleaseMark size={size + 4} color="#FAFAF9" />
      </div>
      <div style={{ fontSize: size * 0.74, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text)' }}>everlease</div>
    </Link>
  )
}

function IconChevron(p: IconProps) {
  const { size = 14, style } = p
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

type MenuKey = 'solutions' | 'secteurs'

export default function MarketingNav() {
  const [openMenu, setOpenMenu] = React.useState(false)
  const [open, setOpen] = React.useState<MenuKey | null>(null)
  const [userEmail, setUserEmail] = React.useState<string | null>(null)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch the session client-side so the layout/pages stay statically
  // prerendered (no cookie read on the server) — better TTFB for SEO pages.
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
  const toggle = (key: MenuKey) => setOpen((v) => (v === key ? null : key))

  return (
    <nav className="lp-nav">
      <div className="lp-wrap lp-nav__inner">
        <Logo size={20} />

        {/* Desktop links */}
        <div className="mk-nav__links">
          <div className="mk-nav__item" onMouseEnter={() => enter('solutions')} onMouseLeave={leave}>
            <button className="mk-nav__trigger" aria-expanded={open === 'solutions'} onClick={() => toggle('solutions')}>
              Solutions <IconChevron size={13} style={{ transition: 'transform .15s', transform: open === 'solutions' ? 'rotate(180deg)' : 'none' }} />
            </button>
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

          <div className="mk-nav__item" onMouseEnter={() => enter('secteurs')} onMouseLeave={leave}>
            <button className="mk-nav__trigger" aria-expanded={open === 'secteurs'} onClick={() => toggle('secteurs')}>
              Secteurs <IconChevron size={13} style={{ transition: 'transform .15s', transform: open === 'secteurs' ? 'rotate(180deg)' : 'none' }} />
            </button>
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
        </div>

        {/* Right actions */}
        <div className="mk-nav__actions">
          {userEmail ? (
            <Link className="lp-user" href="/app/dashboard">
              <span className="lp-user__avatar"><IconUser size={15} /></span>
              <span>
                <span className="lp-user__action">Go to app <IconArrowRight size={13} /></span>
                <span className="lp-user__email" style={{ display: 'block' }}>{userEmail}</span>
              </span>
            </Link>
          ) : (
            <>
              <Link className="btn btn--ghost lp-nav__login" href="/auth">Se connecter</Link>
              <Link className="btn btn--accent" href="/auth">Financer un équipement</Link>
            </>
          )}
          <button className="mk-burger" aria-label="Menu" aria-expanded={openMenu} onClick={() => setOpenMenu((v) => !v)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {openMenu && (
        <div className="mk-mobile">
          <div className="lp-wrap">
            <div className="mk-mobile__label">Solutions</div>
            <Link className="mk-mobile__item" href="/solutions" onClick={() => setOpenMenu(false)}>Tous les financements</Link>
            {SOLUTIONS.map((s) => (
              <Link key={s.slug} className="mk-mobile__item" href={`/solutions/${s.slug}`} onClick={() => setOpenMenu(false)}>{s.nav}</Link>
            ))}
            <div className="mk-mobile__label" style={{ marginTop: 18 }}>Secteurs</div>
            <Link className="mk-mobile__item" href="/secteurs" onClick={() => setOpenMenu(false)}>Tous les secteurs</Link>
            {SECTORS.map((s) => (
              <Link key={s.slug} className="mk-mobile__item" href={`/secteurs/${s.slug}`} onClick={() => setOpenMenu(false)}>{s.nav}</Link>
            ))}
            {!userEmail && (
              <Link className="btn btn--accent btn--lg" href="/auth" style={{ marginTop: 12, justifyContent: 'center' }} onClick={() => setOpenMenu(false)}>
                Financer un équipement <IconArrowRight />
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
