import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { contactName } from '@/lib/crm-deals'
import { stepOf } from '@/lib/crm-prepipe'
import { outboundProfile, type OutboundEvent, type OutboundRow } from '@/lib/crm-outbound'
import { fetchSequences } from '@/lib/lemlist-sync'

export type OutboundBatch = { id: string; label: string; campaignName: string | null; segment: string | null; companies: number }

const chunks = <T,>(list: T[], size = 200) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

type Company = {
  id: string; name: string; lemlist_industry: string | null
  contacts: { id: string; first_name: string | null; last_name: string | null; email: string | null; job_title: string | null; phone: string | null }[] | null
}
type Activity = { company_id: string; event: string | null; occurred_at: string; metadata: Record<string, unknown> | null }
type BatchLead = { company_id: string; batch_id: string; entered_at: string }
type Batch = { id: string; code: string | null; campaign_name: string | null; segment: string | null; angle: string | null; lemlist_campaign_id: string }

export const batchLabel = (b: Pick<Batch, 'code' | 'campaign_name'>) => b.code ?? b.campaign_name ?? 'Batch sans nom'

/** Événements Lemlist des sociétés, groupés par société. */
export async function loadLemlistEvents(db: SupabaseClient, companyIds: string[]): Promise<Map<string, OutboundEvent[]>> {
  const out = new Map<string, OutboundEvent[]>()
  for (const slice of chunks(companyIds)) {
    const { data, error } = await db.from('crm_activities').select('company_id, event, occurred_at, metadata').eq('source', 'lemlist').in('company_id', slice).limit(50000)
    if (error) throw new Error(error.message)
    for (const a of (data ?? []) as Activity[]) {
      const list = out.get(a.company_id) ?? []
      list.push({ event: a.event, occurredAt: a.occurred_at, campaignId: typeof a.metadata?.campaignId === 'string' ? a.metadata.campaignId : null, sequenceStep: stepOf(a.metadata?.sequenceStep) })
      out.set(a.company_id, list)
    }
  }
  return out
}

/**
 * Base outbound hors pré-pipe : prospects sans lead status, avec leur chaleur Lemlist, leur dernier batch (segment,
 * angle) et leurs contacts joignables. Les clients, partenaires et exclus n'y figurent pas.
 */
export async function loadOutboundBase(db: SupabaseClient): Promise<{ rows: OutboundRow[]; batches: OutboundBatch[]; sequencesKnown: boolean }> {
  const [{ data: companies, error }, { data: batches, error: bErr }] = await Promise.all([
    db.from('companies').select('id, name, lemlist_industry, contacts ( id, first_name, last_name, email, job_title, phone )')
      .is('lead_status', null).eq('lifecycle_stage', 'prospect').limit(5000),
    db.from('crm_batches').select('id, code, campaign_name, segment, angle, lemlist_campaign_id').order('created_at'),
  ])
  if (error) throw new Error(error.message)
  if (bErr) throw new Error(bErr.message)
  const list = (companies ?? []) as Company[]
  const ids = list.map(c => c.id)

  const events = await loadLemlistEvents(db, ids)
  const leads: BatchLead[] = []
  for (const slice of chunks(ids)) {
    const { data, error: lErr } = await db.from('crm_batch_leads').select('company_id, batch_id, entered_at').in('company_id', slice).limit(50000)
    if (lErr) throw new Error(lErr.message)
    leads.push(...((data ?? []) as BatchLead[]))
  }
  const batchById = new Map(((batches ?? []) as Batch[]).map(b => [b.id, b]))
  const lastBatch = new Map<string, BatchLead>()
  for (const l of leads) {
    const cur = lastBatch.get(l.company_id)
    if (!cur || l.entered_at > cur.entered_at) lastBatch.set(l.company_id, l)
  }

  const campaigns = [...new Set([...events.values()].flat().map(e => e.campaignId).filter((v): v is string => !!v))]
  const sequences = await fetchSequences(campaigns)

  const rows: OutboundRow[] = list.map(c => {
    const batch = lastBatch.has(c.id) ? batchById.get(lastBatch.get(c.id)!.batch_id) ?? null : null
    const contacts = c.contacts ?? []
    const main = contacts.find(p => p.phone?.trim()) ?? contacts[0] ?? null
    return {
      id: c.id, name: c.name, industry: c.lemlist_industry,
      ...outboundProfile(events.get(c.id) ?? [], sequences),
      segment: batch?.segment ?? null, batchId: batch?.id ?? null, batchLabel: batch ? batchLabel(batch) : null, angle: batch?.angle ?? null,
      contact: main ? { name: contactName(main), title: main.job_title } : null,
      contacts: contacts.length, phones: contacts.filter(p => p.phone?.trim()).length,
    }
  })

  const perBatch = new Map<string, Set<string>>()
  for (const l of leads) perBatch.set(l.batch_id, (perBatch.get(l.batch_id) ?? new Set()).add(l.company_id))
  return {
    rows,
    batches: ((batches ?? []) as Batch[]).map(b => ({ id: b.id, label: batchLabel(b), campaignName: b.campaign_name, segment: b.segment, companies: perBatch.get(b.id)?.size ?? 0 })),
    sequencesKnown: campaigns.every(id => sequences.has(id)),
  }
}
