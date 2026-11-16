'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { can, type Capability } from '@/lib/admin-roles'
import { workflowDeps } from '@/lib/admin-store'
import { isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { addRequestNote, recordLeaserDecision, refuseRequest, rerunMatching, validateAndTransmit, WorkflowError } from '@/lib/admin-workflow'
import { TransitionError } from '@/lib/transitions'
import { isUuid } from '@/lib/admin-request-detail'
import { addManualOffer, parseCounterOffer, parseManualOffer, proposeCounterOffer } from '@/lib/admin-offers'

export type ActionState = { ok: boolean; message: string } | null

const DENIED: ActionState = { ok: false, message: 'Votre rôle ne permet pas cette action.' }

const field = (form: FormData, name: string) => String(form.get(name) ?? '').slice(0, 2000)

// Membre de l'équipe ayant ce droit, sinon null : une Server Action reste appelable sans passer par le bouton.
async function memberWith(capability: Capability) {
  const admin = await requireAdmin()
  return can(admin.role, capability) ? admin : null
}

// Vérifie l'accès, exécute l'action, traduit les erreurs en message pour l'admin, rafraîchit la fiche.
async function run(requestId: string, action: () => Promise<void>, success: string | (() => string)): Promise<ActionState> {
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  try {
    await action()
  } catch (err) {
    if (err instanceof WorkflowError) return { ok: false, message: err.message }
    if (err instanceof TransitionError) {
      return { ok: false, message: err.status === 409 ? 'Le dossier a changé entre-temps : rechargez la page.' : 'Écriture impossible, réessayez.' }
    }
    console.error('[admin action]', err)
    return { ok: false, message: 'Erreur inattendue, réessayez.' }
  } finally {
    if (isUuid(requestId)) revalidatePath(`/admin/dossiers/${requestId}`)
  }
  return { ok: true, message: typeof success === 'function' ? success() : success }
}

export async function rerunMatchingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await memberWith('decide_requests')
  if (!admin) return DENIED
  const requestId = field(form, 'requestId')
  let offers = 0
  return run(requestId, async () => { ({ offers } = await rerunMatching(workflowDeps(admin), requestId)) }, () =>
    offers > 0
      ? `${offers} offre${offers > 1 ? 's' : ''} ajoutée${offers > 1 ? 's' : ''} : visible${offers > 1 ? 's' : ''} sur l'espace du client, aucun email envoyé.`
      : 'Aucune nouvelle offre avec la grille actuelle.')
}

export async function addNoteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await memberWith('add_notes')
  if (!admin) return DENIED
  const requestId = field(form, 'requestId')
  return run(requestId, () => addRequestNote(workflowDeps(admin), requestId, field(form, 'note')), 'Note enregistrée.')
}

export async function validateOfferAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await memberWith('decide_requests')
  if (!admin) return DENIED
  const offerId = field(form, 'offerId')
  return run(field(form, 'requestId'), () => validateAndTransmit(workflowDeps(admin), offerId, field(form, 'note')),
    'Offre validée et transmise au leaser.')
}

export async function leaserDecisionAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await memberWith('decide_requests')
  if (!admin) return DENIED
  const decision = field(form, 'decision') === 'confirmed' ? 'confirmed' : 'refused'
  return run(field(form, 'requestId'), () => recordLeaserDecision(workflowDeps(admin), field(form, 'offerId'), decision, field(form, 'reason')),
    decision === 'confirmed' ? 'Acceptation du leaser enregistrée.' : 'Refus du leaser enregistré.')
}

export async function refuseRequestAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await memberWith('decide_requests')
  if (!admin) return DENIED
  const requestId = field(form, 'requestId')
  return run(requestId, () => refuseRequest(workflowDeps(admin), requestId, field(form, 'reason'), field(form, 'clientMessage')),
    'Dossier refusé.')
}

const formRecord = (form: FormData) => Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v).slice(0, 2000)]))

export async function addManualOfferAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await memberWith('decide_requests')
  if (!admin) return DENIED
  const requestId = field(form, 'requestId')
  return run(requestId, () => addManualOffer(workflowDeps(admin), requestId, parseManualOffer(formRecord(form))),
    'Offre ajoutée : visible sur l\'espace du client, qui est prévenu par email.')
}

export async function counterOfferAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await memberWith('decide_requests')
  if (!admin) return DENIED
  return run(field(form, 'requestId'), () => proposeCounterOffer(workflowDeps(admin), field(form, 'offerId'), parseCounterOffer(formRecord(form))),
    'Contre-proposition envoyée : le client est prévenu par email et peut l\'accepter ou la refuser.')
}
