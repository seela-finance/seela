import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import {
  COMPANY_VIEWS, LIFECYCLE_LABEL, VIEW_LABEL, listCrmCompanies, parseCompanyListParams, toCrmCompany,
  type CompanyListParams, type CrmCompanyRow, type LifecycleStage,
} from '@/lib/crm-companies'
import { fmtDate } from '@/components/admin/ui'
import NewCompanyForm from '@/components/admin/crm/NewCompanyForm'

const HEADERS = ['Société', 'Statut', 'Secteur', 'Propriétaire', 'Contacts', 'Dossiers', 'Créée le']

const STAGE_TAG: Record<LifecycleStage, string> = {
  prospect: 'ev-tag',
  client: 'ev-tag ev-tag--ok',
  partenaire: 'ev-tag ev-tag--accent',
  exclu: 'ev-tag ev-tag--danger',
}

function listHref(params: CompanyListParams, patch: Partial<CompanyListParams>) {
  const p = { ...params, ...patch }
  const sp = new URLSearchParams()
  if (p.view !== 'toutes') sp.set('vue', p.view)
  if (p.query) sp.set('q', p.query)
  if (p.page > 1) sp.set('page', String(p.page))
  const qs = sp.toString()
  return qs ? `/admin/crm/societes?${qs}` : '/admin/crm/societes'
}

export default async function CrmCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const admin = await requireCapability('crm')
  const params = parseCompanyListParams(await searchParams)

  const configured = isServiceRoleConfigured()
  const db = configured ? createAdminClient() : null
  const [companiesRes, adminsRes] = db
    ? await Promise.all([
      db.from('companies').select('id, name, siren, domain, lifecycle_stage, sector, owner_id, created_at, contacts ( id ), financing_requests ( id, status )'),
      db.from('admins').select('user_id, name'),
    ])
    : [{ data: null, error: null }, { data: null, error: null }]

  const all = ((companiesRes.data ?? []) as unknown as CrmCompanyRow[]).map(toCrmCompany)
  const owners = new Map(((adminsRes.data ?? []) as { user_id: string; name: string }[]).map(a => [a.user_id, a.name]))
  const { items, total, page, pageCount, counts } = listCrmCompanies(all, params, admin.userId)
  const error = companiesRes.error

  return (
    <div>
      <div className="h-12 flex items-center justify-between gap-3 px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Sociétés</span>
          <span className="ev-mono ml-2 text-xs" style={{ color: 'var(--ink-3)' }}>{all.length}</span>
        </div>
        <NewCompanyForm />
      </div>

      <div className="px-6 pt-3 flex flex-wrap gap-1 border-b" style={{ borderColor: 'var(--line)' }} role="tablist" aria-label="Vues">
        {COMPANY_VIEWS.map(v => {
          const on = params.view === v
          return (
            <Link
              key={v}
              href={listHref(params, { view: v, page: 1 })}
              role="tab"
              aria-selected={on}
              className="px-3 py-2 text-sm -mb-px"
              style={{ color: on ? 'var(--ink)' : 'var(--ink-3)', fontWeight: on ? 500 : 400, borderBottom: `2px solid ${on ? 'var(--ink)' : 'transparent'}` }}
            >
              {VIEW_LABEL[v]} <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{counts[v]}</span>
            </Link>
          )
        })}
      </div>

      <div className="px-6 py-5">
        <form action="/admin/crm/societes" method="get" className="flex flex-wrap items-center gap-2">
          {params.view !== 'toutes' && <input type="hidden" name="vue" value={params.view} />}
          <input
            type="search"
            name="q"
            defaultValue={params.query}
            placeholder="Nom, SIREN ou domaine"
            aria-label="Rechercher une société"
            className="ev-input"
            style={{ width: '20rem', maxWidth: '100%' }}
          />
          <button type="submit" className="ev-btn ev-btn--ghost">Rechercher</button>
          {params.query && (
            <Link href={listHref(params, { query: '', page: 1 })} className="text-xs hover:opacity-70" style={{ color: 'var(--ink-3)' }}>Effacer</Link>
          )}
        </form>

        {(error || !configured) && (
          <p className="ev-alert ev-alert--danger mt-4">
            {configured ? 'Impossible de charger les sociétés. Réessayez dans un instant.' : SERVICE_ROLE_MISSING_MESSAGE}
          </p>
        )}

        <div className="ev-card mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {HEADERS.map(h => <th key={h} className="ev-kicker px-4 py-2.5 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-4 py-3 text-sm max-w-[260px]">
                    <Link href={`/admin/crm/societes/${c.id}`} className="block truncate font-medium underline-offset-2 hover:underline" style={{ color: 'var(--ink)' }}>
                      {c.name}
                    </Link>
                    <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
                      {[c.domain, c.siren && `SIREN ${c.siren}`].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className={STAGE_TAG[c.stage]}>{LIFECYCLE_LABEL[c.stage]}</span></td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>{c.sector ?? '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>{(c.ownerId && owners.get(c.ownerId)) ?? '—'}</td>
                  <td className="ev-mono px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>{c.contactCount}</td>
                  <td className="ev-mono px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>{c.requestCount}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && !error && configured && (
            <p className="px-4 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
              {params.query || params.view !== 'toutes' ? 'Aucune société ne correspond.' : 'Aucune société pour le moment. Créez la première.'}
            </p>
          )}
        </div>

        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm" style={{ color: 'var(--ink-3)' }}>
            <span>{total} sociétés · page {page} / {pageCount}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={listHref(params, { page: page - 1 })} className="ev-btn ev-btn--ghost ev-btn--sm">Précédente</Link>}
              {page < pageCount && <Link href={listHref(params, { page: page + 1 })} className="ev-btn ev-btn--ghost ev-btn--sm">Suivante</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
