import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { LEAD_CHANNEL_LABEL, LEAD_SIGNAL_LABEL, LEAD_STATUS_LABEL, LEAD_STATUSES, type LeadChannel } from '@/lib/crm-prepipe'
import { loadPrepipe, primaryContact, type PrepipeCompany } from '@/lib/crm-prepipe-load'
import { getCrmSettings } from '@/lib/crm-prepipe-store'
import { contactName } from '@/lib/crm-deals'
import { fmtDate } from '@/components/admin/ui'
import CallButton from '@/components/admin/crm/CallButton'
import { LeadStatusControl, PrepipeSettingsForm } from '@/components/admin/crm/PrepipeForms'

const VIEWS: [string, string][] = [['tous', 'Tous'], ['inbound', 'Inbound'], ['outbound', 'Outbound']]
const HOT = new Set(['interested', 'replied', 'clicked', 'inscription', 'expert'])

export default async function ProspectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCapability('crm')
  const raw = (await searchParams).vue
  const view = raw === 'inbound' || raw === 'outbound' ? (raw as LeadChannel) : null
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>

  const db = createAdminClient()
  const [all, settings, { data: admins }] = await Promise.all([loadPrepipe(db), getCrmSettings(db), db.from('admins').select('user_id, name').order('name')])
  const team = ((admins ?? []) as { user_id: string; name: string }[]).map(a => ({ id: a.user_id, name: a.name }))
  const items = all.filter(c => !view || c.lead_channel === view)
  const statuses = view === 'outbound' ? LEAD_STATUSES.filter(s => s !== 'qualification') : LEAD_STATUSES
  const count = (ch: string) => (ch === 'tous' ? all.length : all.filter(c => c.lead_channel === ch).length)

  const card = (c: PrepipeCompany) => {
    const p = primaryContact(c)
    return (
      <article key={c.id} className="ev-card p-3 flex flex-col gap-1.5">
        <Link href={`/admin/crm/societes/${c.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--ink)' }}>{c.name}</Link>
        <span className="flex flex-wrap gap-1">
          {c.lead_channel && <span className="ev-tag">{LEAD_CHANNEL_LABEL[c.lead_channel as LeadChannel] ?? c.lead_channel}</span>}
          {c.lead_signal && <span className={HOT.has(c.lead_signal) ? 'ev-tag ev-tag--accent' : 'ev-tag'}>{LEAD_SIGNAL_LABEL[c.lead_signal] ?? c.lead_signal}</span>}
        </span>
        {p && <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{contactName(p)}</span>}
        {p?.phone && <CallButton phone={p.phone} companyId={c.id} contactId={p.id} contactName={contactName(p)} compact />}
        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {c.attempts} appel{c.attempts > 1 ? 's' : ''}{c.lastCallAt ? ` · dernier le ${fmtDate(c.lastCallAt)}` : ''}
          {c.lead_status === 'pas_maintenant' && c.lead_next_date ? ` · relance le ${fmtDate(c.lead_next_date)}` : ''}
          {c.lead_status === 'disqualifie' && c.lead_exit_reason ? ` · ${c.lead_exit_reason}` : ''}
        </span>
        <LeadStatusControl key={`${c.lead_status}-${c.lead_channel}`} companyId={c.id} status={c.lead_status} channel={c.lead_channel} compact />
      </article>
    )
  }

  return (
    <div>
      <div className="h-12 flex items-center justify-between gap-3 px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>Leads</span> <span className="ev-mono text-xs">{all.length}</span>
          <span className="hidden sm:inline"> · qualification inbound et prospection outbound, avant les deals</span>
        </span>
      </div>
      <div className="px-6 pt-3 flex flex-wrap items-center justify-between gap-2 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="flex gap-1" role="tablist" aria-label="Canal">
          {VIEWS.map(([k, label]) => {
            const on = (view ?? 'tous') === k
            return (
              <Link key={k} href={k === 'tous' ? '/admin/crm/prospection' : `/admin/crm/prospection?vue=${k}`} role="tab" aria-selected={on} className="px-3 py-2 text-sm -mb-px"
                style={{ color: on ? 'var(--ink)' : 'var(--ink-3)', fontWeight: on ? 500 : 400, borderBottom: `2px solid ${on ? 'var(--ink)' : 'transparent'}` }}>
                {label} <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{count(k)}</span>
              </Link>
            )
          })}
        </div>
        <details className="pb-2">
          <summary className="text-sm cursor-pointer" style={{ color: 'var(--ink-3)' }}>Réglages</summary>
          <div className="ev-card p-4 mt-2"><PrepipeSettingsForm ownerId={settings.ownerId} threshold={settings.threshold} team={team} /></div>
        </details>
      </div>

      {all.length === 0 && (
        <p className="px-6 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
          Le pré-pipe est vide. Les leads y entrent depuis Lemlist (séquence à {Math.round(settings.threshold * 100)} %, intéressé, réponse, clic), à l’inscription sur l’app, par le formulaire expert, ou depuis une fiche société.
        </p>
      )}

      <div className="px-6 py-5 flex gap-3 overflow-x-auto items-start">
        {statuses.map(s => {
          const list = items.filter(c => c.lead_status === s).sort((a, b) => (b.lead_entered_at ?? '').localeCompare(a.lead_entered_at ?? ''))
          return (
            <section key={s} className="flex flex-col gap-2 shrink-0" style={{ width: 240 }} aria-label={LEAD_STATUS_LABEL[s]}>
              <p className="px-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {LEAD_STATUS_LABEL[s]} <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{list.length}</span>
              </p>
              {list.slice(0, 100).map(card)}
              {list.length > 100 && <p className="px-1 text-xs" style={{ color: 'var(--ink-3)' }}>+ {list.length - 100} autres</p>}
            </section>
          )
        })}
      </div>
    </div>
  )
}
