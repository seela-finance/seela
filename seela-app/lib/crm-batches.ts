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

/** Variables standard de Lemlist : pas des textes de campagne, on ne les copie pas. */
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
    if (t && !STANDARD.has(k.toLowerCase())) out[k] = t.slice(0, 5000)
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
