'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  offerId: string
  requestId: string
  allOfferIds: string[]
}

export default function CounterOfferActions({ offerId, requestId, allOfferIds }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'refuse' | null>(null)

  async function handleAccept() {
    if (loading) return
    setLoading('accept')
    const supabase = createClient()
    await supabase.from('offers').update({ selected: false }).in('id', allOfferIds)
    await supabase.from('offers').update({ selected: true, status: 'selected' }).eq('id', offerId)
    await supabase.from('financing_requests').update({ status: 'active' }).eq('id', requestId)
    router.refresh()
    setLoading(null)
  }

  async function handleRefuse() {
    if (loading) return
    setLoading('refuse')
    const supabase = createClient()
    await supabase.from('financing_requests').update({ status: 'submitted' }).eq('id', requestId)
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleAccept}
        disabled={loading !== null}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: '#0E0E0C', color: '#fff', borderRadius: 8 }}
      >
        {loading === 'accept' ? 'Confirmation…' : 'Accepter les conditions'}
      </button>
      <button
        onClick={handleRefuse}
        disabled={loading !== null}
        className="px-4 py-2 rounded-lg text-sm font-medium border transition-opacity hover:opacity-70 disabled:opacity-50"
        style={{ background: '#fff', color: '#92400E', borderColor: '#FED7AA', borderRadius: 8 }}
      >
        {loading === 'refuse' ? 'Envoi…' : 'Refuser'}
      </button>
    </div>
  )
}
