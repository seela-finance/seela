import type { SupabaseClient } from '@supabase/supabase-js'
import {
  canTransitionOffer,
  canTransitionRequest,
  type Actor,
  type OfferStatus,
  type RequestStatus,
} from '@/lib/status'

/** Échec d'un changement de statut, avec le code HTTP à renvoyer. */
export class TransitionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type Table = 'offers' | 'financing_requests'

/**
 * Change le statut d'une ligne seulement si elle est encore dans le statut lu (`from`) :
 * deux appels concurrents ne peuvent pas tous deux réussir. Lève une TransitionError
 * (409 si la transition est interdite ou si la ligne a changé entre-temps, 500 si l'écriture échoue).
 */
async function transition(
  db: SupabaseClient,
  table: Table,
  id: string,
  from: string,
  to: string,
  allowed: boolean,
  extra: Record<string, unknown>,
) {
  const label = table === 'offers' ? 'Offre' : 'Dossier'
  if (!allowed) throw new TransitionError(`${label} : transition ${from} → ${to} interdite`, 409)

  const { data, error } = await db
    .from(table)
    .update({ status: to, ...extra })
    .eq('id', id)
    .eq('status', from)
    .select('id')

  if (error) throw new TransitionError(`${label} : écriture impossible (${error.message})`, 500)
  if (!data || data.length === 0) throw new TransitionError(`${label} : statut modifié entre-temps`, 409)
}

export function transitionOffer(
  db: SupabaseClient, id: string, from: string, to: OfferStatus,
  extra: Record<string, unknown> = {}, actor: Actor = 'admin',
) {
  return transition(db, 'offers', id, from, to, canTransitionOffer(from, to, actor), extra)
}

export function transitionRequest(
  db: SupabaseClient, id: string, from: string, to: RequestStatus,
  extra: Record<string, unknown> = {}, actor: Actor = 'admin',
) {
  return transition(db, 'financing_requests', id, from, to, canTransitionRequest(from, to, actor), extra)
}
