'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  offerId: string
}

// Accepter = confirmer la contre-offre (Everlease la valide ensuite) ; refuser = retour aux autres offres.
// Les statuts sont écrits côté serveur (routes /api/offers/[id]/confirm et /decline).
export default function CounterOfferActions({ offerId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'refuse' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(kind: 'accept' | 'refuse') {
    if (loading) return
    setLoading(kind)
    setError(null)
    try {
      const res = await fetch(`/api/offers/${offerId}/${kind === 'accept' ? 'confirm' : 'decline'}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Action impossible, réessayez.')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action impossible, réessayez.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => act('accept')}
          disabled={loading !== null}
          className="ev-btn ev-btn--primary"
        >
          {loading === 'accept' ? 'Confirmation…' : 'Accepter les conditions'}
        </button>
        <button
          onClick={() => act('refuse')}
          disabled={loading !== null}
          className="ev-btn ev-btn--danger"
        >
          {loading === 'refuse' ? 'Envoi…' : 'Refuser'}
        </button>
      </div>
      {error && <p className="ev-alert ev-alert--danger mt-2">{error}</p>}
    </div>
  )
}
