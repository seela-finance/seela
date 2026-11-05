// Brouillon d'un dossier (#27) : analyse enregistrée une seule fois, sélection, remplacement du
// document, suppression. Logique sans dépendance serveur : la base est injectée (lib/draft-store.ts).
import { documentPath } from '@/lib/documents'
import { ClientActionError, DOCUMENT_TYPES, parseDocumentMeta, type SubmitPayload } from '@/lib/client-workflow'
import { RS } from '@/lib/status'

const MAX_LINES = 200

export type DraftMeta = SubmitPayload['meta']

export type DraftLine = {
  description: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  category: string | null
  selected: boolean
}

export type SavedLine = DraftLine & { id: string }

export type Draft = { id: string; status: string; user_id: string; document_url: string | null }

export interface DraftStore {
  loadDraft(requestId: string): Promise<Draft | null>
  loadContent(requestId: string): Promise<{ lines: SavedLine[]; meta: DraftMeta }>
  saveAnalysis(requestId: string, lines: DraftLine[], meta: DraftMeta): Promise<SavedLine[]>
  setSelection(requestId: string, selectedIds: string[]): Promise<void>
  /** Remplace le document d'un brouillon et efface ce qui en avait été extrait ; false si ce n'est plus un brouillon. */
  swapDocument(requestId: string, documentUrl: string, documentType: string): Promise<boolean>
  /** false si le dossier n'est plus un brouillon. */
  deleteDraft(requestId: string): Promise<boolean>
  removeFile(path: string): Promise<void>
}

const text = (v: unknown, max = 500) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Réponse de l'IA → lignes et métadonnées à enregistrer. Rien n'est repris sans contrôle de type. */
export function parseAnalysis(raw: unknown): { lines: DraftLine[]; meta: DraftMeta; documentKind: 'devis' | 'facture' | null } {
  const r = (raw ?? {}) as Record<string, unknown>
  const supplier = (r.supplier ?? {}) as Record<string, unknown>
  const lines = (Array.isArray(r.items) ? r.items.slice(0, MAX_LINES) : []).map(item => {
    const i = (item ?? {}) as Record<string, unknown>
    const total = num(i.total_price)
    return {
      description: text(i.description),
      quantity: num(i.quantity),
      unit_price: num(i.unit_price),
      total_price: total,
      category: text(i.category, 50),
      // Une ligne sans montant ne se finance pas : décochée d'office
      selected: total != null && total > 0,
    }
  })
  return {
    lines,
    meta: parseDocumentMeta({
      supplier_name: supplier.name,
      supplier_address: supplier.address,
      supplier_siren: supplier.siren,
      document_number: r.document_number,
      document_date: r.document_date,
    }),
    documentKind: r.document_kind === 'devis' || r.document_kind === 'facture' ? r.document_kind : null,
  }
}

async function ownedDraft(store: DraftStore, userId: string, requestId: string): Promise<Draft> {
  const draft = await store.loadDraft(requestId)
  if (!draft || draft.user_id !== userId) throw new ClientActionError('Dossier introuvable.', 404)
  if (draft.status !== RS.draft) throw new ClientActionError('Ce dossier a déjà été transmis.', 409)
  return draft
}

/**
 * Lignes du brouillon. L'IA n'est appelée que si aucune ligne n'est enregistrée : revenir en arrière
 * ou reprendre plus tard ne coûte rien et ne change pas le résultat. Une analyse sans ligne n'est pas
 * enregistrée, pour que le client puisse réessayer.
 */
export async function analyzeDraft(
  store: DraftStore,
  userId: string,
  requestId: string,
  runAi: (documentUrl: string) => Promise<unknown>,
) {
  const draft = await ownedDraft(store, userId, requestId)
  if (!draft.document_url) throw new ClientActionError('Aucun document à analyser.', 400)

  const existing = await store.loadContent(requestId)
  if (existing.lines.length > 0) return { items: existing.lines, meta: existing.meta, document_kind: null }

  const { lines, meta, documentKind } = parseAnalysis(await runAi(draft.document_url))
  const items = lines.length > 0 ? await store.saveAnalysis(requestId, lines, meta) : []
  return { items, meta, document_kind: documentKind }
}

export async function saveSelection(store: DraftStore, userId: string, requestId: string, selectedIds: unknown) {
  if (!Array.isArray(selectedIds) || selectedIds.length > MAX_LINES || selectedIds.some(id => typeof id !== 'string')) {
    throw new ClientActionError('Sélection invalide.', 400)
  }
  await ownedDraft(store, userId, requestId)
  await store.setSelection(requestId, selectedIds as string[])
}

/** Change le document du même brouillon : pas de second dossier, et l'ancien fichier est retiré. */
export async function replaceDocument(store: DraftStore, userId: string, requestId: string, documentUrl: unknown, documentType: unknown) {
  const type = DOCUMENT_TYPES.find(t => t === documentType)
  if (!type) throw new ClientActionError('Type de document invalide.', 400)
  if (!documentPath(documentUrl, userId)) throw new ClientActionError('Document invalide.', 400)

  const draft = await ownedDraft(store, userId, requestId)
  if (!(await store.swapDocument(requestId, documentUrl as string, type))) {
    throw new ClientActionError('Ce dossier a déjà été transmis.', 409)
  }
  if (draft.document_url !== documentUrl) await removeFileQuietly(store, draft.document_url, userId)
}

/** Supprime le brouillon, ses lignes (cascade) et son fichier. */
export async function removeDraft(store: DraftStore, userId: string, requestId: string) {
  const draft = await ownedDraft(store, userId, requestId)
  if (!(await store.deleteDraft(requestId))) throw new ClientActionError('Ce dossier a déjà été transmis.', 409)
  await removeFileQuietly(store, draft.document_url, userId)
}

// Un fichier resté en stockage ne doit pas faire échouer l'action du client : le dossier, lui, est à jour.
async function removeFileQuietly(store: DraftStore, documentUrl: string | null, userId: string) {
  const path = documentPath(documentUrl, userId)
  if (!path) return
  try {
    await store.removeFile(path)
  } catch (err) {
    console.error('[draft] fichier non supprimé', path, err)
  }
}
