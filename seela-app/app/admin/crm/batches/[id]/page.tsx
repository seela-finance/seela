import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { BATCH_FIELD_LABEL, BATCH_FIELDS, batchIncomplete, type BatchFields } from '@/lib/crm-batches'
import { contactName } from '@/lib/crm-deals'
import { fmtDate } from '@/components/admin/ui'

type Batch = BatchFields & { id: string; code: string | null; campaign_name: string | null; lemlist_campaign_id: string; created_at: string }
type Lead = {
  id: string; entered_at: string; variables: Record<string, string>; company_id: string | null; contact_id: string
  contacts: { first_name: string | null; last_name: string | null; email: string | null; job_title: string | null } | null
  companies: { name: string } | null
}

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability('crm')
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const db = createAdminClient()
  const [{ data: batch }, { data: leadRows }] = await Promise.all([
    db.from('crm_batches').select('*').eq('id', id).maybeSingle(),
    db.from('crm_batch_leads').select('id, entered_at, variables, company_id, contact_id, contacts ( first_name, last_name, email, job_title ), companies ( name )').eq('batch_id', id).order('entered_at'),
  ])
  if (!batch) notFound()
  const b = batch as Batch
  const leads = (leadRows ?? []) as unknown as Lead[]

  return (
    <div>
      <div className="h-12 flex items-center gap-3 px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <Link href="/admin/crm/batches" className="text-sm" style={{ color: 'var(--ink-3)' }}>Batches</Link>
        <span style={{ color: 'var(--ink-3)' }}>/</span>
        <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{b.code ? `${b.code} · ` : ''}{b.campaign_name ?? 'Campagne sans nom'}</span>
      </div>

      <div className="p-6 flex flex-col gap-6 max-w-4xl">
        <section className="ev-card p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="ev-kicker">Hypothèses du batch</span>
            {batchIncomplete(b) && <span className="ev-tag">À compléter</span>}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
            {BATCH_FIELDS.map(f => (
              <div key={f} className="contents">
                <dt style={{ color: 'var(--ink-3)' }}>{BATCH_FIELD_LABEL[f]}</dt>
                <dd style={{ color: b[f] ? 'var(--ink)' : 'var(--ink-3)' }} className="whitespace-pre-line">{b[f] ?? 'Non renseigné dans Lemlist'}</dd>
              </div>
            ))}
          </dl>
          {batchIncomplete(b) && (
            <p className="text-xs mt-3" style={{ color: 'var(--ink-3)' }}>
              Ces champs se remplissent depuis les variables des leads Lemlist : segment (ou secteur), persona, source (ou sourceListe), angle, cta, hypothese.
            </p>
          )}
        </section>

        <section>
          <span className="ev-kicker">Leads <span className="ev-mono">{leads.length}</span></span>
          {leads.length === 0 && <p className="text-sm mt-2" style={{ color: 'var(--ink-3)' }}>Aucun lead pour l’instant : ils arrivent avec les premiers envois.</p>}
          <ul className="mt-2 divide-y divide-[var(--line)] border-y" style={{ borderColor: 'var(--line)' }}>
            {leads.map(l => {
              const vars = Object.entries(l.variables ?? {})
              return (
                <li key={l.id} className="py-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <Link href={`/admin/crm/contacts/${l.contact_id}`} className="font-medium hover:underline" style={{ color: 'var(--ink)' }}>
                      {l.contacts ? contactName(l.contacts) : 'Contact'}
                    </Link>
                    {l.company_id && <Link href={`/admin/crm/societes/${l.company_id}`} className="hover:underline" style={{ color: 'var(--ink-2)' }}>{l.companies?.name ?? 'Société'}</Link>}
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>entré le {fmtDate(l.entered_at)}</span>
                  </div>
                  {vars.length > 0 && (
                    <details className="mt-1">
                      <summary className="text-xs cursor-pointer" style={{ color: 'var(--ink-3)' }}>Textes reçus ({vars.length})</summary>
                      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1 text-xs">
                        {vars.map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="ev-mono" style={{ color: 'var(--ink-3)' }}>{k}</dt>
                            <dd className="whitespace-pre-line" style={{ color: 'var(--ink)' }}>{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
