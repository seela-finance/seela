import { clientRoute } from '@/lib/client-route'
import { confirmOffer } from '@/lib/client-workflow'

// Le client confirme une offre (ou accepte une contre-offre) : une seule par dossier.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return clientRoute(id, async ({ userId, store }) => {
    await confirmOffer(store, userId, id)
    return { ok: true }
  })
}
