import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { LEAD_STATUSES, orderForSession } from '@/lib/crm-prepipe'
import { loadPrepipe } from '@/lib/crm-prepipe-load'
import { SessionStart, SessionSummary } from '@/components/admin/crm/CallSession'

export default async function CallSessionStartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCapability('crm')
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>
  const finished = (await searchParams).fin === '1'
  const all = await loadPrepipe(createAdminClient())
  // Ordre global calculé ici ; le choix des statuts et du canal filtre sans réordonner
  const ordered = orderForSession(all, [...LEAD_STATUSES], null, new Date())
  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Session d’appels</span>
      </div>
      <div className="px-6 py-5 flex flex-col gap-4">
        {finished && <SessionSummary />}
        <SessionStart items={ordered.map(c => ({ id: c.id, status: c.lead_status ?? '', channel: c.lead_channel }))} />
      </div>
    </div>
  )
}
