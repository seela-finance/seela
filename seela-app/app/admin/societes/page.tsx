import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { listCompanies, parseCompanyListParams, toAdminCompany, type CompanyListParams, type CompanyProfileRow } from '@/lib/admin-company'
import { sinceLabel } from '@/lib/admin-requests'
import { eur, fmtDate } from '@/components/admin/ui'

const HEADERS = ['Société', 'Contact', 'Score', 'Dossiers', 'Montant demandé', 'Dernier dossier', 'Inscrite le']

function listHref(params: CompanyListParams, patch: Partial<CompanyListParams>) {
  const p = { ...params, ...patch }
  const sp = new URLSearchParams()
  if (p.query) sp.set('q', p.query)
  if (p.page > 1) sp.set('page', String(p.page))
  const qs = sp.toString()
  return qs ? `/admin/societes?${qs}` : '/admin/societes'
}

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const params = parseCompanyListParams(await searchParams)

  const configured = isServiceRoleConfigured()
  // Service role : l'équipe voit toutes les sociétés (la RLS limite chaque client à son profil)
  const { data, error } = configured
    ? await createAdminClient()
      .from('profiles')
      .select('id, company_name, siren, first_name, last_name, email, seela_score, seela_score_grade, onboarding_completed, created_at, financing_requests ( id, status, total_amount, created_at )')
    : { data: null, error: null }

  const companies = ((data ?? []) as unknown as CompanyProfileRow[]).map(toAdminCompany)
  const { items, total, page, pageCount } = listCompanies(companies, params)
  const now = new Date()

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Sociétés</span>
        <span className="ev-mono ml-2 text-xs" style={{ color: 'var(--ink-3)' }}>{companies.length}</span>
      </div>

      <div className="px-6 py-6">
        <form action="/admin/societes" method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={params.query}
            placeholder="Raison sociale, SIREN, contact ou email"
            className="ev-input"
            style={{ width: '20rem', maxWidth: '100%' }}
          />
          <button type="submit" className="ev-btn ev-btn--ghost">
            Rechercher
          </button>
          {params.query && (
            <Link href="/admin/societes" className="text-xs hover:opacity-70" style={{ color: 'var(--ink-3)' }}>Effacer</Link>
          )}
        </form>

        {(error || !configured) && (
          <p className="ev-alert ev-alert--danger mt-4">
            {configured ? 'Impossible de charger les sociétés. Réessayez dans un instant.' : SERVICE_ROLE_MISSING_MESSAGE}
          </p>
        )}

        <div className="ev-card mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {HEADERS.map(h => (
                  <th key={h} className="ev-kicker px-4 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-4 py-3 text-sm max-w-[240px]">
                    <Link href={`/admin/societes/${c.id}`} className="block truncate font-medium underline-offset-2 hover:underline" style={{ color: 'var(--ink)' }}>
                      {c.name ?? 'Société sans nom'}
                    </Link>
                    <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
                      {c.siren ? <span className="ev-mono">{c.siren}</span> : 'SIREN non renseigné'}{!c.onboarded && ' · onboarding incomplet'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[220px]">
                    <span className="block truncate" style={{ color: 'var(--ink)' }}>{c.contact ?? '—'}</span>
                    {c.email && <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>{c.email}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                    {c.grade ? <>{c.grade} <span className="ev-mono" style={{ color: 'var(--ink-3)' }}>· {c.score}</span></> : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                  </td>
                  <td className="ev-mono px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>{c.requestCount}</td>
                  <td className="ev-mono px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                    {c.requestedAmount > 0 ? eur(c.requestedAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }} title={c.lastRequestAt ? fmtDate(c.lastRequestAt) : undefined}>
                    {c.lastRequestAt ? sinceLabel(c.lastRequestAt, now) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && !error && configured && (
            <p className="px-4 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
              {params.query ? 'Aucune société ne correspond à cette recherche.' : 'Aucune société inscrite pour le moment.'}
            </p>
          )}
        </div>

        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm" style={{ color: 'var(--ink-3)' }}>
            <span>{total} sociétés · page {page} / {pageCount}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={listHref(params, { page: page - 1 })} className="ev-btn ev-btn--ghost ev-btn--sm">Précédent</Link>
              )}
              {page < pageCount && (
                <Link href={listHref(params, { page: page + 1 })} className="ev-btn ev-btn--ghost ev-btn--sm">Suivant</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
