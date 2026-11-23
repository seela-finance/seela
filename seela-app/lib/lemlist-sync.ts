import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enterPrepipe, getCrmSettings, type CrmSettings } from '@/lib/crm-prepipe-store'
import { autoEntryAllowed, lemlistEntry, stepOf, type LeadEvent } from '@/lib/crm-prepipe'
import { batchCode, batchEntries, batchFieldsFrom, campaignVariables, leadInCampaign, type BatchEntry } from '@/lib/crm-batches'
import { chunkByTime, companyNameFor, syncIsRunning, emailHtmlToText, fillEmpty, mapLemlistLead, type LemlistLead, newSince, pageReachedCursor, type LemlistActivity, type LemlistInboxMessage, type MappedActivity } from '@/lib/crm-lemlist'

const API = 'https://api.lemlist.com/api/activities'
const PAGE = 100
const MAX_PAGES = 100
/** Événements par tranche, et temps de travail d'un passage (le serveur coupe à 5 min). */
const CHUNK = 50
const BUDGET_MS = 3 * 60 * 1000

/** `remaining` : événements laissés au passage suivant (0 = à jour). */
export type LemlistSyncResult = { imported: number; contactsCreated: number; companiesCreated: number; emailsWithContent: number; leadsEntered: number; leadsCompleted: number; batchLeads: number; remaining: number }

export const isLemlistConfigured = () => !!process.env.LEMLIST_API_KEY

const authHeader = (key: string) => ({ Authorization: `Basic ${Buffer.from(`:${key}`).toString('base64')}` })

async function fetchPage(key: string, offset: number): Promise<LemlistActivity[]> {
  // Une coupure réseau ponctuelle (« terminated ») ne doit pas faire échouer tout le passage : un nouvel essai
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${API}?version=v2&limit=${PAGE}&offset=${offset}`, { headers: authHeader(key), cache: 'no-store' })
      if (!res.ok) throw new Error(`Lemlist a répondu ${res.status}`)
      const json = await res.json()
      return (Array.isArray(json) ? json : json.activities ?? []) as LemlistActivity[]
    } catch (err) {
      if (attempt >= 3) throw err
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
}

/** Toute la conversation d'un contact dans la boîte Lemlist (contenu complet des emails envoyés et reçus). */
async function fetchInbox(key: string, lemlistContactId: string): Promise<LemlistInboxMessage[]> {
  const out: LemlistInboxMessage[] = []
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://api.lemlist.com/api/inbox/${encodeURIComponent(lemlistContactId)}?page=${page}`, { headers: authHeader(key), cache: 'no-store' })
    if (!res.ok) break
    const json = (await res.json()) as { data?: LemlistInboxMessage[]; pagination?: { nextPage?: number | null } }
    out.push(...(json.data ?? []))
    if (!json.pagination?.nextPage) break
  }
  return out
}

/**
 * À l'arrivée d'un lead (ou s'il n'a jamais été complété) : la fiche Lemlist du lead remplit les champs vides du
 * contact et de sa société. Une saisie de l'équipe n'est jamais écrasée. Marqué complété par l'identifiant Lemlist.
 */
async function completeLead(db: SupabaseClient, key: string, email: string, contact: { id: string; company_id: string | null }, stats: LemlistSyncResult) {
  const { data: current } = await db.from('contacts').select('first_name, last_name, job_title, linkedin_url, headline, location, lemlist_contact_id').eq('id', contact.id).single()
  if (!current || current.lemlist_contact_id) return
  const res = await fetch(`https://api.lemlist.com/api/leads/${encodeURIComponent(email)}`, { headers: authHeader(key), cache: 'no-store' })
  if (!res.ok) return
  const mapped = mapLemlistLead((await res.json()) as LemlistLead)
  const contactPatch = fillEmpty(current, mapped.contact)
  if (!contactPatch.lemlist_contact_id) contactPatch.lemlist_contact_id = mapped.contact.lemlist_contact_id ?? 'inconnu'
  const { error } = await db.from('contacts').update({ ...contactPatch, updated_at: new Date().toISOString() }).eq('id', contact.id)
  if (error) throw error
  if (contact.company_id) {
    const { data: company } = await db.from('companies').select('lemlist_industry, headcount_bracket, creation_year, location, description, linkedin_url').eq('id', contact.company_id).single()
    const companyPatch = company ? fillEmpty(company, mapped.company) : {}
    if (Object.keys(companyPatch).length) {
      const { error: cErr } = await db.from('companies').update({ ...companyPatch, updated_at: new Date().toISOString() }).eq('id', contact.company_id)
      if (cErr) throw cErr
    }
  }
  stats.leadsCompleted++
}

/**
 * Types des étapes de chaque campagne, dans l'ordre de la séquence (pour l'avancement des leads). Complète `known`
 * avec les campagnes qui manquent (une lecture par campagne, en parallèle).
 */
export async function fetchSequences(campaignIds: string[], known = new Map<string, string[]>()): Promise<Map<string, string[]>> {
  const key = process.env.LEMLIST_API_KEY
  if (!key) return known
  await Promise.all(campaignIds.filter(id => !known.has(id)).map(async id => {
    const res = await fetch(`https://api.lemlist.com/api/campaigns/${encodeURIComponent(id)}/sequences`, { headers: authHeader(key), cache: 'no-store' }).catch(() => null)
    if (!res?.ok) return
    const json = (await res.json()) as Record<string, { steps?: { type?: string }[] }>
    known.set(id, Object.values(json).flatMap(s => (s.steps ?? []).map(step => step.type ?? '')))
  }))
  return known
}

/** Sociétés touchées par ce passage : entrée ou avancée dans le pré-pipe outbound selon leurs événements Lemlist. */
async function routeToPrepipe(db: SupabaseClient, companyIds: string[], sequences: Map<string, string[]>, settings: CrmSettings, stats: LemlistSyncResult) {
  if (!companyIds.length) return
  const rows: { company_id: string; event: string | null; metadata: Record<string, unknown> | null }[] = []
  for (let i = 0; i < companyIds.length; i += 200) {
    const { data, error } = await db.from('crm_activities').select('company_id, event, metadata').eq('source', 'lemlist').in('company_id', companyIds.slice(i, i + 200)).limit(20000)
    if (error) throw error
    rows.push(...((data ?? []) as typeof rows))
  }
  const campaigns = [...new Set(rows.map(r => r.metadata?.campaignId).filter((v): v is string => typeof v === 'string'))]
  await fetchSequences(campaigns, sequences)
  const byCompany = new Map<string, LeadEvent[]>()
  for (const r of rows) {
    const list = byCompany.get(r.company_id) ?? []
    list.push({ event: r.event, campaignId: typeof r.metadata?.campaignId === 'string' ? r.metadata.campaignId : null, sequenceStep: stepOf(r.metadata?.sequenceStep) })
    byCompany.set(r.company_id, list)
  }
  for (const [companyId, events] of byCompany) {
    const entry = lemlistEntry(events, sequences, settings.threshold)
    // Par défaut seuls « intéressé » et « réponse » entrent seuls : le reste se choisit dans « Ajouter des leads »
    if (!entry || !autoEntryAllowed(entry.signal, settings.autoEntry)) continue
    const strong = entry.signal !== 'sequence'
    if (await enterPrepipe(db, companyId, { channel: 'outbound', signal: entry.signal, status: entry.status, strong }, settings)) stats.leadsEntered++
  }
}

/**
 * Batches : chaque campagne vue devient un batch (créé une fois), chaque lead y entre avec la copie de ses variables Lemlist
 * de cette campagne (icebreaker, CTA…), daté de son premier événement. Les champs vides du batch sont remplis depuis ces variables.
 */
async function syncBatches(db: SupabaseClient, key: string, entries: BatchEntry[], stats: LemlistSyncResult) {
  if (!entries.length) return
  const campaigns = new Map<string, string | null>()
  for (const e of entries) if (!campaigns.get(e.campaignId)) campaigns.set(e.campaignId, e.campaignName)
  const { data: existing, error } = await db.from('crm_batches').select('*').in('lemlist_campaign_id', [...campaigns.keys()])
  if (error) throw error
  const batches = new Map<string, Record<string, unknown>>(((existing ?? []) as Record<string, unknown>[]).map(b => [b.lemlist_campaign_id as string, b]))
  for (const [campaignId, name] of campaigns) {
    const cur = batches.get(campaignId)
    if (!cur) {
      const { data, error: insErr } = await db.from('crm_batches').insert({ lemlist_campaign_id: campaignId, campaign_name: name, code: batchCode(name) }).select('*').single()
      if (insErr) throw insErr
      batches.set(campaignId, data)
    } else if (name && name !== cur.campaign_name) {
      const patch = { campaign_name: name, code: batchCode(name) ?? cur.code, updated_at: new Date().toISOString() }
      await db.from('crm_batches').update(patch).eq('id', cur.id as string)
      Object.assign(cur, patch)
    }
  }

  for (const e of entries) {
    const batch = batches.get(e.campaignId)!
    const { data: row } = await db.from('crm_batch_leads').select('id, entered_at').eq('batch_id', batch.id as string).eq('contact_id', e.contactId).maybeSingle()
    if (row) {
      if (e.at < row.entered_at) await db.from('crm_batch_leads').update({ entered_at: e.at }).eq('id', row.id)
      continue
    }
    const res = await fetch(`https://api.lemlist.com/api/leads/${encodeURIComponent(e.email)}?version=v2`, { headers: authHeader(key), cache: 'no-store' })
    const lead = res.ok ? leadInCampaign(await res.json(), e.campaignId) : null
    const variables = campaignVariables(lead?.variables)
    const { error: insErr } = await db.from('crm_batch_leads').insert({
      batch_id: batch.id, contact_id: e.contactId, company_id: e.companyId, lemlist_lead_id: lead?.id ?? e.leadId, entered_at: e.at, variables,
    })
    if (insErr) throw insErr
    stats.batchLeads++
    const patch = fillEmpty(batch, batchFieldsFrom(variables))
    if (Object.keys(patch).length) {
      const { error: upErr } = await db.from('crm_batches').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', batch.id as string)
      if (upErr) throw upErr
      Object.assign(batch, patch)
    }
  }
}

/** Contact du lead (créé s'il manque), rattaché à la société de son domaine ou de son nom (créée s'il le faut). */
async function resolveLead(db: SupabaseClient, lead: MappedActivity['lead'], stats: LemlistSyncResult) {
  const exact = lead.email.replace(/[\\%_]/g, c => `\\${c}`)
  const { data: found } = await db.from('contacts').select('id, company_id').ilike('email', exact).limit(1)
  if (found?.length) return found[0] as { id: string; company_id: string | null }

  let companyId: string | null = null
  if (lead.domain) {
    const { data } = await db.from('companies').select('id').ilike('domain', lead.domain).order('created_at').limit(1)
    companyId = data?.[0]?.id ?? null
  }
  const name = companyNameFor(lead)
  if (!companyId && lead.companyName) {
    const { data } = await db.from('companies').select('id').ilike('name', lead.companyName.replace(/[\\%_]/g, c => `\\${c}`)).order('created_at').limit(1)
    companyId = data?.[0]?.id ?? null
  }
  if (!companyId && name) {
    const { data, error } = await db.from('companies').insert({ name, domain: lead.domain, source: 'Lemlist' }).select('id').single()
    if (error) throw error
    companyId = data.id
    stats.companiesCreated++
  }
  const { data, error } = await db.from('contacts')
    .insert({ email: lead.email, first_name: lead.firstName, last_name: lead.lastName, company_id: companyId })
    .select('id, company_id').single()
  if (error) throw error
  stats.contactsCreated++
  return data as { id: string; company_id: string | null }
}

/** Une tranche d'événements traitée de bout en bout : contacts, activités, contenu des emails, batches, pré-pipe. */
async function processChunk(
  db: SupabaseClient, key: string, events: MappedActivity[], ctx: { leads: Map<string, { id: string; company_id: string | null }>; sequences: Map<string, string[]>; settings: CrmSettings }, stats: LemlistSyncResult,
) {
  const { leads } = ctx
  for (const e of events) {
    if (!leads.has(e.lead.email)) {
      const lead = await resolveLead(db, e.lead, stats)
      leads.set(e.lead.email, lead)
      await completeLead(db, key, e.lead.email, lead, stats)
    }
  }
  const rows = events.map(e => {
    const lead = leads.get(e.lead.email)!
    return {
      type: e.type, source: 'lemlist', external_id: e.externalId, event: e.event, occurred_at: e.occurredAt,
      title: e.title, summary: e.summary, body: e.body, metadata: e.metadata, contact_id: lead.id, company_id: lead.company_id,
    }
  })
  const { data, error } = await db.from('crm_activities').upsert(rows, { onConflict: 'source,external_id' }).select('id')
  if (error) throw error
  stats.imported += data?.length ?? 0

  // Contenu complet : une lecture de la boîte Lemlist par contact ayant échangé des emails dans cette tranche
  const lemlistContacts = [...new Set(events.filter(e => e.event === 'emailsSent' || e.event === 'emailsReplied')
    .map(e => e.metadata.lemlistContactId).filter((v): v is string => typeof v === 'string' && !!v))]
  for (const cid of lemlistContacts) {
    for (const m of await fetchInbox(key, cid)) {
      const text = emailHtmlToText(m.message)
      if (!m.messageId || !text) continue
      const { data: updated } = await db.from('crm_activities').update({ body: text })
        .eq('source', 'lemlist').in('event', ['emailsSent', 'emailsReplied']).eq('metadata->>messageId', m.messageId).select('id')
      stats.emailsWithContent += updated?.length ?? 0
    }
  }

  const entries = batchEntries(events.map(e => {
    const lead = leads.get(e.lead.email)!
    return { campaignId: e.metadata.campaignId, campaignName: e.metadata.campaignName, contactId: lead.id, companyId: lead.company_id, email: e.lead.email, leadId: e.metadata.leadId, at: e.occurredAt }
  }))
  // Un échec des batches ne bloque pas l'import des événements ni le pré-pipe
  await syncBatches(db, key, entries, stats).catch(err => console.error('[lemlist batches]', err))

  const touched = [...new Set(events.map(e => leads.get(e.lead.email)?.company_id).filter((v): v is string => !!v))]
  await routeToPrepipe(db, touched, ctx.sequences, ctx.settings, stats)
}

/**
 * Importe les nouveaux événements Lemlist dans crm_activities. Une seule synchro à la fois, jamais deux fois le même
 * événement (source + identifiant Lemlist). Traitement par tranches, du plus ancien au plus récent : la progression est
 * enregistrée après chaque tranche et le passage s'arrête avant d'être coupé par le serveur. Le passage suivant reprend
 * là où celui-ci s'est arrêté. `full` repart du début de l'historique.
 */
export async function syncLemlist(db: SupabaseClient, opts: { full?: boolean; budgetMs?: number } = {}): Promise<LemlistSyncResult | { skipped: string }> {
  const key = process.env.LEMLIST_API_KEY
  if (!key) return { skipped: 'Clé Lemlist absente' }
  const deadline = Date.now() + (opts.budgetMs ?? BUDGET_MS)

  const { data: state } = await db.from('crm_sync_state').select('*').eq('source', 'lemlist').maybeSingle()
  if (syncIsRunning(state?.running_since ?? null, new Date())) return { skipped: 'Synchronisation déjà en cours' }
  await db.from('crm_sync_state').upsert({ source: 'lemlist', running_since: new Date().toISOString() })

  const stats: LemlistSyncResult = { imported: 0, contactsCreated: 0, companiesCreated: 0, emailsWithContent: 0, leadsEntered: 0, leadsCompleted: 0, batchLeads: 0, remaining: 0 }
  const cursor: string | null = opts.full ? null : state?.last_event_at ?? null
  try {
    const all: LemlistActivity[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const items = await fetchPage(key, page * PAGE)
      all.push(...items)
      if (items.length < PAGE || pageReachedCursor(items, cursor)) break
    }
    const events = newSince(all, cursor)
    const ctx = { leads: new Map<string, { id: string; company_id: string | null }>(), sequences: new Map<string, string[]>(), settings: await getCrmSettings(db) }
    let done = 0
    for (const chunk of chunkByTime(events, CHUNK)) {
      if (Date.now() > deadline) break
      await processChunk(db, key, chunk, ctx, stats)
      done += chunk.length
      stats.remaining = events.length - done
      await db.from('crm_sync_state').upsert({ source: 'lemlist', last_event_at: chunk.at(-1)!.occurredAt, last_result: stats })
    }

    // Tout est traité : on avance jusqu'à l'activité la plus récente, même ignorée (étape sautée…)
    const latest = all.reduce<string | null>((m, a) => (!m || a.createdAt > m ? a.createdAt : m), cursor)
    await db.from('crm_sync_state').upsert({
      source: 'lemlist', ...(stats.remaining === 0 ? { last_event_at: latest } : {}),
      last_run_at: new Date().toISOString(), running_since: null, last_error: null, last_result: stats,
    })
    return stats
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db.from('crm_sync_state').upsert({ source: 'lemlist', last_run_at: new Date().toISOString(), running_since: null, last_error: message.slice(0, 500), last_result: stats })
    throw err
  }
}
