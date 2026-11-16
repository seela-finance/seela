// Offres créées par l'équipe (#34) : offre manuelle (leaser hors grille ou sans réponse du matching)
// et contre-proposition sur une offre existante. Logique sans dépendance serveur (deps injectées).
import { OS, RS, canTransitionOffer, canTransitionRequest, type RequestStatus } from '@/lib/status'
import { requestLabel } from '@/lib/request-label'
import { PERIODICITES } from '@/lib/client-workflow'
import { emailClientCounterOffer, emailClientNewOffer } from '@/lib/email'
import { WorkflowError, sendLogged, type WorkflowDeps } from '@/lib/admin-workflow'

export const OFFER_DURATIONS = [12, 24, 36, 48, 60, 72, 84] as const
type Periodicite = (typeof PERIODICITES)[number]

export type ManualOfferInput = {
  leaserName: string
  monthlyPayment: number
  durationMonths: number
  periodicite: Periodicite
  rate: number | null
  fraisDossier: number | null
  depotGarantie: number | null
  conditions: string | null
}

export type CounterOfferInput = {
  monthlyPayment: number
  durationMonths: number
  rate: number | null
  conditions: string | null
  clientMessage: string | null
}

/** « 1 234,50 », « 1234.5 » ou « 1 234 € » → nombre ; vide → null ; illisible → NaN. */
export function parseAmount(raw: unknown): number | null {
  const s = String(raw ?? '').replace(/[\s  €%]/g, '').replace(',', '.')
  if (!s) return null
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN
}

const text = (raw: unknown, max: number) => {
  const s = String(raw ?? '').trim()
  return s ? s.slice(0, max) : null
}

function money(raw: unknown, label: string, { required = false, positive = false } = {}): number | null {
  const n = parseAmount(raw)
  if (n === null) {
    if (required) throw new WorkflowError(`${label} : à renseigner.`)
    return null
  }
  if (Number.isNaN(n) || n < 0 || (positive && n === 0)) throw new WorkflowError(`${label} : montant invalide.`)
  return Math.round(n * 100) / 100
}

function duration(raw: unknown): number {
  const d = Number(raw)
  if (!OFFER_DURATIONS.some(x => x === d)) throw new WorkflowError('Durée invalide.')
  return d
}

function rate(raw: unknown): number | null {
  const r = parseAmount(raw)
  if (r === null) return null
  if (Number.isNaN(r) || r < 0 || r > 30) throw new WorkflowError('Taux invalide (en %, entre 0 et 30).')
  return r
}

export function parseManualOffer(form: Record<string, unknown>): ManualOfferInput {
  const leaserName = text(form.leaserName, 120)
  if (!leaserName) throw new WorkflowError('Indiquez le financeur.')
  return {
    leaserName,
    monthlyPayment: money(form.monthlyPayment, 'Loyer HT', { required: true, positive: true })!,
    durationMonths: duration(form.durationMonths),
    periodicite: PERIODICITES.find(p => p === form.periodicite) ?? 'mensuelle',
    rate: rate(form.rate),
    fraisDossier: money(form.fraisDossier, 'Frais de dossier'),
    depotGarantie: money(form.depotGarantie, 'Dépôt de garantie'),
    conditions: text(form.conditions, 2000),
  }
}

export function parseCounterOffer(form: Record<string, unknown>): CounterOfferInput {
  return {
    monthlyPayment: money(form.monthlyPayment, 'Nouveau loyer HT', { required: true, positive: true })!,
    durationMonths: duration(form.durationMonths),
    rate: rate(form.rate),
    conditions: text(form.conditions, 2000),
    clientMessage: text(form.clientMessage, 2000),
  }
}

/** Dossiers sur lesquels l'équipe peut ajouter une offre : transmis, sans offre, ou déjà avec des offres. */
const ADD_OFFER_STATUSES: string[] = [RS.submitted, RS.no_match, RS.offers_available]
export function canAddManualOffer(requestStatus: string | null | undefined): boolean {
  return ADD_OFFER_STATUSES.includes(requestStatus ?? '')
}

/** Une contre-proposition remplace les conditions d'une offre encore ouverte, une seule à la fois par dossier. */
export function canCounterOffer(offerStatus: string | null | undefined, requestStatus: string | null | undefined): boolean {
  return canTransitionOffer(offerStatus ?? '', OS.counter_offer, 'admin') && canTransitionRequest(requestStatus ?? '', RS.counter_offer, 'admin')
}

/**
 * Offre manuelle : le dossier passe en « offres disponibles » d'abord (un double envoi échoue en 409),
 * puis l'offre est écrite ; si l'écriture échoue, le dossier reprend son statut.
 */
export async function addManualOffer(deps: WorkflowDeps, requestId: string, input: ManualOfferInput): Promise<void> {
  const ctx = await deps.store.loadRequest(requestId)
  if (!ctx) throw new WorkflowError('Dossier introuvable.')
  const { request } = ctx
  if (!canAddManualOffer(request.status)) throw new WorkflowError('On ne peut plus ajouter d’offre sur ce dossier.')

  const moved = request.status !== RS.offers_available
  if (moved) await deps.store.transitionRequest(request.id, request.status, RS.offers_available as RequestStatus)
  try {
    await deps.store.insertOffer({
      request_id: request.id,
      leaser_name: input.leaserName,
      monthly_payment: input.monthlyPayment,
      duration_months: input.durationMonths,
      periodicite: input.periodicite,
      rate: input.rate,
      frais_dossier: input.fraisDossier,
      depot_garantie: input.depotGarantie,
      conditions: input.conditions,
      total_cost: Math.round(input.monthlyPayment * input.durationMonths * 100) / 100,
      status: OS.indicative,
      source: 'manual',
    })
  } catch (err) {
    if (moved) await deps.store.restoreRequest(request.id, RS.offers_available, request.status)
    throw err
  }

  await deps.log({
    action: 'Offre manuelle ajoutée',
    requestId: request.id,
    before: { request: request.status },
    after: { request: RS.offers_available, leaser: input.leaserName, monthly_payment: input.monthlyPayment, duration_months: input.durationMonths },
    note: input.conditions,
  })

  if (ctx.profile?.email) {
    await sendLogged(deps, request.id, emailClientNewOffer({
      userEmail: ctx.profile.email,
      companyName: ctx.profile.company_name ?? 'Entreprise',
      leaserName: input.leaserName,
      monthlyPayment: input.monthlyPayment,
      durationMonths: input.durationMonths,
      requestRef: requestLabel(request),
    }))
  }
}

/**
 * Contre-proposition : l'offre garde ses conditions d'avant (`previous_terms`, affichées barrées au client)
 * et prend les nouvelles ; le dossier passe en contre-proposition. Le client accepte ou refuse
 * (routes /api/offers/[id]/confirm et /decline).
 */
export async function proposeCounterOffer(deps: WorkflowDeps, offerId: string, input: CounterOfferInput): Promise<void> {
  const ctx = await deps.store.loadOffer(offerId)
  if (!ctx) throw new WorkflowError('Offre introuvable.')
  const { offer, request } = ctx
  if (!canCounterOffer(offer.status, request.status)) {
    throw new WorkflowError('Une contre-proposition n’est pas possible sur cette offre (déjà refusée, acceptée par le leaser, ou une autre est en cours).')
  }
  const previous = {
    monthly_payment: offer.monthly_payment,
    duration_months: offer.duration_months,
    rate: offer.rate ?? null,
    conditions: offer.conditions ?? null,
  }
  if (previous.monthly_payment === input.monthlyPayment && previous.duration_months === input.durationMonths
    && (input.conditions ?? null) === previous.conditions) {
    throw new WorkflowError('Les conditions proposées sont identiques à l’offre actuelle.')
  }

  await deps.store.transitionOffer(offer.id, offer.status, OS.counter_offer, {
    previous_terms: previous,
    monthly_payment: input.monthlyPayment,
    duration_months: input.durationMonths,
    rate: input.rate,
    conditions: input.conditions,
    client_message: input.clientMessage,
    total_cost: Math.round(input.monthlyPayment * input.durationMonths * 100) / 100,
    source: 'counter_offer',
  })
  try {
    await deps.store.transitionRequest(request.id, request.status, RS.counter_offer)
  } catch (err) {
    await deps.store.restoreOffer(offer.id, OS.counter_offer, {
      status: offer.status,
      previous_terms: null,
      monthly_payment: previous.monthly_payment,
      duration_months: previous.duration_months,
      rate: previous.rate,
      conditions: previous.conditions,
      client_message: null,
      total_cost: offer.total_cost ?? null,
      source: offer.source ?? 'matching',
    })
    throw err
  }

  await deps.log({
    action: 'Contre-proposition envoyée au client',
    requestId: request.id,
    before: { offer: offer.status, request: request.status, ...previous },
    after: { offer: OS.counter_offer, request: RS.counter_offer, monthly_payment: input.monthlyPayment, duration_months: input.durationMonths },
    note: input.clientMessage,
  })

  if (ctx.profile?.email) {
    await sendLogged(deps, request.id, emailClientCounterOffer({
      userEmail: ctx.profile.email,
      companyName: ctx.profile.company_name ?? 'Entreprise',
      leaserName: offer.leaser_name,
      previousMonthly: previous.monthly_payment,
      monthlyPayment: input.monthlyPayment,
      durationMonths: input.durationMonths,
      message: input.clientMessage,
      requestRef: requestLabel(request),
    }))
  }
}
