'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '../Logo'
import ResponsiveNav from '../ResponsiveNav'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABEL, can, type AdminRole, type Capability } from '@/lib/admin-roles'

// Chaque section n'apparaît qu'aux rôles qui y ont accès (la page renvoie 404 aux autres)
const NAV: { href: string | null; label: string; capability: Capability }[] = [
  { href: '/admin/crm/societes', label: 'Sociétés', capability: 'crm' },
  { href: null, label: 'Contacts', capability: 'crm' },
  { href: null, label: 'Deals', capability: 'crm' },
  { href: '/admin', label: 'Dossiers', capability: 'view' },
  { href: '/admin/societes', label: 'Comptes clients', capability: 'view' },
  { href: '/admin/leasers', label: 'Leasers', capability: 'manage_leasers' },
  { href: '/admin/equipe', label: 'Équipe', capability: 'manage_team' },
]

export default function AdminNav({ name, email, role }: { name: string; email: string; role: AdminRole }) {
  const pathname = usePathname()
  const router = useRouter()
  const items = NAV.filter(item => can(role, item.capability))

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
        <span className="ev-tag ev-tag--dark">{ROLE_LABEL[role].toLowerCase()}</span>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {items.map(item => {
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
