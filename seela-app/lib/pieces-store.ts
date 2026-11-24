import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PieceDoc, PieceKind, PieceStatus } from '@/lib/pieces'

export const PIECE_COLUMNS = 'id, kind, status, path, file_name, review_note, created_at, reviewed_at, deleted_at'

/** Pièces d'une société, les plus anciennes d'abord (lib/pieces.ts garde la dernière de chaque nature). */
export async function loadCompanyPieces(db: SupabaseClient, companyId: string): Promise<PieceDoc[]> {
  const { data, error } = await db.from('company_documents').select(PIECE_COLUMNS).eq('company_id', companyId).order('created_at')
  // Avant la migration, la table n'existe pas : aucune pièce, rien ne bloque
  if (error) {
    console.error('[pièces] lecture', error.message)
    return []
  }
  return (data ?? []) as PieceDoc[]
}

/** Enregistre un dépôt (fichier déjà dans le bucket, sous le dossier du client). */
export async function registerPiece(db: SupabaseClient, values: {
  company_id: string; kind: PieceKind; path: string; file_name: string | null; mime_type: string | null; size_bytes: number | null; uploaded_by: string; request_id?: string | null
}): Promise<PieceDoc> {
  const { data, error } = await db.from('company_documents').insert({ ...values, status: 'en_verification' }).select(PIECE_COLUMNS).single()
  if (error) throw new Error(`Pièce : enregistrement impossible (${error.message})`)
  return data as PieceDoc
}

/** Décision de l'équipe sur une pièce en vérification (ou déjà tranchée : on peut revenir dessus). */
export async function reviewPiece(db: SupabaseClient, id: string, status: Exclude<PieceStatus, 'en_verification'>, reviewer: string, note: string | null): Promise<PieceDoc | null> {
  const { data, error } = await db.from('company_documents')
    .update({ status, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), review_note: note, updated_at: new Date().toISOString() })
    .eq('id', id).is('deleted_at', null).select(`${PIECE_COLUMNS}, company_id`).maybeSingle()
  if (error) throw new Error(`Pièce : décision impossible (${error.message})`)
  return (data as PieceDoc | null) ?? null
}

/** Dispense d'une pièce requise (pas de fichier) : la transmission n'est plus bloquée par elle. */
export async function dispensePiece(db: SupabaseClient, companyId: string, kind: PieceKind, reviewer: string, note: string): Promise<void> {
  const { error } = await db.from('company_documents').insert({
    company_id: companyId, kind, status: 'dispensee', path: null, uploaded_by: null, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), review_note: note,
  })
  if (error) throw new Error(`Pièce : dispense impossible (${error.message})`)
}

/** Le client retire un dépôt encore en vérification ou refusé : fichier et ligne supprimés. */
export async function removeOwnPiece(db: SupabaseClient, id: string, userId: string): Promise<boolean> {
  const { data } = await db.from('company_documents').select('id, path, status').eq('id', id).eq('uploaded_by', userId).in('status', ['en_verification', 'refusee']).maybeSingle()
  if (!data) return false
  if (data.path) await db.storage.from('documents').remove([data.path as string])
  const { error } = await db.from('company_documents').delete().eq('id', id)
  if (error) throw new Error(`Pièce : suppression impossible (${error.message})`)
  return true
}

/** Efface le fichier d'une pièce sensible et marque la ligne (historique conservé). */
export async function purgePiece(db: SupabaseClient, doc: PieceDoc): Promise<void> {
  if (doc.path) {
    const { error } = await db.storage.from('documents').remove([doc.path])
    if (error) throw new Error(`Pièce : fichier non effacé (${error.message})`)
  }
  const { error } = await db.from('company_documents').update({ deleted_at: new Date().toISOString(), path: null }).eq('id', doc.id)
  if (error) throw new Error(`Pièce : marquage impossible (${error.message})`)
}

/** Lien temporaire pour l'équipe (aperçu dans l'admin). */
export async function piecePreviewUrl(db: SupabaseClient, doc: PieceDoc, expiresInSeconds = 3600): Promise<string | null> {
  if (!doc.path || doc.deleted_at) return null
  const { data, error } = await db.storage.from('documents').createSignedUrl(doc.path, expiresInSeconds)
  return error || !data ? null : data.signedUrl
}
