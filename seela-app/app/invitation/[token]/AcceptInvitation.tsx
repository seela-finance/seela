'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Impossible d’ouvrir le dossier, réessayez.')
      router.push(data.next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’ouvrir le dossier, réessayez.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={accept} disabled={loading} className="ev-btn ev-btn--primary w-full justify-center">
        {loading ? 'Ouverture…' : 'Accéder à mon dossier'}
      </button>
      {error && <p role="alert" className="ev-alert ev-alert--danger mt-3 text-sm">{error}</p>}
    </div>
  )
}
