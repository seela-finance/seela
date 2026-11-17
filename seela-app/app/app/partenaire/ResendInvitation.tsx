'use client'

import { useState } from 'react'

// Renvoi du lien au client (adresse corrigée ou lien expiré) : l'ancien lien cesse de fonctionner.
export default function ResendInvitation({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)
    const res = await fetch(`/api/partner/requests/${requestId}/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    if (!res?.ok) {
      setError(data.error ?? 'Envoi impossible, réessayez.')
      setState('idle')
      return
    }
    setState('sent')
    setOpen(false)
  }

  if (state === 'sent') return <p className="text-xs" style={{ color: 'var(--ok)' }}>Lien renvoyé</p>
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium underline" style={{ color: 'var(--ink-2)' }}>
        Renvoyer le lien
      </button>
    )
  }
  return (
    <form onSubmit={send} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email du client"
        aria-label="Email du client"
        className="ev-input"
        style={{ minWidth: 200 }}
      />
      <button type="submit" disabled={state === 'sending'} className="ev-btn ev-btn--primary ev-btn--sm">
        {state === 'sending' ? 'Envoi…' : 'Envoyer'}
      </button>
      {error && <p role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  )
}
