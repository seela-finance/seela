import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { REQUEST_STATUSES, requestStatusInfo } from '@/lib/status'
import {
  ADMIN_TODO_STATUSES,
  listAdminRequests,
  parseAdminListParams,
  sinceLabel,
  toAdminRequest,
  type AdminListParams,
  type AdminRequestRow,
} from '@/lib/admin-requests'

const HEADERS = ['Référence', 'Société', 'Montant HT', 'Durée', 'Statut', 'Offre choisie', 'Dernière action', 'Créé le']

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// URL de la liste en gardant les filtres courants
function listHref(params: AdminListParams, patch: Partial<AdminListParams>) {
  const p = { ...params, ...patch }
  const sp = new URLSearchParams()
  if (p.tab === 'all') sp.set('tab', 'all')
  if (p.tab === 'all' && p.status) sp.set('status', p.status)
  if (p.query) sp.set('q', p.query)
  if (p.page > 1) sp.set('page', String(p.page))
  const qs = sp.toString()
  return qs ? `/admin?${qs}` : '/admin'
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const params = parseAdminListParams(await searchParams)

  // Service role : l'équipe voit les dossiers de tous les clients (la RLS les limite à leur propriétaire)
  const { data, error } = await createAdminClient()
    .from('financing_requests')
    .select(`
      id, status, total_amount, duration_months, created_at, updated_at,
      profiles ( company_name, siren ),
      offers ( leaser_name, monthly_payment, duration_months, selected, confirmed_at, seela_validated_at, leaser_confirmed_at )
    `)

  const requests = ((data ?? []) as unknown as AdminRequestRow[]).map(toAdminRequest)
  const { items, total, page, pageCount } = listAdminRequests(requests, params)
  const todoCount = requests.filter(r => ADMIN_TODO_STATUSES.some(s => s === r.status)).length
  const now = new Date()

  const tabs = [
    { tab: 'todo' as const, label: 'À traiter', count: todoCount },
    { tab: 'all' as const, label: 'Tous', count: requests.length },
  ]

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <span className="text-sm font-medium" style={{ color: '#0E0E0C' }}>Dossiers</span>
      </div>

      <div className="px-6 py-6">
        {/* Onglets */}
        <div className="flex items-center gap-1 border-b" style={{ borderColor: '#E5E5E3' }}>
          {tabs.map(t => {
            const active = params.tab === t.tab
            return (
              <Link
                key={t.tab}
                href={listHref(params, { tab: t.tab, status: null, page: 1 })}
                className="px-3 py-2 text-sm -mb-px border-b-2 transition-colors"
                style={{
                  borderColor: active ? '#0E0E0C' : 'transparent',
                  color: active ? '#0E0E0C' : '#9A9A93',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {t.label}
                <span className="ml-1.5 text-xs" style={{ color: '#9A9A93' }}>{t.count}</span>
              </Link>
            )
          })}
        </div>

        {/* Recherche et filtre (formulaire GET : l'état vit dans l'URL) */}
        <form action="/admin" method="get" className="mt-4 flex flex-wrap items-center gap-2">
          {params.tab === 'all' && <input type="hidden" name="tab" value="all" />}
          <input
            type="search"
            name="q"
            defaultValue={params.query}
            placeholder="Référence, raison sociale ou SIREN"
            className="h-9 w-72 max-w-full px-3 rounded-lg border text-sm outline-none focus:border-[#9A9A93]"
            style={{ background: '#fff', borderColor: '#E5E5E3', color: '#0E0E0C' }}
          />
          {params.tab === 'all' && (
            <select
              name="status"
              defaultValue={params.status ?? ''}
              aria-label="Statut"
              className="h-9 px-2 rounded-lg border text-sm"
              style={{ background: '#fff', borderColor: '#E5E5E3', color: '#0E0E0C' }}
            >
              <option value="">Tous les statuts</option>
              {REQUEST_STATUSES.map(s => (
                <option key={s} value={s}>{requestStatusInfo(s).label}</option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="h-9 px-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: '#0E0E0C', color: '#fff' }}
          >
            Rechercher
          </button>
          {(params.query || params.status) && (
            <Link href={listHref(params, { query: '', status: null, page: 1 })} className="text-xs hover:opacity-70" style={{ color: '#9A9A93' }}>
              Effacer
            </Link>
          )}
        </form>

        {error && (
          <p className="mt-4 text-sm px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#991B1B' }}>
            Impossible de charger les dossiers. Réessayez dans un instant.
          </p>
        )}

        {/* Tableau (défile horizontalement sur mobile) */}
        <div className="mt-4 rounded-xl border overflow-x-auto" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E5E3' }}>
                {HEADERS.map(h => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium whitespace-nowrap" style={{ color: '#9A9A93' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const badge = requestStatusInfo(r.status)
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F5F5F4' }}>
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                      {r.ref}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[220px]">
                      <span className="block truncate" style={{ color: '#0E0E0C' }}>{r.companyName ?? '—'}</span>
                      {r.siren && <span className="block text-xs" style={{ color: '#9A9A93', fontVariantNumeric: 'tabular-nums' }}>{r.siren}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }}>{r.duration ? `${r.duration} mois` : '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: badge.dot }} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {r.leaserName ? (
                        <>
                          <span className="block" style={{ color: '#0E0E0C' }}>{r.leaserName}</span>
                          <span className="block text-xs" style={{ color: '#9A9A93', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.monthly)}/mois</span>
                        </>
                      ) : (
                        <span style={{ color: '#9A9A93' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }} title={fmtDate(r.lastActionAt)}>
                      {sinceLabel(r.lastActionAt, now)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }}>{fmtDate(r.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {items.length === 0 && !error && (
            <p className="px-4 py-10 text-sm text-center" style={{ color: '#9A9A93' }}>
              {params.query || params.status
                ? 'Aucun dossier ne correspond à cette recherche.'
                : params.tab === 'todo'
                  ? 'Aucun dossier en attente. Tout est à jour.'
                  : 'Aucun dossier pour le moment.'}
            </p>
          )}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm" style={{ color: '#9A9A93' }}>
            <span>{total} dossiers · page {page} / {pageCount}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={listHref(params, { page: page - 1 })} className="px-3 py-1.5 rounded-lg border hover:opacity-70" style={{ borderColor: '#E5E5E3', background: '#fff', color: '#0E0E0C' }}>
                  Précédent
                </Link>
              )}
              {page < pageCount && (
                <Link href={listHref(params, { page: page + 1 })} className="px-3 py-1.5 rounded-lg border hover:opacity-70" style={{ borderColor: '#E5E5E3', background: '#fff', color: '#0E0E0C' }}>
                  Suivant
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
