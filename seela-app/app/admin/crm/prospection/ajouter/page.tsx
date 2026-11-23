import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { loadOutboundBase } from '@/lib/crm-outbound-load'
import { sortOutbound } from '@/lib/crm-outbound'
import { OutboundPicker } from '@/components/admin/crm/OutboundPicker'

export default async function AddOutboundLeadsPage() {
  await requireCapability('crm')
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>
  const { rows, batches, sequencesKnown } = await loadOutboundBase(createAdminClient())

  return (
    <div>
      <div className="h-12 flex items-center justify-between gap-3 px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
          <Link href="/admin/crm/prospection?vue=outbound" className="hover:underline">Leads outbound</Link>
          <span> / </span>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>Ajouter des leads</span> <span className="ev-mono text-xs">{rows.length}</span>
        </span>
      </div>
      <div className="px-6 py-5">
        {!sequencesKnown && (
          <p className="ev-alert mb-4">Séquences Lemlist indisponibles pour une partie des campagnes : l’avancement en % peut manquer sur certaines sociétés.</p>
        )}
        <OutboundPicker rows={sortOutbound(rows)} batches={batches} />
      </div>
    </div>
  )
}
