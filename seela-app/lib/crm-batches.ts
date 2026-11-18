// Batches outbound (1 batch = 1 campagne Lemlist) : lecture des variables Lemlist et attribution des deals. Fonctions pures, testées.

export type BatchFields = { segment: string | null; persona: string | null; source: string | null; angle: string | null; cta: string | null; hypothesis: string | null }

export const BATCH_FIELDS: (keyof BatchFields)[] = ['segment', 'persona', 'source', 'angle', 'cta', 'hypothesis']

export const BATCH_FIELD_LABEL: Record<keyof BatchFields, string> = {
  segment: 'Segment', persona: 'Persona', source: 'Source', angle: 'Angle', cta: 'CTA', hypothesis: 'Hypothèse testée',
}

/** Variables Lemlist lues pour chaque champ du batch, par ordre de priorité (insensible à la casse). */
const FIELD_KEYS: Record<keyof BatchFields, string[]> = {
  segment: ['segment', 'secteur'],
  persona: ['persona'],
  source: ['source', 'sourceliste'],
  angle: ['angle'],
  cta: ['cta', 'ctaa', 'ctab'],
  hypothesis: ['hypothese', 'hypothesis'],
}

/** Variables standard de Lemlist (et toutes les companyXxx) : pas des textes de campagne, on ne les copie pas. */
const STANDARD = new Set([
  'email', 'firstname', 'lastname', 'companyname', 'companydomain', 'jobtitle', 'phone', 'picture', 'linkedinurl', 'linkedinurlsalesnav',
  'industry', 'location', 'summary', 'tagline', 'timezone', 'skills', 'languages', 'jobdescription',
])

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null)

/** « B05 · Boulangeries IDF » → « B05 ». null si le nom ne commence pas par un numéro de batch. */
export function batchCode(campaignName: string | null | undefined): string | null {
  const m = campaignName?.trim().match(/^B\s?(\d{1,4})(?![\p{L}\d])/iu)
  return m ? `B${m[1].padStart(2, '0')}` : null
}

/** Variables propres à la campagne (icebreaker, positionnement, CTA, segment…), sans les champs standard. */
export function campaignVariables(variables: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(variables ?? {})) {
    const t = text(v)
    const key = k.toLowerCase()
    if (t && !STANDARD.has(key) && !key.startsWith('company')) out[k] = t.slice(0, 5000)
  }
  return out
}

/** Champs du batch lus dans les variables d'un lead. */
export function batchFieldsFrom(variables: Record<string, string>): BatchFields {
  const lower = new Map(Object.entries(variables).map(([k, v]) => [k.toLowerCase(), v]))
  const out = {} as BatchFields
  for (const f of BATCH_FIELDS) out[f] = FIELD_KEYS[f].map(k => lower.get(k)).find(Boolean) ?? null
  return out
}

/** Batch à compléter : il manque le segment, l'angle ou le CTA (les variables n'ont pas été renseignées dans Lemlist). */
export const batchIncomplete = (b: Partial<BatchFields>) => !b.segment || !b.angle || !b.cta

/** Une entrée d'un lead dans un batch, telle que lue par la synchro dans ses événements Lemlist. */
export type BatchEntry = { campaignId: string; campaignName: string | null; contactId: string; companyId: string | null; email: string; leadId: string | null; at: string }

/** Une entrée par (campagne, contact), datée de son premier événement. */
export function batchEntries(events: { campaignId: unknown; campaignName: unknown; contactId: string; companyId: string | null; email: string; leadId: unknown; at: string }[]): BatchEntry[] {
  const out = new Map<string, BatchEntry>()
  for (const e of events) {
    if (typeof e.campaignId !== 'string' || !e.campaignId) continue
    const key = `${e.campaignId}|${e.contactId}`
    const cur = out.get(key)
    if (!cur || e.at < cur.at) {
      out.set(key, {
        campaignId: e.campaignId, campaignName: text(e.campaignName) ?? cur?.campaignName ?? null, contactId: e.contactId, companyId: e.companyId,
        email: e.email, leadId: typeof e.leadId === 'string' ? e.leadId : cur?.leadId ?? null, at: e.at,
      })
    }
  }
  return [...out.values()]
}

/** Dans la réponse de GET /api/leads/{email}?version=v2 : le lead de cette campagne. */
export function leadInCampaign(payload: unknown, campaignId: string): { id: string | null; variables: Record<string, unknown> } | null {
  const list = Array.isArray(payload) ? payload : payload && typeof payload === 'object' ? [payload] : []
  const found = list.find(l => (l as { campaign?: { id?: string }; campaignId?: string })?.campaign?.id === campaignId || (l as { campaignId?: string })?.campaignId === campaignId) as
    | { _id?: string; variables?: Record<string, unknown> } | undefined
  return found ? { id: typeof found._id === 'string' ? found._id : null, variables: found.variables ?? {} } : null
}

/** Le batch qui reçoit le crédit d'un deal : le dernier où sa société est entrée avant la création du deal. */
export function attributedBatch<T extends { entered_at: string }>(dealCreatedAt: string, entries: T[]): T | null {
  const deal = Date.parse(dealCreatedAt)
  return entries
    .filter(e => Date.parse(e.entered_at) <= deal)
    .reduce<T | null>((best, e) => (!best || Date.parse(e.entered_at) > Date.parse(best.entered_at) ? e : best), null)
}

// ─── Performance par batch (export pour les skills /batch et /revue) ──────────

export type BatchFunnel = { sent: number; replied: number; positive: number; calls: number; connected: number; rdv: number; deals: number; deals_qualified: number; won_count: number; won_amount: number }

export type BatchReport = BatchFields & {
  id: string; code: string | null; campaign_name: string | null; lemlist_campaign_id: string; started_at: string
  leads: number; companies: number; funnel: BatchFunnel
  deals: { name: string; stage: string; amount: number | null; created_at: string }[]
  replies: { company: string | null; text: string }[]
  call_notes: { company: string | null; outcome: string | null; text: string }[]
}

export type ReportInput = {
  batches: (BatchFields & { id: string; code: string | null; campaign_name: string | null; lemlist_campaign_id: string; created_at: string })[]
  leads: { batch_id: string; contact_id: string; company_id: string | null; entered_at: string }[]
  lemlist: { event: string | null; contact_id: string | null; company_id: string | null; campaign_id: string | null; body: string | null }[]
  calls: { company_id: string | null; call_outcome: string | null; body: string | null; occurred_at: string }[]
  deals: { company_id: string; name: string; stage: string; amount: number | string | null; created_at: string }[]
  companyNames: Map<string, string>
}

export const CONNECTED_OUTCOMES = ['pas_interesse', 'a_rappeler', 'interesse', 'rdv_pris']
export const QUALIFIED_STAGES = ['evaluating', 'negociating', 'closing_confirmed', 'won']
const SENT = ['emailsSent', 'linkedinSent']
const REPLIED = ['emailsReplied', 'linkedinReplied']
const POSITIVE = ['emailsInterested', 'linkedinInterested']

/** Entonnoir de chaque batch : Lemlist par campagne, appels et deals attribués au dernier batch de la société avant l'événement. */
export function buildBatchReports(input: ReportInput): BatchReport[] {
  const byCompany = new Map<string, { batch_id: string; entered_at: string }[]>()
  for (const l of input.leads) {
    if (!l.company_id) continue
    const list = byCompany.get(l.company_id) ?? []
    if (!list.some(e => e.batch_id === l.batch_id && e.entered_at <= l.entered_at)) list.push({ batch_id: l.batch_id, entered_at: l.entered_at })
    byCompany.set(l.company_id, list)
  }
  const batchOf = (companyId: string | null, at: string) => (companyId ? attributedBatch(at, byCompany.get(companyId) ?? [])?.batch_id ?? null : null)
  const name = (companyId: string | null) => (companyId ? input.companyNames.get(companyId) ?? null : null)

  return input.batches.map(b => {
    const leads = input.leads.filter(l => l.batch_id === b.id)
    const acts = input.lemlist.filter(a => a.campaign_id === b.lemlist_campaign_id)
    const contactsWith = (events: string[]) => new Set(acts.filter(a => a.event && events.includes(a.event)).map(a => a.contact_id)).size
    const calls = input.calls.filter(c => batchOf(c.company_id, c.occurred_at) === b.id)
    const deals = input.deals.filter(d => batchOf(d.company_id, d.created_at) === b.id).map(d => ({ name: d.name, stage: d.stage, amount: d.amount === null ? null : Number(d.amount), created_at: d.created_at }))
    const won = deals.filter(d => d.stage === 'won')
    return {
      ...b,
      started_at: leads.reduce((m, l) => (l.entered_at < m ? l.entered_at : m), leads[0]?.entered_at ?? b.created_at),
      leads: leads.length,
      companies: new Set(leads.map(l => l.company_id).filter(Boolean)).size,
      funnel: {
        sent: contactsWith(SENT), replied: contactsWith(REPLIED), positive: contactsWith(POSITIVE),
        calls: calls.length, connected: calls.filter(c => c.call_outcome && CONNECTED_OUTCOMES.includes(c.call_outcome)).length,
        rdv: calls.filter(c => c.call_outcome === 'rdv_pris').length,
        deals: deals.length, deals_qualified: deals.filter(d => QUALIFIED_STAGES.includes(d.stage)).length,
        won_count: won.length, won_amount: won.reduce((s, d) => s + (d.amount ?? 0), 0),
      },
      deals,
      replies: acts.filter(a => a.event && REPLIED.includes(a.event) && a.body).map(a => ({ company: name(a.company_id), text: a.body!.slice(0, 2000) })),
      call_notes: calls.filter(c => c.body).map(c => ({ company: name(c.company_id), outcome: c.call_outcome, text: c.body!.slice(0, 2000) })),
    }
  }).sort((a, b) => b.started_at.localeCompare(a.started_at))
}

/** Export JSON lu par les skills /batch et /revue (format figé : voir .claude/skills/revue). */
export function batchExport(reports: BatchReport[], now: Date) {
  return {
    generated_at: now.toISOString(),
    batches: reports.map(r => ({
      code: r.code, campaign_name: r.campaign_name, lemlist_campaign_id: r.lemlist_campaign_id,
      segment: r.segment, persona: r.persona, source: r.source, angle: r.angle, cta: r.cta, hypothesis: r.hypothesis,
      started_at: r.started_at, leads: r.leads, companies: r.companies, funnel: r.funnel,
      deals: r.deals, replies: r.replies, call_notes: r.call_notes,
    })),
  }
}
