import { clientRoute } from '@/lib/client-route'
import { supabaseDraftStore } from '@/lib/draft-store'
import { removeDraft, replaceDocument, saveSelection } from '@/lib/draft-workflow'

// Modifier un brouillon : `selectedIds` (lignes à financer) ou `documentUrl` + `documentType` (changer de document).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>
  return clientRoute(id, async ({ userId, db }) => {
    const store = supabaseDraftStore(db)
    if ('documentUrl' in body) await replaceDocument(store, userId, id, body.documentUrl, body.documentType)
    else await saveSelection(store, userId, id, body.selectedIds)
    return { ok: true }
  })
}

// Supprimer un brouillon et son fichier.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return clientRoute(id, async ({ userId, db }) => {
    await removeDraft(supabaseDraftStore(db), userId, id)
    return { ok: true }
  })
}
