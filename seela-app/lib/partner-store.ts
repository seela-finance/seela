import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchRegistry } from '@/lib/company-registry'
import type { Invitation, PartnerContext, PartnerRequestRow, PartnerStore } from '@/lib/partner-workflow'

/** Implémentation Supabase (service role) du parcours distributeur ; propriétaire et partenaire vérifiés par lib/partner-workflow.ts. */
export function supabasePartnerStore(db: SupabaseClient): PartnerStore {
  return {
    loadPartner: userId => loadPartnerContext(db, userId),

    async findOrCreateClientCompany(siren) {
      const existing = await db.from('companies').select('id, name').eq('siren', siren).maybeSingle()
      if (existing.data) return existing.data

      // Société inconnue : créée en prospect depuis le registre public (nom, ancienneté pour le matching)
      const registry = await fetchRegistry(siren)
      const c = registry.status === 'ok' ? registry.company : null
      const year = c?.createdOn ? Number(c.createdOn.slice(0, 4)) : null
      const { data, error } = await db.from('companies').insert({
        siren,
        name: c?.name ?? `Société ${siren}`,
        naf_code: c?.nafCode ?? null,
        creation_year: year && Number.isFinite(year) ? year : null,
        address: c?.address ?? null,
        source: 'Partenaire distributeur',
      }).select('id, name').single()
      if (data) return data
      // Créée entre-temps par une autre requête (SIREN unique) : on la relit
      const again = await db.from('companies').select('id, name').eq('siren', siren).maybeSingle()
      if (again.data) return again.data
      throw new Error(`Société du client : création impossible (${error?.message})`)
    },

    async attachRequest(requestId, fields) {
      const { error } = await db.from('financing_requests').update(fields).eq('id', requestId)
      if (error) throw new Error(`Rattachement du dossier impossible (${error.message})`)
    },

    async revokeInvitations(requestId) {
      await db.from('request_invitations').update({ revoked_at: new Date().toISOString() })
        .eq('request_id', requestId).is('accepted_at', null).is('revoked_at', null)
    },

    async createInvitation(values) {
      const { error } = await db.from('request_invitations').insert(values)
      if (error) throw new Error(`Invitation : écriture impossible (${error.message})`)
    },

    async loadInvitation(tokenHash) {
      const { data } = await db.from('request_invitations')
        .select('id, request_id, email, expires_at, accepted_at, accepted_by, revoked_at')
        .eq('token_hash', tokenHash).maybeSingle()
      return (data as Invitation | null) ?? null
    },

    async markAccepted(invitationId, userId, at) {
      const { data } = await db.from('request_invitations').update({ accepted_at: at, accepted_by: userId })
        .eq('id', invitationId).is('accepted_at', null).select('id')
      return (data ?? []).length === 1
    },

    async handOver(requestId, userId, at) {
      const { error } = await db.from('financing_requests').update({ user_id: userId, client_joined_at: at })
        .eq('id', requestId).is('client_joined_at', null)
      if (error) throw new Error(`Dossier : transfert au client impossible (${error.message})`)
      await joinClientCompany(db, requestId, userId)
    },
  }
}

/** Contact du compte connecté et sa société ; null si le compte n'a pas encore de société. */
export async function loadPartnerContext(db: SupabaseClient, userId: string): Promise<PartnerContext | null> {
  const { data } = await db.from('contacts')
    .select('id, companies ( id, name, siren, partner_enabled )')
    .eq('user_id', userId).maybeSingle()
  const row = data as unknown as { id: string; companies: { id: string; name: string; siren: string | null; partner_enabled: boolean | null } | null } | null
  if (!row?.companies) return null
  return {
    contactId: row.id,
    companyId: row.companies.id,
    companyName: row.companies.name,
    companySiren: row.companies.siren,
    partnerEnabled: !!row.companies.partner_enabled,
  }
}

/**
 * Rattache le compte du client à la société du dossier, s'il n'a pas encore de société et qu'aucun
 * autre compte n'y travaille : même règle que l'onboarding (un SIREN saisi par un tiers ne doit pas
 * ouvrir les dossiers d'une société à quelqu'un d'autre). Sinon le client voit le dossier seul.
 */
async function joinClientCompany(db: SupabaseClient, requestId: string, userId: string) {
  const { data: request } = await db.from('financing_requests').select('company_id').eq('id', requestId).maybeSingle()
  const companyId = request?.company_id as string | null | undefined
  if (!companyId) return

  const { data: others } = await db.from('contacts').select('id').eq('company_id', companyId).not('user_id', 'is', null).neq('user_id', userId).limit(1)
  if ((others ?? []).length > 0) return

  const { data: contact } = await db.from('contacts').select('id, company_id').eq('user_id', userId).maybeSingle()
  if (contact?.company_id) return
  const now = new Date().toISOString()
  if (contact) {
    await db.from('contacts').update({ company_id: companyId, updated_at: now }).eq('id', contact.id)
  } else {
    const { data: auth } = await db.auth.admin.getUserById(userId)
    await db.from('contacts').insert({ user_id: userId, email: auth.user?.email ?? null, company_id: companyId })
  }
}

export const PARTNER_REQUEST_COLUMNS =
  'id, status, total_amount, duration_months, created_at, client_joined_at, contract_start_date, companies ( name ), offers ( monthly_payment, duration_months, status, selected )'

/** Dossiers apportés par la société partenaire, du plus récent au plus ancien. */
export async function loadPartnerRequests(db: SupabaseClient, partnerCompanyId: string): Promise<PartnerRequestRow[]> {
  const { data, error } = await db.from('financing_requests')
    .select(PARTNER_REQUEST_COLUMNS)
    .eq('partner_company_id', partnerCompanyId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Dossiers partenaire : lecture impossible (${error.message})`)
  return (data ?? []) as unknown as PartnerRequestRow[]
}
