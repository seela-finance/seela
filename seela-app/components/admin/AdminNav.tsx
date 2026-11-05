'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '../Logo'
import ResponsiveNav from '../ResponsiveNav'
import { createClient } from '@/lib/supabase/client'

// Les sections sans href arrivent avec les issues suivantes du Lot 3
const NAV = [
  { href: '/admin', label: 'Dossiers' },
  { href: '/admin/societes', label: 'Sociétés' },
  { href: null, label: 'Leasers' },
]

export default function AdminNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <ResponsiveNav brand={<Link href="/admin"><Logo size="sm" /></Link>}>
      <div className="px-4 h-12 flex items-center gap-2 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <Link href="/admin">
          <Logo size="sm" />
        </Link>
        <span className="ev-tag ev-tag--dark">admin</span>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(item => {
          if (!item.href) {
            return (
              <span
                key={item.label}
                className="flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-default"
                style={{ color: 'var(--line-strong)' }}
              >
                {item.label}
                <span className="text-xs">Bientôt</span>
              </span>
            )
          }
          const active = item.href === '/admin'
            ? pathname === '/admin' || pathname.startsWith('/admin/dossiers')
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className="px-3 py-2 rounded-md text-sm transition-colors hover:bg-[var(--raised)]"
              style={{
                background: active ? 'var(--raised)' : undefined,
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: active ? 500 : 400,
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{name}</p>
        <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{email}</p>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--ink-3)' }}
        >
          Se déconnecter
        </button>
      </div>
    </ResponsiveNav>
  )
}
