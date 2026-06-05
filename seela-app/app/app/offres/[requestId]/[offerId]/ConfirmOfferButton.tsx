'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  offerId: string
  requestId: string
  allOfferIds: string[]
}

export default function ConfirmOfferButton({ offerId, requestId, allOfferIds }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (loading) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('offers').update({ selected: false }).in('id', allOfferIds)
    await supabase.from('offers').update({ selected: true, status: 'selected' }).eq('id', offerId)
    await supabase.from('financing_requests').update({ status: 'active' }).eq('id', requestId)
    router.push(`/app/contrats/${requestId}`)
  }

  return (
    <div>
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full py-3.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: '#4F46E5', color: '#fff', borderRadius: 10 }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-t-white animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
            Confirmation…
          </>
        ) : (
          <>
            Confirmer ma sélection
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="5" width="8" height="6" rx="1" stroke="#9A9A93" strokeWidth="1.2" />
          <path d="M4 5V3.5a2 2 0 114 0V5" stroke="#9A9A93" strokeWidth="1.2" />
        </svg>
        <span className="text-xs" style={{ color: '#9A9A93' }}>
          Offre indicative — confirmation par le leaser sous 48h
        </span>
      </div>
    </div>
  )
}
