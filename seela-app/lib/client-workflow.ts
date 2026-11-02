// Actions du client exécutées côté serveur : soumettre un dossier, confirmer une offre,
// refuser une contre-offre. Le navigateur n'écrit plus ni statut, ni montant, ni offre (#21).
// Logique sans dépendance serveur : la base est injectée (lib/client-store.ts), ce qui la rend testable.
import { OS, RS, canTransitionOffer, canTransitionRequest, type OfferStatus, type RequestStatus } from '@/lib/status'
import { TransitionError } from '@/lib/transitions'

export const DURATIONS = [24, 36, 48, 60] as const
export const PERIODICITES = ['mensuelle', 'trimestrielle', 'annuelle'] as const

export type SubmitLine = {
  description: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number
  category: string | null
}

export type SubmitPayload = {
  lines: SubmitLine[]
  durationMonths: (typeof DURATIONS)[number]
  periodicite: (typeof PERIODICITES)[number]
  notes: string | null
  meta: {
    supplier_name: string | null
    supplier_address: string | null
    supplier_siren: string | null
    document_number: string | null
    document_date: string | null
  }
}

/** Erreur à afficher au client ; `status` = code HTTP de la route. */
export class ClientActionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const text = (v: unknown, max = 500) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Valide le corps de la soumission ; le total est recalculé, jamais lu du navigateur. */
export function parseSubmitPayload(body: unknown): SubmitPayload {
  const b = (body ?? {}) as Record<string, unknown>
  const rawLines = Array.isArray(b.lines) ? b.lines.slice(0, 200) : []
  const lines: SubmitLine[] = rawLines.map(raw => {
    const l = (raw ?? {}) as Record<string, unknown>
    return {
      description: text(l.description),
      quantity: num(l.quantity),
      unit_price: num(l.unit_price),
      total_price: num(l.total_price) ?? 0,
      category: text(l.category, 50),
    }
  })
  if (lines.length === 0) throw new ClientActionError('Sélectionnez au moins une ligne à financer.', 400)
  if (lines.some(l => l.total_price < 0)) throw new ClientActionError('Montant de ligne invalide.', 400)

  const durationMonths = DURATIONS.find(d => d === b.durationMonths)
  if (!durationMonths) throw new ClientActionError('Durée invalide.', 400)
  const periodicite = PERIODICITES.find(p => p === b.periodicite) ?? 'mensuelle'
  const meta = (b.meta ?? {}) as Record<string, unknown>
  const date = text(meta.document_date, 10)

  return {
    lines,
    durationMonths,
    periodicite,
    notes: text(b.notes, 2000),
    meta: {
      supplier_name: text(meta.supplier_name),
      supplier_address: text(meta.supplier_address),
      supplier_siren: text(meta.supplier_siren, 20),
      document_number: text(meta.document_number, 100),
      document_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    },
  }
}

/** Montant financé = somme des lignes sélectionnées, arrondie au centime. */
export function totalAmount(lines: SubmitLine[]): number {
  return Math.round(lines.reduce((s, l) => s + l.total_price, 0) * 100) / 100
}

export type OfferWithRequest = {
  offer: { id: string; status: string; request_id: string }
  request: { id: string; status: string; user_id: string }
  /** Statuts des autres offres du dossier. */
  others: { id: string; status: string }[]
}

export interface ClientStore {
  loadRequest(requestId: string): Promise<{ id: string; status: string; user_id: string } | null>
  /** draft → submitted en une écriture atomique, avec les champs du dossier (TransitionError 409 si déjà soumis). */
  claimSubmission(requestId: string, fields: Record<string, unknown>): Promise<void>
  replaceLines(requestId: string, lines: SubmitLine[]): Promise<void>
  /** Retour en brouillon si l'écriture des lignes échoue (seulement si toujours `submitted`). */
  revertSubmission(requestId: string): Promise<void>
  loadOffer(offerId: string): Promise<OfferWithRequest | null>
  transitionOffer(id: string, from: string, to: OfferStatus, extra?: Record<string, unknown>): Promise<void>
  transitionRequest(id: string, from: string, to: RequestStatus): Promise<void>
  /** Retour arrière après un échec : seulement si l'offre est toujours dans `current`. */
  restoreOffer(id: string, current: string, values: Record<string, unknown>): Promise<void>
  unselectOtherOffers(requestId: string, offerId: string): Promise<void>
}

/**
 * Soumet un brouillon. Idempotent : un dossier déjà soumis renvoie `already` sans rien réécrire
 * (double clic, rechargement). Le statut est réservé d'abord, puis les lignes sont écrites.
 */
export async function submitRequest(store: ClientStore, userId: string, requestId: string, payload: SubmitPayload): Promise<'submitted' | 'already'> {
  const request = await store.loadRequest(requestId)
  if (!request || request.user_id !== userId) throw new ClientActionError('Dossier introuvable.', 404)
  if (request.status !== RS.draft) return 'already'

  const total = totalAmount(payload.lines)
  if (total <= 0) throw new ClientActionError('Le montant à financer doit être supérieur à 0.', 400)

  try {
    await store.claimSubmission(requestId, {
      total_amount: total,
      duration_months: payload.durationMonths,
      periodicite: payload.periodicite,
      notes: payload.notes,
      ...payload.meta,
    })
  } catch (err) {
    if (err instanceof TransitionError && err.status === 409) return 'already'
    throw err
  }

  try {
    await store.replaceLines(requestId, payload.lines)
  } catch (err) {
    await store.revertSubmission(requestId)
    throw err
  }
  return 'submitted'
}

// Une offre déjà choisie (ou plus loin dans le circuit) bloque la confirmation d'une autre
const ENGAGED: string[] = [OS.client_confirmed, OS.seela_validated, OS.leaser_confirmed]

/** Confirme une offre indicative (ou accepte une contre-offre) ; une seule offre par dossier. */
export async function confirmOffer(store: ClientStore, userId: string, offerId: string) {
  const ctx = await store.loadOffer(offerId)
  if (!ctx || ctx.request.user_id !== userId) throw new ClientActionError('Offre introuvable.', 404)
  const { offer, request, others } = ctx

  if (others.some(o => ENGAGED.includes(o.status))) throw new ClientActionError('Une autre offre de ce dossier est déjà confirmée.', 409)
  if (!canTransitionOffer(offer.status, OS.client_confirmed, 'client') || !canTransitionRequest(request.status, RS.offer_selected, 'client')) {
    throw new ClientActionError('Cette offre ne peut plus être confirmée.', 409)
  }

  await store.transitionOffer(offer.id, offer.status, OS.client_confirmed, { selected: true, confirmed_at: new Date().toISOString() })
  try {
    await store.transitionRequest(request.id, request.status, RS.offer_selected)
  } catch (err) {
    await store.restoreOffer(offer.id, OS.client_confirmed, { status: offer.status, selected: false, confirmed_at: null })
    throw err
  }
  await store.unselectOtherOffers(request.id, offer.id)
}

/** Refus d'une contre-offre : le client retrouve ses autres offres, sinon le dossier passe en « sans offre ». */
export async function declineCounterOffer(store: ClientStore, userId: string, offerId: string) {
  const ctx = await store.loadOffer(offerId)
  if (!ctx || ctx.request.user_id !== userId) throw new ClientActionError('Offre introuvable.', 404)
  const { offer, request, others } = ctx

  const requestTo = others.some(o => o.status !== OS.refused) ? RS.offers_available : RS.no_match
  if (offer.status !== OS.counter_offer || !canTransitionOffer(offer.status, OS.refused, 'client') || !canTransitionRequest(request.status, requestTo, 'client')) {
    throw new ClientActionError('Cette contre-proposition a déjà été traitée.', 409)
  }
  await store.transitionOffer(offer.id, offer.status, OS.refused, { selected: false })
  await store.transitionRequest(request.id, request.status, requestTo)
}
