import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { batchIncomplete, type BatchFields } from '@/lib/crm-batches'
import { fmtDate } from '@/components/admin/ui'

type BatchRow = BatchFields & { id: string; code: string | null; campaign_name: string | null; created_at: string }
type LeadRow = { batch_id: string; company_id: string | null; entered_at: string }

export default async function BatchesPage() {
  await requireCapability('crm')
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>

  const db = createAdminClient()
  const [batchesRes, leadsRes] = await Promise.all([
    db.from('crm_batches').select('id, code, campaign_name, segment, persona, source, angle, cta, hypothesis, created_at'),
    db.from('crm_batch_leads').select('batch_id, company_id, entered_at').limit(50000),
  ])
  const leads = (leadsRes.data ?? []) as LeadRow[]
  const stats = new Map<string, { leads: number; companies: Set<string>; first: string | null }>()
  for (const l of leads) {
    const s = stats.get(l.batch_id) ?? { leads: 0, companies: new Set<string>(), first: null }
    s.leads++
    if (l.company_id) s.companies.add(l.company_id)
    if (!s.first || l.entered_at < s.first) s.first = l.entered_at
    stats.set(l.batch_id, s)
  }
  const batches = ((batchesRes.data ?? []) as BatchRow[])
    .map(b => ({ ...b, stats: stats.get(b.id), start: stats.get(b.id)?.first ?? b.created_at }))
    .sort((a, b) => b.start.localeCompare(a.start))

  return (
    <div>
      <div className="h-12 flex items-center gap-3 px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>Batches</span> <span className="ev-mono text-xs">{batches.length}</span>
          <span className="hidden sm:inline"> · 1 batch = 1 campagne Lemlist, créé et rempli par la synchro</span>
        </span>
      </div>

      {batchesRes.error && <p className="ev-alert ev-alert--danger m-6">Batches indisponibles : la migration crm_batches n’est peut-être pas appliquée.</p>}
      {!batchesRes.error && batches.length === 0 && (
        <p className="px-6 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
          Aucun batch. Chaque campagne Lemlist devient un batch à la prochaine synchro (toutes les heures).
        </p>
      )}

      <ul className="divide-y divide-[var(--line)]">
        {batches.map(b => (
          <li key={b.id}>
            <Link href={`/admin/crm/batches/${b.id}`} className="block px-6 py-3 hover:bg-[var(--raised)]">
              <div className="flex flex-wrap items-center gap-2">
                {b.code && <span className="ev-mono text-xs" style={{ color: 'var(--ink)' }}>{b.code}</span>}
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{b.campaign_name ?? 'Campagne sans nom'}</span>
                {batchIncomplete(b) && <span className="ev-tag">À compléter</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--ink-3)' }}>
                <span>Démarré le {fmtDate(b.start)}</span>
                <span><span className="ev-mono" style={{ color: 'var(--ink)' }}>{b.stats?.leads ?? 0}</span> leads · <span className="ev-mono" style={{ color: 'var(--ink)' }}>{b.stats?.companies.size ?? 0}</span> sociétés</span>
                {b.segment && <span>Segment : {b.segment}</span>}
                {b.angle && <span>Angle : {b.angle}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
