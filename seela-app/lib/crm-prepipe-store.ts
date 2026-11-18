import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_SEQUENCE_THRESHOLD, forward, isLeadStatus, statusAfterCall, type LeadChannel, type LeadStatus } from '@/lib/crm-prepipe'
import { CLOSED_DEAL_STAGES } from '@/lib/crm-deals'

export type CrmSettings = { ownerId: string | null; threshold: number }

export async function getCrmSettings(db: SupabaseClient): Promise<CrmSettings> {
  const { data } = await db.from('crm_settings').select('key, value').in('key', ['prepipe_owner', 'sequence_threshold'])
  const map = new Map(((data ?? []) as { key: string; value: unknown }[]).map(r => [r.key, r.value]))
  const t = Number(map.get('sequence_threshold'))
  return {
    ownerId: typeof map.get('prepipe_owner') === 'string' ? (map.get('prepipe_owner') as string) : null,
    threshold: Number.isFinite(t) && t > 0 && t <= 1 ? t : DEFAULT_SEQUENCE_THRESHOLD,
  }
}

type CompanyLead = { id: string; name: string; lead_status: string | null; lead_channel: string | null; owner_id: string | null; lifecycle_stage: string }

/**
 * Fait entrer (ou avancer) une société dans le pré-pipe. Jamais de recul ; une société disqualifiée n'est pas
 * reprise automatiquement, une société « pas maintenant » seulement sur un signal fort. Les clients n'y entrent pas.
 */
export async function enterPrepipe(
  db: SupabaseClient, companyId: string,
  entry: { channel: LeadChannel; signal: string; status: LeadStatus; strong?: boolean },
  settings: CrmSettings,
): Promise<boolean> {
  const { data } = await db.from('companies').select('id, name, lead_status, lead_channel, owner_id, lifecycle_stage').eq('id', companyId).maybeSingle()
  const c = data as CompanyLead | null
  if (!c || c.lifecycle_stage === 'client' || c.lifecycle_stage === 'exclu') return false
  if (c.lead_status === 'disqualifie') return false
  if (c.lead_status === 'pas_maintenant' && !entry.strong) return false
  const next = c.lead_status === 'pas_maintenant' ? entry.status : forward(c.lead_status, entry.status)
  if (next === c.lead_status && c.lead_status !== null && !entry.strong) return false
  const fresh = !isLeadStatus(c.lead_status) || c.lead_status === 'pas_maintenant'
  const { error } = await db.from('companies').update({
    lead_status: next,
    lead_channel: c.lead_channel ?? entry.channel,
    ...(fresh || entry.strong ? { lead_signal: entry.signal } : {}),
    ...(fresh ? { lead_entered_at: new Date().toISOString(), lead_exit_reason: null, lead_next_date: null } : {}),
    ...(!c.owner_id && settings.ownerId ? { owner_id: settings.ownerId } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', companyId)
  if (error) throw error
  return next !== c.lead_status || fresh
}

/**
 * Effet d'un appel sur la société : lead status (jamais de recul, sortie seulement par « société disqualifiée »),
 * raison de sortie, et deal « Pending qualification » créé au RDV pris s'il n'y a pas déjà un deal en cours.
 */
export async function applyCallToCompany(
  db: SupabaseClient, companyId: string, outcome: string, exitReason: string | null, settings: CrmSettings, actorId: string,
): Promise<{ status: LeadStatus; dealCreated: boolean }> {
  const { data } = await db.from('companies').select('id, name, lead_status, lead_channel, owner_id, lifecycle_stage').eq('id', companyId).maybeSingle()
  const c = data as CompanyLead | null
  if (!c) throw new Error('Société introuvable')
  const status = statusAfterCall(c.lead_status, outcome)
  const entering = !isLeadStatus(c.lead_status) || c.lead_status === 'pas_maintenant' || (c.lead_status === 'disqualifie' && status !== 'disqualifie')
  const { error } = await db.from('companies').update({
    lead_status: status,
    lead_channel: c.lead_channel ?? 'outbound',
    lead_exit_reason: status === 'disqualifie' ? exitReason : null,
    ...(entering ? { lead_entered_at: new Date().toISOString(), lead_signal: c.lead_status ? undefined : 'appel', lead_next_date: null } : {}),
    ...(!c.owner_id && settings.ownerId ? { owner_id: settings.ownerId } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', companyId)
  if (error) throw error

  let dealCreated = false
  if (outcome === 'rdv_pris') {
    const { data: deals } = await db.from('crm_deals').select('id, stage').eq('company_id', companyId)
    const open = ((deals ?? []) as { stage: string }[]).some(d => !(CLOSED_DEAL_STAGES as string[]).includes(d.stage))
    if (!open) {
      const { error: dErr } = await db.from('crm_deals').insert({ company_id: companyId, name: c.name, stage: 'pending_qualification', owner_id: c.owner_id ?? settings.ownerId ?? actorId })
      if (dErr) throw dErr
      dealCreated = true
    }
  }
  return { status, dealCreated }
}
