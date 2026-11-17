import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enterPrepipe, getCrmSettings } from '@/lib/crm-prepipe-store'
import { lemlistEntry, type LeadEvent } from '@/lib/crm-prepipe'
import { companyNameFor, emailHtmlToText, fillEmpty, mapLemlistLead, type LemlistLead, newSince, pageReachedCursor, type LemlistActivity, type LemlistInboxMessage, type MappedActivity } from '@/lib/crm-lemlist'

const API = 'https://api.lemlist.com/api/activities'
const PAGE = 100
const MAX_PAGES = 100
const LOCK_MS = 15 * 60 * 1000

export type LemlistSyncResult = { imported: number; contactsCreated: number; companiesCreated: number; emailsWithContent: number; leadsEntered: number; leadsCompleted: number }

export const isLemlistConfigured = () => !!process.env.LEMLIST_API_KEY

const authHeader = (key: string) => ({ Authorization: `Basic ${Buffer.from(`:${key}`).toString('base64')}` })

async function fetchPage(key: string, offset: number): Promise<LemlistActivity[]> {
  const res = await fetch(`${API}?version=v2&limit=${PAGE}&offset=${offset}`, { headers: authHeader(key), cache: 'no-store' })
  if (!res.ok) throw new Error(`Lemlist a répondu ${res.status}`)
  const json = await res.json()
  return (Array.isArray(json) ? json : json.activities ?? []) as LemlistActivity[]
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

/** Types des étapes de chaque campagne, dans l'ordre de la séquence (pour l'avancement des leads). */
async function fetchSequences(key: string, campaignIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  for (const id of campaignIds) {
    const res = await fetch(`https://api.lemlist.com/api/campaigns/${encodeURIComponent(id)}/sequences`, { headers: authHeader(key), cache: 'no-store' })
    if (!res.ok) continue
    const json = (await res.json()) as Record<string, { steps?: { type?: string }[] }>
    out.set(id, Object.values(json).flatMap(s => (s.steps ?? []).map(step => step.type ?? '')))
  }
  return out
}

/** Lemlist donne l'étape tantôt en nombre, tantôt en texte. */
const stepOf = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

/** Sociétés touchées par ce passage : entrée ou avancée dans le pré-pipe outbound selon leurs événements Lemlist. */
async function routeToPrepipe(db: SupabaseClient, key: string, companyIds: string[], stats: LemlistSyncResult) {
  if (!companyIds.length) return
  const settings = await getCrmSettings(db)
  const rows: { company_id: string; event: string | null; metadata: Record<string, unknown> | null }[] = []
  for (let i = 0; i < companyIds.length; i += 200) {
    const { data, error } = await db.from('crm_activities').select('company_id, event, metadata').eq('source', 'lemlist').in('company_id', companyIds.slice(i, i + 200)).limit(20000)
    if (error) throw error
    rows.push(...((data ?? []) as typeof rows))
  }
  const campaigns = [...new Set(rows.map(r => r.metadata?.campaignId).filter((v): v is string => typeof v === 'string'))]
  const sequences = await fetchSequences(key, campaigns)
  const byCompany = new Map<string, LeadEvent[]>()
  for (const r of rows) {
    const list = byCompany.get(r.company_id) ?? []
    list.push({ event: r.event, campaignId: typeof r.metadata?.campaignId === 'string' ? r.metadata.campaignId : null, sequenceStep: stepOf(r.metadata?.sequenceStep) })
    byCompany.set(r.company_id, list)
  }
  for (const [companyId, events] of byCompany) {
    const entry = lemlistEntry(events, sequences, settings.threshold)
    if (!entry) continue
    const strong = entry.signal !== 'sequence'
    if (await enterPrepipe(db, companyId, { channel: 'outbound', signal: entry.signal, status: entry.status, strong }, settings)) stats.leadsEntered++
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

/**
 * Importe les nouveaux événements Lemlist dans crm_activities. Une seule synchro à la fois (verrou de 5 min),
 * jamais deux fois le même événement (source + identifiant Lemlist). `full` reprend tout l'historique.
 */
export async function syncLemlist(db: SupabaseClient, opts: { full?: boolean } = {}): Promise<LemlistSyncResult | { skipped: string }> {
  const key = process.env.LEMLIST_API_KEY
  if (!key) return { skipped: 'Clé Lemlist absente' }

  const { data: state } = await db.from('crm_sync_state').select('*').eq('source', 'lemlist').maybeSingle()
  if (state?.running_since && Date.now() - Date.parse(state.running_since) < LOCK_MS) return { skipped: 'Synchronisation déjà en cours' }
  await db.from('crm_sync_state').upsert({ source: 'lemlist', running_since: new Date().toISOString() })

  const stats: LemlistSyncResult = { imported: 0, contactsCreated: 0, companiesCreated: 0, emailsWithContent: 0, leadsEntered: 0, leadsCompleted: 0 }
  const cursor: string | null = opts.full ? null : state?.last_event_at ?? null
  try {
    const all: LemlistActivity[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const items = await fetchPage(key, page * PAGE)
      all.push(...items)
      if (items.length < PAGE || pageReachedCursor(items, cursor)) break
    }
    const events = newSince(all, cursor)
    const leads = new Map<string, { id: string; company_id: string | null }>()
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
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await db.from('crm_activities').upsert(rows.slice(i, i + 500), { onConflict: 'source,external_id' }).select('id')
      if (error) throw error
      stats.imported += data?.length ?? 0
    }
    // Contenu complet : une lecture de la boîte Lemlist par contact ayant échangé des emails dans ce passage
    const lemlistContacts = [...new Set(events.filter(e => e.event === 'emailsSent' || e.event === 'emailsReplied')
      .map(e => e.metadata.lemlistContactId).filter((v): v is string => typeof v === 'string' && !!v))]
    for (const cid of lemlistContacts) {
      for (const m of await fetchInbox(key, cid)) {
        const text = emailHtmlToText(m.message)
        if (!m.messageId || !text) continue
        const { data } = await db.from('crm_activities').update({ body: text })
          .eq('source', 'lemlist').in('event', ['emailsSent', 'emailsReplied']).eq('metadata->>messageId', m.messageId).select('id')
        stats.emailsWithContent += data?.length ?? 0
      }
    }

    const touched = [...new Set(events.map(e => leads.get(e.lead.email)?.company_id).filter((v): v is string => !!v))]
    await routeToPrepipe(db, key, touched, stats)

    const latest = all.reduce<string | null>((m, a) => (!m || a.createdAt > m ? a.createdAt : m), cursor)
    await db.from('crm_sync_state').upsert({
      source: 'lemlist', last_event_at: latest, last_run_at: new Date().toISOString(), running_since: null, last_error: null, last_result: stats,
    })
    return stats
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db.from('crm_sync_state').upsert({ source: 'lemlist', last_run_at: new Date().toISOString(), running_since: null, last_error: message.slice(0, 500) })
    throw err
  }
}
