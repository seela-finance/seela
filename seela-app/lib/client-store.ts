import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { transitionOffer, transitionRequest } from '@/lib/transitions'
import { RS } from '@/lib/status'
import type { ClientStore } from '@/lib/client-workflow'

/**
 * Implémentation Supabase (service role) des actions client. La RLS et le trigger de protection
 * bloquent ces écritures pour le navigateur ; les routes vérifient le propriétaire avant d'appeler.
 */
export function supabaseClientStore(db: SupabaseClient): ClientStore {
  return {
    async loadRequest(requestId) {
      const { data } = await db.from('financing_requests').select('id, status, user_id').eq('id', requestId).maybeSingle()
      return data
    },

    claimSubmission: (requestId, fields) => transitionRequest(db, requestId, RS.draft, RS.submitted, fields, 'client'),

    async replaceLines(requestId, lines) {
      const { error: delErr } = await db.from('line_items').delete().eq('request_id', requestId)
      if (delErr) throw new Error(`Lignes : suppression impossible (${delErr.message})`)
      const { error } = await db.from('line_items').insert(lines.map(l => ({ ...l, request_id: requestId, selected: true })))
      if (error) throw new Error(`Lignes : écriture impossible (${error.message})`)
    },

    async revertSubmission(requestId) {
      await db.from('financing_requests').update({ status: RS.draft }).eq('id', requestId).eq('status', RS.submitted)
    },

    async loadOffer(offerId) {
      const { data: offer } = await db.from('offers').select('id, status, request_id').eq('id', offerId).maybeSingle()
      if (!offer) return null
      const [{ data: request }, { data: others }] = await Promise.all([
        db.from('financing_requests').select('id, status, user_id').eq('id', offer.request_id).maybeSingle(),
        db.from('offers').select('id, status').eq('request_id', offer.request_id).neq('id', offerId),
      ])
      return request ? { offer, request, others: others ?? [] } : null
    },

    transitionOffer: (id, from, to, extra = {}) => transitionOffer(db, id, from, to, extra, 'client'),
    transitionRequest: (id, from, to) => transitionRequest(db, id, from, to, {}, 'client'),

    async restoreOffer(id, current, values) {
      await db.from('offers').update(values).eq('id', id).eq('status', current)
    },

    async unselectOtherOffers(requestId, offerId) {
      await db.from('offers').update({ selected: false }).eq('request_id', requestId).neq('id', offerId)
    },
  }
}
