import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
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

// Service role : l'équipe voit les dossiers de tous les clients (la RLS les limite à leur propriétaire)
function loadRequests() {
  return createAdminClient()
    .from('financing_requests')
    .select(`
      id, user_id, status, total_amount, duration_months, created_at, updated_at,
      profiles ( company_name, siren ),
      offers ( leaser_name, monthly_payment, duration_months, selected, confirmed_at, seela_validated_at, leaser_confirmed_at )
    `)
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const params = parseAdminListParams(await searchParams)

  const configured = isServiceRoleConfigured()
  const { data, error } = configured ? await loadRequests() : { data: null, error: null }

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
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Dossiers</span>
      </div>

      <div className="px-6 py-6">
        {/* Onglets */}
        <div className="flex items-center gap-1 pb-3 border-b" style={{ borderColor: 'var(--line)' }}>
          {tabs.map(t => {
            const active = params.tab === t.tab
            return (
              <Link
                key={t.tab}
                href={listHref(params, { tab: t.tab, status: null, page: 1 })}
                className="px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-[var(--raised)]"
                style={{
                  background: active ? 'var(--raised)' : undefined,
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {t.label}
                <span className="ml-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>{t.count}</span>
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
            className="ev-input"
            style={{ width: '18rem', maxWidth: '100%' }}
          />
          {params.tab === 'all' && (
            <select
              name="status"
              defaultValue={params.status ?? ''}
              aria-label="Statut"
              className="ev-input"
              style={{ width: 'auto' }}
            >
              <option value="">Tous les statuts</option>
              {REQUEST_STATUSES.map(s => (
                <option key={s} value={s}>{requestStatusInfo(s).label}</option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="ev-btn ev-btn--ghost"
          >
            Rechercher
          </button>
          {(params.query || params.status) && (
            <Link href={listHref(params, { query: '', status: null, page: 1 })} className="text-xs hover:opacity-70" style={{ color: 'var(--ink-3)' }}>
              Effacer
            </Link>
          )}
        </form>

        {(error || !configured) && (
          <p className="ev-alert ev-alert--danger mt-4">
            {configured ? 'Impossible de charger les dossiers. Réessayez dans un instant.' : SERVICE_ROLE_MISSING_MESSAGE}
          </p>
        )}

        {/* Tableau (défile horizontalement sur mobile) */}
        <div className="ev-card mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {HEADERS.map(h => (
                  <th key={h} className="ev-kicker px-4 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const badge = requestStatusInfo(r.status)
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="ev-mono px-4 py-3 text-sm font-medium whitespace-nowrap">
                      <Link href={`/admin/dossiers/${r.id}`} className="underline-offset-2 hover:underline" style={{ color: 'var(--ink)' }}>
                        {r.ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[220px]">
                      {r.userId ? (
                        <Link href={`/admin/societes/${r.userId}`} className="block truncate underline-offset-2 hover:underline" style={{ color: 'var(--ink)' }}>
                          {r.companyName ?? 'Société sans nom'}
                        </Link>
                      ) : (
                        <span className="block truncate" style={{ color: 'var(--ink)' }}>{r.companyName ?? '—'}</span>
                      )}
                      {r.siren && <span className="ev-mono block text-xs" style={{ color: 'var(--ink-3)' }}>{r.siren}</span>}
                    </td>
                    <td className="ev-mono px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>{fmt(r.amount)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{r.duration ? `${r.duration} mois` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="ev-tag" style={{ background: badge.bg, color: badge.color }}>
                        <span className="ev-tag__dot" style={{ background: badge.dot }} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {r.leaserName ? (
                        <>
                          <span className="block" style={{ color: 'var(--ink)' }}>{r.leaserName}</span>
                          <span className="ev-mono block text-xs" style={{ color: 'var(--ink-3)' }}>{fmt(r.monthly)}/mois</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--ink-3)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }} title={fmtDate(r.lastActionAt)}>
                      {sinceLabel(r.lastActionAt, now)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDate(r.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {items.length === 0 && !error && configured && (
            <p className="px-4 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
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
          <div className="mt-4 flex items-center justify-between text-sm" style={{ color: 'var(--ink-3)' }}>
            <span>{total} dossiers · page {page} / {pageCount}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={listHref(params, { page: page - 1 })} className="ev-btn ev-btn--ghost ev-btn--sm">
                  Précédent
                </Link>
              )}
              {page < pageCount && (
                <Link href={listHref(params, { page: page + 1 })} className="ev-btn ev-btn--ghost ev-btn--sm">
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
