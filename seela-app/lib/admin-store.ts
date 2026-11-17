import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { transitionOffer, transitionRequest } from '@/lib/transitions'
import { signedDocumentUrl } from '@/lib/documents'
import { sendEmail } from '@/lib/email'
import { logAdminEvent, type Admin } from '@/lib/admin'
import { OS } from '@/lib/status'
import { runMatching } from '@/lib/matching'
import type { OfferContext, RequestContext, WorkflowDeps, WorkflowStore } from '@/lib/admin-workflow'

type AccountJoin = { companies: { name: string; siren: string | null } | null; contacts: { email: string | null } | null }

/** Société du dossier et email du contact qui l'a créé, au format attendu par le workflow. */
function requestProfile(j: AccountJoin) {
  return { company_name: j.companies?.name ?? null, siren: j.companies?.siren ?? null, email: j.contacts?.email ?? null }
}

// Lien vers le document envoyé au leaser
const LEASER_DOCUMENT_LINK_SECONDS = 7 * 24 * 3600

/** Implémentation Supabase (service role) du stockage des actions admin. */
export function supabaseWorkflowStore(db: SupabaseClient): WorkflowStore {
  return {
    async loadOffer(offerId) {
      const { data: offer } = await db
        .from('offers')
        .select('id, request_id, leaser_name, public_name, monthly_payment, duration_months, status, rate, conditions, total_cost, source')
        .eq('id', offerId)
        .maybeSingle()
      if (!offer) return null
      const { data: request } = await db
        .from('financing_requests')
        .select('id, status, user_id, total_amount, document_url, line_items(description, quantity, selected), companies(name, siren), contacts(email)')
        .eq('id', offer.request_id)
        .maybeSingle()
      if (!request) return null
      const { data: leaser } = await db.from('leasers').select('referent_email, referent_name').eq('name', offer.leaser_name).maybeSingle()
      const { companies, contacts, ...req } = request as typeof request & AccountJoin
      return { offer, request: req, profile: requestProfile({ companies, contacts }), leaser } as OfferContext
    },

    async loadRequest(requestId) {
      const { data: request } = await db.from('financing_requests').select('id, status, user_id, companies(name, siren), contacts(email)').eq('id', requestId).maybeSingle()
      if (!request) return null
      const { companies, contacts, ...req } = request as typeof request & AccountJoin
      return { request: req, profile: requestProfile({ companies, contacts }) } as RequestContext
    },

    async countOtherActiveOffers(requestId, offerId) {
      const { count } = await db
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('request_id', requestId)
        .neq('id', offerId)
        .neq('status', OS.refused)
      return count ?? 0
    },

    transitionOffer: (id, from, to, extra = {}) => transitionOffer(db, id, from, to, extra),
    transitionRequest: (id, from, to) => transitionRequest(db, id, from, to),

    async restoreOffer(id, current, values) {
      await db.from('offers').update(values).eq('id', id).eq('status', current)
    },
    async restoreRequest(id, current, status) {
      await db.from('financing_requests').update({ status }).eq('id', id).eq('status', current)
    },
    runMatching: requestId => runMatching(db, requestId),
    async insertOffer(values) {
      const { data, error } = await db.from('offers').insert(values).select('public_name').single()
      if (error) throw new Error(`Offre : écriture impossible (${error.message})`)
      return (data?.public_name as string | null) ?? null
    },
  }
}

/** Dépendances réelles des actions admin, pour l'admin connecté. */
export function workflowDeps(admin: Admin): WorkflowDeps {
  const db = createAdminClient()
  return {
    store: supabaseWorkflowStore(db),
    send: email => sendEmail(email),
    log: event => logAdminEvent(admin, event),
    documentLink: (documentUrl, ownerId) => signedDocumentUrl(db, documentUrl, ownerId, LEASER_DOCUMENT_LINK_SECONDS),
    adminEmail: admin.email,
  }
}
