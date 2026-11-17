import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { buildPipeline, DEAL_STAGE_LABEL, isDealStage, type DealRow } from '@/lib/crm-deals'
import { daysUntil } from '@/lib/crm-activities'
import { eur, fmtDate } from '@/components/admin/ui'
import { DealStageSelect, NewDealButton } from '@/components/admin/crm/CrmForms'

export default async function CrmDealsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireCapability('crm')
  const mine = (await searchParams).vue === 'miens'

  const configured = isServiceRoleConfigured()
  const db = configured ? createAdminClient() : null
  const [dealsRes, companiesRes, adminsRes] = db
    ? await Promise.all([
      db.from('crm_deals').select('id, name, stage, amount, next_action, next_action_date, owner_id, company_id, updated_at, companies ( name )'),
      db.from('companies').select('id, name').order('name'),
      db.from('admins').select('user_id, name').order('name'),
    ])
    : [{ data: null, error: null }, { data: null, error: null }, { data: null, error: null }]

  const deals = (dealsRes.data ?? []) as unknown as DealRow[]
  const team = ((adminsRes.data ?? []) as { user_id: string; name: string }[]).map(a => ({ id: a.user_id, name: a.name }))
  const nameOf = (uid: string | null) => team.find(m => m.id === uid)?.name ?? null
  const columns = buildPipeline(deals, { mine, me: admin.userId })
  const open = columns.filter(c => c.stage !== 'signe' && c.stage !== 'perdu')
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="h-12 flex items-center justify-between gap-3 px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div className="text-sm">
          <span className="font-medium" style={{ color: 'var(--ink)' }}>Deals</span>
          <span className="ml-3" style={{ color: 'var(--ink-3)' }}>
            En cours : <span className="ev-mono" style={{ color: 'var(--ink)' }}>{open.reduce((n, c) => n + c.deals.length, 0)}</span>
            {' · '}<span className="ev-mono" style={{ color: 'var(--ink)' }}>{eur(open.reduce((n, c) => n + c.total, 0))}</span>
          </span>
        </div>
        <NewDealButton companies={(companiesRes.data ?? []) as { id: string; name: string }[]} team={team} />
      </div>

      <div className="px-6 pt-3 flex gap-1 border-b" style={{ borderColor: 'var(--line)' }} role="tablist" aria-label="Vues">
        {[['tous', 'Tous les deals', '/admin/crm/deals'], ['miens', 'Mes deals', '/admin/crm/deals?vue=miens']].map(([k, label, href]) => {
          const on = (k === 'miens') === mine
          return (
            <Link key={k} href={href} role="tab" aria-selected={on} className="px-3 py-2 text-sm -mb-px"
              style={{ color: on ? 'var(--ink)' : 'var(--ink-3)', fontWeight: on ? 500 : 400, borderBottom: `2px solid ${on ? 'var(--ink)' : 'transparent'}` }}>
              {label}
            </Link>
          )
        })}
      </div>

      {(dealsRes.error || !configured) && (
        <p className="ev-alert ev-alert--danger mx-6 mt-4">{configured ? 'Impossible de charger les deals. Réessayez dans un instant.' : SERVICE_ROLE_MISSING_MESSAGE}</p>
      )}

      <div className="px-6 py-5 flex gap-3 overflow-x-auto items-start">
        {columns.map(col => (
          <section key={col.stage} className="flex flex-col gap-2 shrink-0" style={{ width: 240 }} aria-label={DEAL_STAGE_LABEL[col.stage]}>
            <header className="px-1">
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {DEAL_STAGE_LABEL[col.stage]} <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{col.deals.length}</span>
              </p>
              <p className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{eur(col.total)}</p>
            </header>
            {col.deals.map(d => {
              const late = d.next_action_date ? (daysUntil(d.next_action_date, today) ?? 0) < 0 : false
              return (
                <article key={d.id} className="ev-card p-3 flex flex-col gap-1.5">
                  <Link href={`/admin/crm/societes/${d.company_id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--ink)' }}>{d.name}</Link>
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{d.companies?.name ?? '—'}{nameOf(d.owner_id) ? ` · ${nameOf(d.owner_id)}` : ''}</p>
                  {d.amount != null && <p className="ev-mono text-sm" style={{ color: 'var(--ink)' }}>{eur(Number(d.amount))}</p>}
                  {(d.next_action || d.next_action_date) && (
                    <p className="text-xs" style={{ color: late ? 'var(--danger)' : 'var(--ink-2)' }}>
                      {d.next_action ?? 'Prochaine action'}{d.next_action_date ? ` · ${fmtDate(d.next_action_date)}` : ''}
                    </p>
                  )}
                  <DealStageSelect dealId={d.id} stage={isDealStage(d.stage) ? d.stage : 'a_contacter'} />
                </article>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
