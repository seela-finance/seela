'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { ALLOWED_MIME_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/documents'
import { isPieceKind, PIECE_INFO } from '@/lib/pieces'
import { registerPiece, removeOwnPiece } from '@/lib/pieces-store'
import { emailTeamPieceDeposited, sendEmail } from '@/lib/email'

export type PieceActionResult = { ok: true } | { ok: false; message: string }
const FAIL: PieceActionResult = { ok: false, message: 'Enregistrement impossible, réessayez.' }

async function me() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isServiceRoleConfigured()) return null
  const db = createAdminClient()
  const { data: contact } = await db.from('contacts').select('id, company_id, companies ( name )').eq('user_id', user.id).maybeSingle()
  const row = contact as unknown as { id: string; company_id: string | null; companies: { name: string } | null } | null
  return { user, db, companyId: row?.company_id ?? null, companyName: row?.companies?.name ?? null }
}

/**
 * Le fichier est déjà dans le bucket privé, sous le dossier du client (RLS du stockage) : on enregistre la pièce
 * et on prévient l'équipe. Le chemin doit rester sous `<user>/pieces/` : rien d'autre n'est accepté.
 */
export async function registerPieceAction(input: { kind: string; path: string; fileName: string; mimeType: string; size: number }): Promise<PieceActionResult> {
  try {
    const ctx = await me()
    if (!ctx) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
    if (!ctx.companyId) return { ok: false, message: 'Indiquez d’abord votre entreprise.' }
    if (!isPieceKind(input.kind)) return { ok: false, message: 'Pièce inconnue.' }
    if (typeof input.path !== 'string' || !input.path.startsWith(`${ctx.user.id}/pieces/`) || input.path.includes('..')) return { ok: false, message: 'Fichier invalide.' }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(input.mimeType)) return { ok: false, message: 'Format non supporté (PDF, JPG ou PNG).' }
    if (!(input.size > 0 && input.size <= MAX_DOCUMENT_BYTES)) return { ok: false, message: 'Fichier trop volumineux (20 Mo max).' }

    await registerPiece(ctx.db, {
      company_id: ctx.companyId, kind: input.kind, path: input.path,
      file_name: String(input.fileName ?? '').slice(0, 200) || null, mime_type: input.mimeType, size_bytes: Math.round(input.size), uploaded_by: ctx.user.id,
    })
    // Une liasse déposée : le score et l'analyse crédit savent que les comptes sont là
    if (input.kind === 'liasse') await ctx.db.from('companies').update({ financial_docs_uploaded: true }).eq('id', ctx.companyId)

    // L'équipe contrôle la pièce : email, sans bloquer le dépôt s'il n'est pas parti
    await sendEmail(emailTeamPieceDeposited({ companyName: ctx.companyName ?? 'Société', pieceLabel: PIECE_INFO[input.kind].label, companyId: ctx.companyId })).catch(() => null)
    revalidatePath('/app/compte')
    revalidatePath('/app/dashboard')
    return { ok: true }
  } catch (err) {
    console.error('[compte pièce]', err)
    return FAIL
  }
}

/** Le client retire un dépôt encore en vérification ou refusé. */
export async function removePieceAction(id: string): Promise<PieceActionResult> {
  try {
    const ctx = await me()
    if (!ctx) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: 'Pièce introuvable.' }
    if (!(await removeOwnPiece(ctx.db, id, ctx.user.id))) return { ok: false, message: 'Cette pièce ne peut plus être retirée.' }
    revalidatePath('/app/compte')
    return { ok: true }
  } catch (err) {
    console.error('[compte pièce]', err)
    return FAIL
  }
}
