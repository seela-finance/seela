import { clientRoute } from '@/lib/client-route'
import { parseSubmitPayload, submitRequest } from '@/lib/client-workflow'
import { runMatching } from '@/lib/matching'

// Soumission d'un brouillon : lignes, total calculé côté serveur, statut, puis matching.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  return clientRoute(id, async ({ userId, store, db }) => {
    const payload = parseSubmitPayload(body)
    const result = await submitRequest(store, userId, id, payload)
    if (result === 'already') return { status: result, offers: 0 }

    // Le dossier est transmis même si le matching échoue : il reste « submitted »,
    // visible dans l'onglet « À traiter » du back-office.
    try {
      const { offers } = await runMatching(db, id)
      return { status: result, offers }
    } catch (err) {
      console.error('[submit] matching', err)
      return { status: result, offers: 0 }
    }
  })
}
