import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildBatchReports, type BatchReport, type ReportInput } from '@/lib/crm-batches'

const chunks = <T,>(list: T[], size = 200) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

async function inChunks<T>(ids: string[], query: (slice: string[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (const slice of chunks(ids)) {
    const { data, error } = await query(slice)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as T[]))
  }
  return out
}

/** Tout ce qu'il faut pour l'entonnoir des batches : leads, événements Lemlist, appels et deals des sociétés concernées. */
export async function loadBatchReports(db: SupabaseClient): Promise<BatchReport[]> {
  const [{ data: batches, error: bErr }, { data: leads, error: lErr }] = await Promise.all([
    db.from('crm_batches').select('id, code, campaign_name, lemlist_campaign_id, segment, persona, source, angle, cta, hypothesis, created_at'),
    db.from('crm_batch_leads').select('batch_id, contact_id, company_id, entered_at').limit(50000),
  ])
  if (bErr) throw new Error(bErr.message)
  if (lErr) throw new Error(lErr.message)
  const companyIds = [...new Set(((leads ?? []) as ReportInput['leads']).map(l => l.company_id).filter((v): v is string => !!v))]

  const [acts, calls, deals, companies] = await Promise.all([
    inChunks<{ event: string | null; contact_id: string | null; company_id: string | null; body: string | null; metadata: Record<string, unknown> | null }>(companyIds, s =>
      db.from('crm_activities').select('event, contact_id, company_id, body, metadata').eq('source', 'lemlist').in('company_id', s).limit(50000)),
    inChunks<ReportInput['calls'][number]>(companyIds, s =>
      db.from('crm_activities').select('company_id, call_outcome, body, occurred_at').eq('type', 'call').in('company_id', s).limit(50000)),
    inChunks<ReportInput['deals'][number]>(companyIds, s => db.from('crm_deals').select('company_id, name, stage, amount, created_at').in('company_id', s)),
    inChunks<{ id: string; name: string }>(companyIds, s => db.from('companies').select('id, name').in('id', s)),
  ])

  return buildBatchReports({
    batches: (batches ?? []) as ReportInput['batches'],
    leads: (leads ?? []) as ReportInput['leads'],
    lemlist: acts.map(a => ({ event: a.event, contact_id: a.contact_id, company_id: a.company_id, body: a.body, campaign_id: typeof a.metadata?.campaignId === 'string' ? a.metadata.campaignId : null })),
    calls, deals,
    companyNames: new Map(companies.map(c => [c.id, c.name])),
  })
}
