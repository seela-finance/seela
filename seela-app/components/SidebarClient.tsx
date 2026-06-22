'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from './Logo'
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
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40"
      style={{ width: 220, background: '#FFFFFF', borderRight: '1px solid #E5E5E3' }}
    >
      {/* Logo */}
      <div className="px-4 h-12 flex items-center shrink-0" style={{ borderBottom: '1px solid #E5E5E3' }}>
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
                background: active ? '#F5F5F4' : 'transparent',
                color: active ? '#0E0E0C' : '#9A9A93',
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F5F4' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span className="shrink-0" style={{ color: active ? '#0E0E0C' : '#9A9A93' }}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (() => {
                const count = item.href === '/app/offres' ? offresCount : contratsCount
                return count > 0 ? (
                  <span
                    className="shrink-0 text-xs font-medium"
                    style={{
                      background: '#0E0E0C',
                      color: '#fff',
                      fontSize: 11,
                      padding: '1px 6px',
                      borderRadius: 10,
                      lineHeight: '16px',
                    }}
                  >
                    {count}
                  </span>
                ) : null
              })()}
            </Link>
          )
        })}

        {/* BIENTÔT */}
        <div className="mt-5 mb-1 px-3">
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: '#9A9A93', textTransform: 'uppercase' }}>
            Bientôt
          </span>
        </div>
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm"
          style={{ opacity: 0.45, cursor: 'default', color: '#9A9A93' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="flex-1 truncate">Scoring Everlease</span>
          <span
            className="shrink-0 text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#F5F5F4', color: '#9A9A93', fontSize: 10 }}
          >
            Bientôt
          </span>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid #E5E5E3' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: '#0E0E0C', color: '#FAFAF9' }}
          >
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: '#0E0E0C', lineHeight: '16px' }}>
              {companyName || email.split('@')[0]}
            </p>
            <p className="truncate" style={{ color: '#9A9A93', fontSize: 11, lineHeight: '15px' }}>{email}</p>
          </div>
          <button
            onClick={signOut}
            className="shrink-0 transition-colors hover:text-[#0E0E0C]"
            style={{ color: '#9A9A93' }}
            title="Se déconnecter"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
