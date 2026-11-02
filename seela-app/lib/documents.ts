// Documents clients (bucket privé `documents`) : lecture serveur avant analyse IA et liens temporaires.
// N'accepte que les fichiers rangés sous le dossier de leur propriétaire
// (pas d'URL libre : évite SSRF, lecture des documents d'autrui et abus de coûts).
import type { SupabaseClient } from '@supabase/supabase-js'

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
// L'API Anthropic refuse les images de plus de 5 Mo (les PDF vont jusqu'à 20 Mo).
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export class DocumentError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function isAllowedMime(type: string): type is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type)
}

// `document_url` (écrit par le navigateur) garde le format public historique ; le bucket est
// privé : on n'en extrait que le chemin, et seulement sous le dossier du propriétaire.
const PUBLIC_PREFIX = '/storage/v1/object/public/documents/'

export function documentPath(documentUrl: unknown, ownerId: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || typeof documentUrl !== 'string' || !ownerId) return null
  // new URL() normalise les `..` (y compris encodés) : on compare l'URL résolue.
  let url: URL
  try {
    url = new URL(documentUrl)
  } catch {
    return null
  }
  // `%2F` / `%5C` (séparateurs encodés) ne sont pas normalisés par new URL() : refusés.
  if (url.origin !== new URL(supabaseUrl).origin || /%2f|%5c/i.test(url.pathname)) return null
  if (!url.pathname.startsWith(`${PUBLIC_PREFIX}${ownerId}/`)) return null
  try {
    return decodeURIComponent(url.pathname.slice(PUBLIC_PREFIX.length))
  } catch {
    return null
  }
}

// Lien temporaire vers un document (bucket privé). null si le document n'appartient pas à ownerId.
export async function signedDocumentUrl(
  supabase: SupabaseClient,
  documentUrl: unknown,
  ownerId: string,
  expiresInSeconds: number,
): Promise<string | null> {
  const path = documentPath(documentUrl, ownerId)
  if (!path) return null
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, expiresInSeconds)
  return error || !data ? null : data.signedUrl
}

export async function fetchOwnDocument(
  supabase: SupabaseClient,
  documentUrl: unknown,
  mimeType: unknown,
  userId: string,
): Promise<{ base64: string; type: AllowedMimeType }> {
  const path = documentPath(documentUrl, userId)
  if (!path) throw new DocumentError('Document invalide', 400)

  // Lecture via l'API Storage avec la session du client : la RLS du bucket s'applique.
  const { data: file, error } = await supabase.storage.from('documents').download(path)
  if (error || !file) throw new DocumentError('Document introuvable', 404)
  if (file.size > MAX_DOCUMENT_BYTES) throw new DocumentError('Document trop volumineux (20 Mo max)', 413)

  const buffer = await file.arrayBuffer()
  const type = typeof mimeType === 'string' && mimeType ? mimeType : file.type
  if (!isAllowedMime(type)) throw new DocumentError('Format non supporté (PDF, JPG ou PNG)', 415)
  if (type !== 'application/pdf' && buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new DocumentError('Image trop volumineuse (5 Mo max) — envoyez un PDF ou une image plus légère', 413)
  }

  return { base64: Buffer.from(buffer).toString('base64'), type }
}
