// Téléchargement côté serveur d'un document uploadé par le client, avant analyse IA.
// N'accepte que les fichiers du bucket `documents` rangés sous le dossier de l'utilisateur
// (pas d'URL libre : évite SSRF, lecture des documents d'autrui et abus de coûts).

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

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

export async function fetchOwnDocument(
  documentUrl: unknown,
  mimeType: unknown,
  userId: string,
): Promise<{ base64: string; type: AllowedMimeType }> {
  // new URL() normalise les `..` (y compris encodés) : on compare l'URL résolue.
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  let url: URL
  try {
    url = new URL(String(documentUrl))
  } catch {
    throw new DocumentError('Document invalide', 400)
  }
  const ownFolder = `/storage/v1/object/public/documents/${userId}/`
  if (url.origin !== supabaseUrl.origin || !url.pathname.startsWith(ownFolder)) {
    throw new DocumentError('Document invalide', 400)
  }

  const res = await fetch(url)
  if (!res.ok) throw new DocumentError('Document introuvable', 404)

  const declaredSize = Number(res.headers.get('content-length') ?? 0)
  if (declaredSize > MAX_DOCUMENT_BYTES) throw new DocumentError('Document trop volumineux (20 Mo max)', 413)

  const buffer = await res.arrayBuffer()
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) throw new DocumentError('Document trop volumineux (20 Mo max)', 413)

  const type = typeof mimeType === 'string' && mimeType ? mimeType : (res.headers.get('content-type') ?? '')
  if (!isAllowedMime(type)) throw new DocumentError('Format non supporté (PDF, JPG ou PNG)', 415)

  return { base64: Buffer.from(buffer).toString('base64'), type }
}
