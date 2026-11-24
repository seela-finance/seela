'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '../Logo'
import ResponsiveNav from '../ResponsiveNav'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABEL, can, type AdminRole, type Capability } from '@/lib/admin-roles'

// Regroupé par usage : vendre (leads → deals), la base clients, le traitement des financements, l'équipe.
// Chaque entrée n'apparaît qu'aux rôles qui y ont accès (la page renvoie 404 aux autres).
const NAV: { href: string; label: string; hint?: string; section: string | null; capability: Capability }[] = [
  { href: '/admin/crm', label: 'Ma journée', section: null, capability: 'crm' },
  { href: '/admin/crm/prospection', label: 'Leads', hint: 'Qualification inbound et prospection outbound', section: 'Vente', capability: 'crm' },
  { href: '/admin/crm/appels', label: 'Session d’appels', hint: 'Enchaîner les appels société par société', section: 'Vente', capability: 'crm' },
  { href: '/admin/crm/deals', label: 'Deals', hint: 'Opportunités après le RDV', section: 'Vente', capability: 'crm' },
  { href: '/admin/acquisition', label: 'Acquisition', hint: 'Leads, dossiers et contrats par canal', section: 'Vente', capability: 'view' },
  { href: '/admin/crm/societes', label: 'Sociétés', section: 'Base', capability: 'crm' },
  { href: '/admin/crm/contacts', label: 'Contacts', section: 'Base', capability: 'crm' },
  { href: '/admin', label: 'Dossiers', hint: 'Demandes de financement à traiter', section: 'Financement', capability: 'view' },
  { href: '/admin/demandes', label: 'Demandes', hint: 'Demandes des clients sur leurs contrats', section: 'Financement', capability: 'view' },
  { href: '/admin/partenaires', label: 'Partenaires', hint: 'Distributeurs qui montent les dossiers de leurs clients', section: 'Financement', capability: 'view' },
  { href: '/admin/leasers', label: 'Leasers', section: 'Financement', capability: 'manage_leasers' },
  { href: '/admin/equipe', label: 'Équipe', section: 'Réglages', capability: 'manage_team' },
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
        {items.map((item, i) => {
          const header = item.section && item.section !== items[i - 1]?.section
            ? <p key={`s-${item.section}`} className="ev-kicker px-3 pt-4 pb-1" style={{ fontSize: 10 }}>{item.section}</p>
            : null
          const active = item.href === '/admin'
            ? pathname === '/admin' || pathname.startsWith('/admin/dossiers')
            : item.href === '/admin/crm' ? pathname === item.href : pathname.startsWith(item.href)
          return [header, (
            <Link
              key={item.label}
              href={item.href}
              title={item.hint}
              className="px-3 py-2 rounded-md text-sm transition-colors hover:bg-[var(--raised)]"
              style={{
                background: active ? 'var(--raised)' : undefined,
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: active ? 500 : 400,
              }}
            >
              {item.label}
            </Link>
          )]
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
