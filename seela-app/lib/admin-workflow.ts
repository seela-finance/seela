// Actions admin sur un dossier : valider et transmettre au leaser, réponse du leaser, refus.
// Logique métier sans dépendance serveur : la base, l'envoi d'emails et le journal sont injectés
// (implémentations Supabase / Resend dans lib/admin-store.ts), ce qui la rend testable.
import { OS, RS, canTransitionOffer, canTransitionRequest, type OfferStatus, type RequestStatus } from '@/lib/status'
import { requestLabel } from '@/lib/request-label'
import {
  emailClientEverleaseValidated,
  emailClientLeaserConfirmed,
  emailClientLeaserRefused,
  emailClientRequestRefused,
  emailLeaserValidation,
} from '@/lib/email'
import type { AdminEvent } from '@/lib/admin-events'

export type OfferContext = {
  offer: { id: string; request_id: string; leaser_name: string; monthly_payment: number; duration_months: number; status: string }
  request: {
    id: string
    status: string
    user_id: string
    total_amount: number | null
    document_url: string | null
    line_items: { description: string | null; quantity: number | null; selected: boolean | null }[] | null
  }
  profile: { company_name: string | null; siren: string | null; email: string | null } | null
  leaser: { referent_email: string | null; referent_name: string | null } | null
}

export type RequestContext = {
  request: { id: string; status: string; user_id: string }
  profile: { company_name: string | null; email: string | null } | null
}

export interface WorkflowStore {
  loadOffer(offerId: string): Promise<OfferContext | null>
  loadRequest(requestId: string): Promise<RequestContext | null>
  /** Offres du dossier, hors celle-ci, qui ne sont pas refusées. */
  countOtherActiveOffers(requestId: string, offerId: string): Promise<number>
  /** Transitions atomiques (TransitionError 409 si le statut a changé entre-temps). */
  transitionOffer(id: string, from: string, to: OfferStatus, extra?: Record<string, unknown>): Promise<void>
  transitionRequest(id: string, from: string, to: RequestStatus): Promise<void>
  /** Retour arrière après un échec : seulement si la ligne est toujours dans `current`. */
  restoreOffer(id: string, current: string, values: Record<string, unknown>): Promise<void>
  restoreRequest(id: string, current: string, status: string): Promise<void>
}

export type Email = { to: string; subject: string; html: string; cc?: string }

export type WorkflowDeps = {
  store: WorkflowStore
  send: (email: Email) => Promise<{ success: boolean }>
  log: (event: AdminEvent) => Promise<void>
  /** Lien signé 7 jours vers le document du client (null si absent). */
  documentLink: (documentUrl: string | null, ownerId: string) => Promise<string | null>
  adminEmail: string
  now?: () => Date
}

/** Erreur à afficher telle quelle à l'admin ; rien n'a été modifié. */
export class WorkflowError extends Error {}

function nowIso(deps: WorkflowDeps) {
  return (deps.now?.() ?? new Date()).toISOString()
}

/** Envoie un email et l'inscrit au journal du dossier (destinataire, objet, succès ou échec). */
async function sendLogged(deps: WorkflowDeps, requestId: string, email: Email) {
  const { success } = await deps.send(email)
  await deps.log({
    action: success ? 'Email envoyé' : "Échec d'envoi d'email",
    requestId,
    note: `${email.to}${email.cc ? ` (copie ${email.cc})` : ''} · ${email.subject}`,
  })
  return success
}

export function equipmentList(lines: OfferContext['request']['line_items']): string {
  return (lines ?? [])
    .filter(l => l.selected)
    .map(l => `${l.quantity && l.quantity > 1 ? `${l.quantity}× ` : ''}${l.description ?? ''}`.trim())
    .filter(Boolean)
    .join('\n') || 'Non précisé'
}

/** Email au référent du leaser, tel qu'il sera envoyé (aperçu sur la fiche dossier). */
export function leaserValidationEmail(ctx: OfferContext, documentUrl: string, note: string, adminEmail: string): Email {
  if (!ctx.leaser?.referent_email) throw new WorkflowError(`Aucun email référent pour ${ctx.offer.leaser_name} : à renseigner sur le leaser.`)
  return {
    ...emailLeaserValidation({
      leaserEmail: ctx.leaser.referent_email,
      leaserName: ctx.offer.leaser_name,
      referentName: ctx.leaser.referent_name ?? '',
      companyName: ctx.profile?.company_name ?? 'Entreprise',
      siren: ctx.profile?.siren ?? '—',
      totalAmount: ctx.request.total_amount ?? 0,
      durationMonths: ctx.offer.duration_months,
      monthlyPayment: ctx.offer.monthly_payment,
      equipmentList: equipmentList(ctx.request.line_items),
      documentUrl,
      requestRef: requestLabel(ctx.request),
      note,
    }),
    cc: adminEmail || undefined,
  }
}

/**
 * Valider et transmettre (offre client_confirmed, dossier offer_selected).
 * Statuts changés d'abord (un double clic échoue en 409 avant tout email), puis email au leaser :
 * s'il échoue, on remet les statuts et on remonte l'erreur. Enfin, email au client.
 */
export async function validateAndTransmit(deps: WorkflowDeps, offerId: string, note: string) {
  const ctx = await deps.store.loadOffer(offerId)
  if (!ctx) throw new WorkflowError('Offre introuvable.')
  const { offer, request } = ctx
  if (!canTransitionOffer(offer.status, OS.seela_validated, 'admin') || !canTransitionRequest(request.status, RS.seela_validated, 'admin')) {
    throw new WorkflowError('Cette offre a déjà été traitée ou n’est pas confirmée par le client.')
  }

  const documentUrl = (await deps.documentLink(request.document_url, request.user_id)) ?? ''
  const leaserEmail = leaserValidationEmail(ctx, documentUrl, note.trim(), deps.adminEmail)

  await deps.store.transitionOffer(offer.id, offer.status, OS.seela_validated, { seela_validated_at: nowIso(deps) })
  try {
    await deps.store.transitionRequest(request.id, request.status, RS.seela_validated)
  } catch (err) {
    await deps.store.restoreOffer(offer.id, OS.seela_validated, { status: offer.status, seela_validated_at: null })
    throw err
  }

  if (!(await sendLogged(deps, request.id, leaserEmail))) {
    await deps.store.restoreRequest(request.id, RS.seela_validated, request.status)
    await deps.store.restoreOffer(offer.id, OS.seela_validated, { status: offer.status, seela_validated_at: null })
    throw new WorkflowError("L'email au leaser n'a pas pu partir : rien n'a été validé. Réessayez.")
  }

  await deps.log({
    action: 'Offre validée et transmise au leaser',
    requestId: request.id,
    before: { offer: offer.status, request: request.status },
    after: { offer: OS.seela_validated, request: RS.seela_validated, leaser: offer.leaser_name },
    note: note.trim() || null,
  })

  if (ctx.profile?.email) {
    await sendLogged(deps, request.id, emailClientEverleaseValidated({
      userEmail: ctx.profile.email,
      companyName: ctx.profile.company_name ?? 'Entreprise',
      leaserName: offer.leaser_name,
      monthlyPayment: offer.monthly_payment,
      durationMonths: offer.duration_months,
      requestRef: requestLabel(request),
    }))
  }
}

/** Après un refus du leaser : le client retrouve ses autres offres, sinon le dossier passe en « sans offre ». */
export function requestStatusAfterLeaserRefusal(otherActiveOffers: number): RequestStatus {
  return otherActiveOffers > 0 ? RS.offers_available : RS.no_match
}

/** Réponse du leaser sur une offre transmise (seela_validated). Le motif d'un refus reste interne. */
export async function recordLeaserDecision(deps: WorkflowDeps, offerId: string, decision: 'confirmed' | 'refused', reason: string) {
  const ctx = await deps.store.loadOffer(offerId)
  if (!ctx) throw new WorkflowError('Offre introuvable.')
  const { offer, request } = ctx

  const offerTo = decision === 'confirmed' ? OS.leaser_confirmed : OS.refused
  const requestTo = decision === 'confirmed'
    ? RS.leaser_confirmed
    : requestStatusAfterLeaserRefusal(await deps.store.countOtherActiveOffers(request.id, offer.id))
  if (!canTransitionOffer(offer.status, offerTo, 'admin') || !canTransitionRequest(request.status, requestTo, 'admin')) {
    throw new WorkflowError('Cette offre n’est pas en attente de réponse du leaser.')
  }
  if (decision === 'refused' && !reason.trim()) throw new WorkflowError('Indiquez le motif du refus.')

  await deps.store.transitionOffer(offer.id, offer.status, offerTo,
    decision === 'confirmed' ? { leaser_confirmed_at: nowIso(deps) } : { selected: false })
  try {
    await deps.store.transitionRequest(request.id, request.status, requestTo)
  } catch (err) {
    await deps.store.restoreOffer(offer.id, offerTo,
      decision === 'confirmed' ? { status: offer.status, leaser_confirmed_at: null } : { status: offer.status, selected: true })
    throw err
  }

  await deps.log({
    action: decision === 'confirmed' ? 'Offre acceptée par le leaser' : 'Offre refusée par le leaser',
    requestId: request.id,
    before: { offer: offer.status, request: request.status },
    after: { offer: offerTo, request: requestTo, leaser: offer.leaser_name },
    note: reason.trim() || null,
  })

  if (!ctx.profile?.email) return
  const common = { userEmail: ctx.profile.email, companyName: ctx.profile.company_name ?? 'Entreprise', leaserName: offer.leaser_name, requestRef: requestLabel(request) }
  await sendLogged(deps, request.id, decision === 'confirmed'
    ? emailClientLeaserConfirmed({ ...common, monthlyPayment: offer.monthly_payment, durationMonths: offer.duration_months })
    : emailClientLeaserRefused(common))
}

/** Refus du dossier par l'équipe (tout statut avant active). Message au client facultatif. */
export async function refuseRequest(deps: WorkflowDeps, requestId: string, reason: string, clientMessage: string) {
  const ctx = await deps.store.loadRequest(requestId)
  if (!ctx) throw new WorkflowError('Dossier introuvable.')
  const { request } = ctx
  if (!canTransitionRequest(request.status, RS.refused, 'admin')) throw new WorkflowError('Ce dossier ne peut plus être refusé.')
  if (!reason.trim()) throw new WorkflowError('Indiquez le motif du refus (interne).')

  await deps.store.transitionRequest(request.id, request.status, RS.refused)
  await deps.log({
    action: 'Dossier refusé',
    requestId: request.id,
    before: { request: request.status },
    after: { request: RS.refused },
    note: reason.trim(),
  })

  if (clientMessage.trim() && ctx.profile?.email) {
    await sendLogged(deps, request.id, emailClientRequestRefused({
      userEmail: ctx.profile.email,
      companyName: ctx.profile.company_name ?? 'Entreprise',
      message: clientMessage.trim(),
      requestRef: requestLabel(request),
    }))
  }
}

