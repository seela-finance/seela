import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { CONTACT_VIEWS, CONTACT_VIEW_LABEL, contactName, listContacts, type ContactRow, type ContactView } from '@/lib/crm-deals'
import { fmtDate } from '@/components/admin/ui'
import { NewContactButton } from '@/components/admin/crm/CrmForms'
import CallButton from '@/components/admin/crm/CallButton'

const HEADERS = ['Contact', 'Société', 'Poste', 'Téléphone', 'Propriétaire', 'Créé le']

export default async function CrmContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireCapability('crm')
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const view: ContactView = (CONTACT_VIEWS as readonly string[]).includes(one(sp.vue)) ? (one(sp.vue) as ContactView) : 'tous'
  const query = one(sp.q).slice(0, 100)

  const configured = isServiceRoleConfigured()
  const db = configured ? createAdminClient() : null
  const [contactsRes, companiesRes, adminsRes] = db
    ? await Promise.all([
      db.from('contacts').select('id, first_name, last_name, email, phone, job_title, persona, user_id, owner_id, company_id, created_at, companies ( name )').limit(2000),
      db.from('companies').select('id, name').order('name'),
      db.from('admins').select('user_id, name'),
    ])
    : [{ data: null, error: null }, { data: null, error: null }, { data: null, error: null }]

  const all = (contactsRes.data ?? []) as unknown as ContactRow[]
  const owners = new Map(((adminsRes.data ?? []) as { user_id: string; name: string }[]).map(a => [a.user_id, a.name]))
  const { items, counts } = listContacts(all, view, query, admin.userId)
  const href = (v: ContactView) => (v === 'tous' ? '/admin/crm/contacts' : `/admin/crm/contacts?vue=${v}`)

  return (
    <div>
      <div className="h-12 flex items-center justify-between gap-3 px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Contacts</span>
          <span className="ev-mono ml-2 text-xs" style={{ color: 'var(--ink-3)' }}>{all.length}</span>
        </div>
        <NewContactButton companies={(companiesRes.data ?? []) as { id: string; name: string }[]} />
      </div>

      <div className="px-6 pt-3 flex flex-wrap gap-1 border-b" style={{ borderColor: 'var(--line)' }} role="tablist" aria-label="Vues">
        {CONTACT_VIEWS.map(v => {
          const on = view === v
          return (
            <Link key={v} href={href(v)} role="tab" aria-selected={on} className="px-3 py-2 text-sm -mb-px"
              style={{ color: on ? 'var(--ink)' : 'var(--ink-3)', fontWeight: on ? 500 : 400, borderBottom: `2px solid ${on ? 'var(--ink)' : 'transparent'}` }}>
              {CONTACT_VIEW_LABEL[v]} <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{counts[v]}</span>
            </Link>
          )
        })}
      </div>

      <div className="px-6 py-5">
        <form action="/admin/crm/contacts" method="get" className="flex flex-wrap items-center gap-2">
          {view !== 'tous' && <input type="hidden" name="vue" value={view} />}
          <input type="search" name="q" defaultValue={query} placeholder="Nom, email, téléphone, société" aria-label="Rechercher un contact" className="ev-input" style={{ width: '20rem', maxWidth: '100%' }} />
          <button type="submit" className="ev-btn ev-btn--ghost">Rechercher</button>
          {query && <Link href={href(view)} className="text-xs hover:opacity-70" style={{ color: 'var(--ink-3)' }}>Effacer</Link>}
        </form>

        {(contactsRes.error || !configured) && (
          <p className="ev-alert ev-alert--danger mt-4">{configured ? 'Impossible de charger les contacts. Réessayez dans un instant.' : SERVICE_ROLE_MISSING_MESSAGE}</p>
        )}

        <div className="ev-card mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {HEADERS.map(h => <th key={h} className="ev-kicker px-4 py-2.5 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 200).map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-4 py-3 text-sm max-w-[260px]">
                    <Link href={`/admin/crm/contacts/${c.id}`} className="block truncate font-medium underline-offset-2 hover:underline" style={{ color: 'var(--ink)' }}>
                      {contactName(c)} {c.user_id && <span className="ev-tag ev-tag--accent ml-1">Accès app</span>}
                    </Link>
                    <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>{c.email ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {c.company_id && c.companies
                      ? <Link href={`/admin/crm/societes/${c.company_id}`} className="hover:underline" style={{ color: 'var(--ink)' }}>{c.companies.name}</Link>
                      : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>{[c.job_title, c.persona].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>
                    {c.phone ? <CallButton phone={c.phone} companyId={c.company_id} contactId={c.id} contactName={contactName(c)} compact /> : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>{(c.owner_id && owners.get(c.owner_id)) ?? '—'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && configured && !contactsRes.error && (
            <p className="px-4 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>{query || view !== 'tous' ? 'Aucun contact ne correspond.' : 'Aucun contact pour le moment.'}</p>
          )}
        </div>
        {items.length > 200 && <p className="mt-3 text-xs" style={{ color: 'var(--ink-3)' }}>200 premiers sur {items.length} — affinez la recherche.</p>}
      </div>
    </div>
  )
}
