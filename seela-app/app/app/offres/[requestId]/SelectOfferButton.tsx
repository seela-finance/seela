'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  offerId: string
  requestId: string
  allOfferIds: string[]
  featured?: boolean
}

export default function SelectOfferButton({ offerId, requestId, allOfferIds, featured = false }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSelect() {
    if (loading) return
    setLoading(true)
    const supabase = createClient()

    await supabase.from('offers').update({ selected: false }).in('id', allOfferIds)
    await supabase.from('offers').update({ selected: true }).eq('id', offerId)
    await supabase.from('financing_requests').update({ status: 'active' }).eq('id', requestId)

    router.push(`/app/contrats/${requestId}`)
    router.refresh()
  }

  return (
    <button
      onClick={handleSelect}
      disabled={loading}
      className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
      style={
        featured
          ? { background: '#fff', color: '#0E0E0C', borderRadius: 8 }
          : { background: '#0E0E0C', color: '#fff', borderRadius: 8 }
      }
    >
      {loading ? 'Confirmation…' : 'Sélectionner →'}
    </button>
  )
}
