'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from './Logo'
import ResponsiveNav from './ResponsiveNav'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string
  companyName: string
  offresCount: number
  contratsCount: number
}

const NAV_MAIN = [
  {
    href: '/app/dashboard',
    activeOn: '/app/dashboard',
    label: 'Tableau de bord',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    href: '/app/nouveau',
    activeOn: '/app/nouveau',
    label: 'Nouveau financement',
    plus: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/app/offres',
    activeOn: '/app/offres',
    label: 'Offres',
    badge: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="5.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="10.5" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3.5 12.5l9-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/app/contrats',
    activeOn: '/app/contrats',
    label: 'Contrats',
    badge: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.3" />
        <path d="M10 2v3h3M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function SidebarClient({ email, companyName, offresCount, contratsCount }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const display = companyName || email
  const initials = display
    .split(/[\s@._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')

  return (
    <ResponsiveNav brand={<Link href="/app/dashboard"><Logo size="sm" /></Link>}>
      {/* Logo */}
      <div className="px-4 h-12 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <Link href="/app/dashboard">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col overflow-y-auto">
        {NAV_MAIN.map((item) => {
          const active = pathname.startsWith(item.activeOn)
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group"
              style={{
                background: active ? 'var(--raised)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--raised)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span className="shrink-0" style={{ color: active ? 'var(--ink)' : 'var(--ink-3)' }}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (() => {
                const count = item.href === '/app/offres' ? offresCount : contratsCount
                return count > 0 ? (
                  <span className="ev-tag ev-tag--dark shrink-0" style={{ minHeight: 18, padding: '0 6px' }}>
                    {count}
                  </span>
                ) : null
              })()}
            </Link>
          )
        })}

        {/* BIENTÔT */}
        <div className="mt-5 mb-1 px-3">
          <span className="ev-kicker" style={{ fontSize: 10 }}>
            Bientôt
          </span>
        </div>
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm"
          style={{ opacity: 0.45, cursor: 'default', color: 'var(--ink-3)' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="flex-1 truncate">Scoring Everlease</span>
          <span className="ev-tag shrink-0" style={{ color: 'var(--ink-3)', fontSize: 10, minHeight: 18, padding: '0 6px' }}>
            Bientôt
          </span>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: 'var(--ink)', color: 'var(--dark-text)' }}
          >
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)', lineHeight: '16px' }}>
              {companyName || email.split('@')[0]}
            </p>
            <p className="truncate" style={{ color: 'var(--ink-3)', fontSize: 11, lineHeight: '15px' }}>{email}</p>
          </div>
          <button
            onClick={signOut}
            className="shrink-0 transition-colors hover:text-[var(--ink)]"
            style={{ color: 'var(--ink-3)' }}
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </ResponsiveNav>
  )
}
