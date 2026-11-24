import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { kindLabel, OPEN_STATUSES, statusInfo } from '@/lib/contract-requests'
import { loadAllContractRequests } from '@/lib/contract-requests-store'
import { requestLabel } from '@/lib/request-label'
import { requestStatusInfo } from '@/lib/status'
import { Badge, fmtDateTime } from '@/components/admin/ui'

// Onglet « Demandes » : toutes les demandes des clients sur leurs contrats (docs/contrat-client.md).
// Les ouvertes en tête ; chaque ligne mène à la fiche dossier, où l'on répond.
export default async function AdminContractRequestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin()
  const { tab } = await searchParams
  const all = tab === 'all'
  const rows = isServiceRoleConfigured() ? await loadAllContractRequests(createAdminClient()) : null
  const open = (rows ?? []).filter(r => OPEN_STATUSES.some(s => s === r.status))
  const shown = all ? rows ?? [] : open

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Demandes</span>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h1 className="ev-display" style={{ fontSize: 22, color: 'var(--ink)' }}>Demandes des clients</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>Report d’échéance, rachat anticipé, matériel, administratif. Réponse depuis la fiche dossier.</p>
          </div>
          <div className="flex gap-1">
            {[{ key: 'open', label: 'Ouvertes', count: open.length }, { key: 'all', label: 'Toutes', count: rows?.length ?? 0 }].map(t => {
              const active = (t.key === 'all') === all
              return (
                <Link key={t.key} href={t.key === 'all' ? '/admin/demandes?tab=all' : '/admin/demandes'} className="px-3 py-1.5 rounded-md text-sm" style={{ background: active ? 'var(--raised)' : undefined, color: active ? 'var(--ink)' : 'var(--ink-3)', fontWeight: active ? 500 : 400 }}>
                  {t.label} <span className="ev-mono text-xs">{t.count}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {rows === null ? (
          <p className="ev-alert ev-alert--danger">{SERVICE_ROLE_MISSING_MESSAGE}</p>
        ) : shown.length === 0 ? (
          <div className="ev-card ev-card--dashed text-center py-14 px-6">
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{all ? 'Aucune demande pour l’instant.' : 'Aucune demande ouverte.'}</p>
          </div>
        ) : (
          <div className="ev-card overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Reçue le', 'Société', 'Dossier', 'Nature', 'Message', 'État'].map(h => <th key={h} className="ev-kicker px-4 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map(r => {
                  const info = statusInfo(r.status)
                  const req = r.financing_requests
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDateTime(r.created_at)}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>{req?.companies?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                        {req ? (
                          <Link href={`/admin/dossiers/${req.id}`} className="ev-mono underline" style={{ color: 'var(--ink)' }}>{requestLabel(req)}</Link>
                        ) : '—'}
                        {req && <span className="ml-2 inline-block align-middle"><Badge info={requestStatusInfo(req.status)} /></span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>{kindLabel(r.kind)}</td>
                      <td className="px-4 py-2.5 text-sm max-w-[320px] truncate" style={{ color: 'var(--ink-2)' }} title={r.message}>{r.message}</td>
                      <td className="px-4 py-2.5"><span className={info.tag}><span className="ev-tag__dot" />{info.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
