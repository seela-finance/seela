import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { bestPhone, ENRICH_BATCH, FINAL_STATUSES, pickEnrichable, toFullEnrichItem, type EnrichableContact, type FullEnrichResult } from '@/lib/crm-enrich'

const API = 'https://app.fullenrich.com/api/v2'

export const isFullEnrichConfigured = () => !!process.env.FULLENRICH_API_KEY
const headers = () => ({ Authorization: `Bearer ${process.env.FULLENRICH_API_KEY}`, 'Content-Type': 'application/json' })

// FullEnrich renvoie parfois des caractères de contrôle bruts dans ses textes (JSON invalide) : on les neutralise
async function readJson<T>(res: Response): Promise<T> {
  return JSON.parse((await res.text()).replace(/[\u0000-\u001F]/g, ' ')) as T
}

export async function fullEnrichCredits(): Promise<number | null> {
  if (!isFullEnrichConfigured()) return null
  try {
    const res = await fetch(`${API}/account/credits`, { headers: headers(), cache: 'no-store' })
    return res.ok ? ((await readJson<{ balance?: number }>(res)).balance ?? null) : null
  } catch {
    return null
  }
}

type ContactRow = { id: string; first_name: string | null; last_name: string | null; phone: string | null; linkedin_url: string | null; companies: { domain: string | null; name: string } | null }

/** Contacts des sociétés choisies, prêts pour l'enrichissement. */
export async function enrichableContacts(db: SupabaseClient, companyIds: string[]): Promise<EnrichableContact[]> {
  const out: EnrichableContact[] = []
  for (let i = 0; i < companyIds.length; i += 200) {
    const { data, error } = await db.from('contacts').select('id, first_name, last_name, phone, linkedin_url, companies ( domain, name )').in('company_id', companyIds.slice(i, i + 200))
    if (error) throw error
    for (const r of (data ?? []) as unknown as ContactRow[]) {
      out.push({ id: r.id, first_name: r.first_name, last_name: r.last_name, phone: r.phone, linkedin_url: r.linkedin_url, company_domain: r.companies?.domain ?? null, company_name: r.companies?.name ?? null })
    }
  }
  return out
}

/** Lance l'enrichissement des téléphones manquants (lots de 100). Retourne les demandes créées. */
export async function startPhoneEnrichment(db: SupabaseClient, companyIds: string[], actorId: string) {
  const { send, unidentifiable } = pickEnrichable(await enrichableContacts(db, companyIds))
  const ids: string[] = []
  for (let i = 0; i < send.length; i += ENRICH_BATCH) {
    const batch = send.slice(i, i + ENRICH_BATCH)
    const res = await fetch(`${API}/contact/enrich/bulk?silentFail=true`, {
      method: 'POST', headers: headers(), cache: 'no-store',
      body: JSON.stringify({ name: `CRM everlease · session d'appels · ${new Date().toISOString().slice(0, 16)}`, data: batch.map(toFullEnrichItem) }),
    })
    if (!res.ok) throw new Error(`FullEnrich a refusé la demande (${res.status})`)
    const { enrichment_id } = await readJson<{ enrichment_id: string }>(res)
    const { data, error } = await db.from('crm_enrichments').insert({ external_id: enrichment_id, contact_ids: batch.map(c => c.id), requested_by: actorId }).select('id').single()
    if (error) throw error
    ids.push(data.id as string)
  }
  return { enrichmentIds: ids, sent: send.length, unidentifiable }
}

/**
 * Relève le résultat d'une demande. Terminée : chaque numéro trouvé remplit le téléphone du contact s'il est
 * toujours vide (jamais d'écrasement), et une note le signale sur la fiche.
 */
export async function checkPhoneEnrichment(db: SupabaseClient, id: string): Promise<{ status: string; found: number; sent: number; credits: number | null }> {
  const { data: row } = await db.from('crm_enrichments').select('id, external_id, status, contact_ids, found, credits').eq('id', id).single()
  if (!row) throw new Error('Enrichissement introuvable')
  const sent = (row.contact_ids as string[]).length
  if (FINAL_STATUSES.has(row.status)) return { status: row.status, found: row.found ?? 0, sent, credits: row.credits }

  const res = await fetch(`${API}/contact/enrich/bulk/${encodeURIComponent(row.external_id)}`, { headers: headers(), cache: 'no-store' })
  if (res.status === 400) return { status: 'IN_PROGRESS', found: 0, sent, credits: null }
  if (!res.ok && res.status !== 402) throw new Error(`FullEnrich a répondu ${res.status}`)
  const body = await readJson<{ status: string; data?: FullEnrichResult[]; cost?: { credits?: number } }>(res)
  if (!FINAL_STATUSES.has(body.status)) {
    await db.from('crm_enrichments').update({ status: body.status }).eq('id', id)
    return { status: body.status, found: 0, sent, credits: null }
  }

  let found = 0
  for (const r of body.data ?? []) {
    const contactId = r.custom?.contact_id
    const phone = bestPhone(r)
    if (!contactId || !phone || !(row.contact_ids as string[]).includes(contactId)) continue
    const { data: updated } = await db.from('contacts').update({ phone, updated_at: new Date().toISOString() }).eq('id', contactId).or('phone.is.null,phone.eq.').select('id, company_id')
    if (!updated?.length) continue
    found++
    await db.from('crm_activities').insert({ type: 'note', source: 'fullenrich', contact_id: contactId, company_id: updated[0].company_id, body: `Téléphone trouvé par FullEnrich : ${phone}` })
  }
  const credits = body.cost?.credits ?? null
  await db.from('crm_enrichments').update({ status: body.status, found, credits, finished_at: new Date().toISOString() }).eq('id', id)
  return { status: body.status, found, sent, credits }
}
