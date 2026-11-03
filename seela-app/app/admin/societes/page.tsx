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
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <span className="text-sm font-medium" style={{ color: '#0E0E0C' }}>Sociétés</span>
        <span className="ml-2 text-xs" style={{ color: '#9A9A93' }}>{companies.length}</span>
      </div>

      <div className="px-6 py-6">
        <form action="/admin/societes" method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={params.query}
            placeholder="Raison sociale, SIREN, contact ou email"
            className="h-9 w-80 max-w-full px-3 rounded-lg border text-sm outline-none focus:border-[#9A9A93]"
            style={{ background: '#fff', borderColor: '#E5E5E3', color: '#0E0E0C' }}
          />
          <button type="submit" className="h-9 px-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style={{ background: '#0E0E0C', color: '#fff' }}>
            Rechercher
          </button>
          {params.query && (
            <Link href="/admin/societes" className="text-xs hover:opacity-70" style={{ color: '#9A9A93' }}>Effacer</Link>
          )}
        </form>

        {(error || !configured) && (
          <p className="mt-4 text-sm px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#991B1B' }}>
            {configured ? 'Impossible de charger les sociétés. Réessayez dans un instant.' : SERVICE_ROLE_MISSING_MESSAGE}
          </p>
        )}

        <div className="mt-4 rounded-xl border overflow-x-auto" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E5E3' }}>
                {HEADERS.map(h => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium whitespace-nowrap" style={{ color: '#9A9A93' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F5F5F4' }}>
                  <td className="px-4 py-3 text-sm max-w-[240px]">
                    <Link href={`/admin/societes/${c.id}`} className="block truncate font-medium underline-offset-2 hover:underline" style={{ color: '#0E0E0C' }}>
                      {c.name ?? 'Société sans nom'}
                    </Link>
                    <span className="block text-xs" style={{ color: '#9A9A93', fontVariantNumeric: 'tabular-nums' }}>
                      {c.siren ?? 'SIREN non renseigné'}{!c.onboarded && ' · onboarding incomplet'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[220px]">
                    <span className="block truncate" style={{ color: '#0E0E0C' }}>{c.contact ?? '—'}</span>
                    {c.email && <span className="block truncate text-xs" style={{ color: '#9A9A93' }}>{c.email}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#0E0E0C' }}>
                    {c.grade ? <>{c.grade} <span style={{ color: '#9A9A93' }}>· {c.score}</span></> : <span style={{ color: '#9A9A93' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>{c.requestCount}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                    {c.requestedAmount > 0 ? eur(c.requestedAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }} title={c.lastRequestAt ? fmtDate(c.lastRequestAt) : undefined}>
                    {c.lastRequestAt ? sinceLabel(c.lastRequestAt, now) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }}>{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && !error && configured && (
            <p className="px-4 py-10 text-sm text-center" style={{ color: '#9A9A93' }}>
              {params.query ? 'Aucune société ne correspond à cette recherche.' : 'Aucune société inscrite pour le moment.'}
            </p>
          )}
        </div>

        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm" style={{ color: '#9A9A93' }}>
            <span>{total} sociétés · page {page} / {pageCount}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={listHref(params, { page: page - 1 })} className="px-3 py-1.5 rounded-lg border hover:opacity-70" style={{ borderColor: '#E5E5E3', background: '#fff', color: '#0E0E0C' }}>Précédent</Link>
              )}
              {page < pageCount && (
                <Link href={listHref(params, { page: page + 1 })} className="px-3 py-1.5 rounded-lg border hover:opacity-70" style={{ borderColor: '#E5E5E3', background: '#fff', color: '#0E0E0C' }}>Suivant</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
