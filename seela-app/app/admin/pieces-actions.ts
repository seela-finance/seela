'use server'

import { revalidatePath } from 'next/cache'
import { logAdminEvent, requireAdmin } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { isUuid } from '@/lib/admin-request-detail'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { isPieceKind, PIECE_INFO } from '@/lib/pieces'
import { dispensePiece, reviewPiece } from '@/lib/pieces-store'
import { emailClientPieceRefused, sendEmail } from '@/lib/email'

export type PieceReviewState = { ok: boolean; message: string } | null

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim().slice(0, 1000)

function refresh(companyId: string) {
  revalidatePath(`/admin/crm/societes/${companyId}`)
  revalidatePath('/admin/dossiers', 'layout')
}

/** Valider ou refuser une pièce déposée. Un refus exige un motif, envoyé au client. */
export async function reviewPieceAction(_: PieceReviewState, form: FormData): Promise<PieceReviewState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'decide_requests')) return { ok: false, message: 'Votre rôle ne permet pas cette action.' }
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  const id = field(form, 'pieceId'), companyId = field(form, 'companyId'), decision = field(form, 'decision'), note = field(form, 'note')
  if (!isUuid(id) || !isUuid(companyId)) return { ok: false, message: 'Pièce introuvable.' }
  if (decision !== 'validee' && decision !== 'refusee') return { ok: false, message: 'Décision inconnue.' }
  if (decision === 'refusee' && note.length < 3) return { ok: false, message: 'Indiquez au client pourquoi la pièce est refusée.' }
  try {
    const db = createAdminClient()
    const doc = await reviewPiece(db, id, decision, admin.userId, decision === 'refusee' ? note : note || null)
    if (!doc) return { ok: false, message: 'Pièce introuvable ou déjà effacée.' }
    const label = isPieceKind(doc.kind) ? PIECE_INFO[doc.kind].label : doc.kind
    await logAdminEvent(admin, { action: decision === 'validee' ? 'Pièce validée' : 'Pièce refusée', after: { company_id: companyId, piece: doc.kind }, note: note || null })
    if (decision === 'refusee') {
      const { data: company } = await db.from('companies').select('name, contacts ( email, user_id )').eq('id', companyId).maybeSingle()
      const c = company as unknown as { name: string; contacts: { email: string | null; user_id: string | null }[] | null } | null
      const email = c?.contacts?.find(x => x.user_id && x.email)?.email
      if (email) await sendEmail(emailClientPieceRefused({ userEmail: email, companyName: c?.name ?? 'Votre société', pieceLabel: label, note })).catch(() => null)
    }
    refresh(companyId)
    return { ok: true, message: decision === 'validee' ? `${label} validée.` : `${label} refusée, le client est prévenu.` }
  } catch (err) {
    console.error('[pièces]', err)
    return { ok: false, message: 'Enregistrement impossible, réessayez.' }
  }
}

/** Dispenser une pièce requise (motif interne obligatoire) : elle ne bloque plus la transmission. */
export async function dispensePieceAction(_: PieceReviewState, form: FormData): Promise<PieceReviewState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'decide_requests')) return { ok: false, message: 'Votre rôle ne permet pas cette action.' }
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  const companyId = field(form, 'companyId'), kind = field(form, 'kind'), note = field(form, 'note')
  if (!isUuid(companyId) || !isPieceKind(kind)) return { ok: false, message: 'Pièce inconnue.' }
  if (note.length < 3) return { ok: false, message: 'Indiquez pourquoi cette pièce n’est pas requise.' }
  try {
    await dispensePiece(createAdminClient(), companyId, kind, admin.userId, note)
    await logAdminEvent(admin, { action: 'Pièce dispensée', after: { company_id: companyId, piece: kind }, note })
    refresh(companyId)
    return { ok: true, message: `${PIECE_INFO[kind].label} : dispense enregistrée.` }
  } catch (err) {
    console.error('[pièces]', err)
    return { ok: false, message: 'Enregistrement impossible, réessayez.' }
  }
}
