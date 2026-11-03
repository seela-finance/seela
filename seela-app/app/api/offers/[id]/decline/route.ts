import { clientRoute } from '@/lib/client-route'
import { declineCounterOffer } from '@/lib/client-workflow'

// Le client refuse une contre-proposition.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return clientRoute(id, async ({ userId, store }) => {
    await declineCounterOffer(store, userId, id)
    return { ok: true }
  })
}
