'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '../Logo'
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
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40"
      style={{ width: 220, background: '#FFFFFF', borderRight: '1px solid #E5E5E3' }}
    >
      <div className="px-4 h-12 flex items-center gap-2 shrink-0" style={{ borderBottom: '1px solid #E5E5E3' }}>
        <Link href="/admin">
          <Logo size="sm" />
        </Link>
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#0E0E0C', color: '#fff' }}>admin</span>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(item => {
          if (!item.href) {
            return (
              <span
                key={item.label}
                className="flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-default"
                style={{ color: '#C4C4BE' }}
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
              className="px-3 py-2 rounded-md text-sm transition-colors hover:bg-[#F5F5F4]"
              style={{
                background: active ? '#F5F5F4' : undefined,
                color: active ? '#0E0E0C' : '#9A9A93',
                fontWeight: active ? 500 : 400,
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid #E5E5E3' }}>
        <p className="text-sm font-medium truncate" style={{ color: '#0E0E0C' }}>{name}</p>
        <p className="text-xs truncate" style={{ color: '#9A9A93' }}>{email}</p>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 text-xs transition-opacity hover:opacity-70"
          style={{ color: '#9A9A93' }}
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
