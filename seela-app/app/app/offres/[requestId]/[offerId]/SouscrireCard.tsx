'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  offerId: string
  requestId: string
  allOfferIds: string[]
  initialStatus: string
  leaserName: string
  leaserDelai: number
  companyName: string
  siren: string
  userEmail: string
  referentName: string
}

type StepState = 'active' | 'done' | 'pending' | 'loading'

function StepIcon({ state, n }: { state: StepState; n: number }) {
  if (state === 'done') {
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: '#16A34A' }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  if (state === 'loading') {
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: '#EEF2FF' }}
      >
        <div
          className="w-3 h-3 rounded-full border-2 animate-spin"
          style={{ borderColor: '#C7D2FE', borderTopColor: '#4F46E5' }}
        />
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
        style={{ background: '#4F46E5', color: '#fff' }}
      >
        {n}
      </div>
    )
  }
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 border"
      style={{ background: '#F5F5F4', color: '#9A9A93', borderColor: '#E5E5E3' }}
    >
      {n}
    </div>
  )
}

function stepStates(status: string): [StepState, StepState, StepState] {
  switch (status) {
    case 'indicative':
      return ['active', 'pending', 'pending']
    case 'client_confirmed':
      return ['done', 'loading', 'pending']
    case 'seela_validated':
      return ['done', 'done', 'loading']
    case 'leaser_confirmed':
    case 'active':
      return ['done', 'done', 'done']
    case 'refused':
      return ['done', 'done', 'pending']
    default:
      return ['active', 'pending', 'pending']
  }
}

export default function SouscrireCard({
  offerId,
  requestId,
  allOfferIds,
  initialStatus,
  leaserName,
  leaserDelai,
  companyName,
  siren,
  userEmail,
  referentName,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const [s1, s2, s3] = stepStates(status)

  const poll = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('offers')
      .select('status')
      .eq('id', offerId)
      .single()
    if (data?.status && data.status !== status) {
      setStatus(data.status)
    }
  }, [offerId, status])

  useEffect(() => {
    if (status !== 'client_confirmed' && status !== 'seela_validated') return
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [status, poll])

  async function handleConfirm() {
    if (loading) return
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.from('offers').update({ selected: false }).in('id', allOfferIds)
      await supabase.from('offers').update({
        selected: true,
        status: 'client_confirmed',
      }).eq('id', offerId)
      await supabase.from('financing_requests').update({ status: 'offer_selected' }).eq('id', requestId)
      setStatus('client_confirmed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border p-5 sticky top-6" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
      <h2 className="font-semibold text-sm mb-0.5" style={{ color: '#0E0E0C' }}>Souscrire à cette offre</h2>
      <p className="text-xs mb-5" style={{ color: '#9A9A93' }}>
        Confirmation par le leaser sous {leaserDelai}h ouvrées
      </p>

      {/* Refused state */}
      {status === 'refused' && (
        <div className="rounded-xl p-4 mb-5" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
          <p className="text-sm font-medium mb-2" style={{ color: '#92400E' }}>
            {leaserName} n&apos;a pas pu donner suite.
          </p>
          <Link
            href={`/app/offres/${requestId}`}
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: '#4F46E5' }}
          >
            Voir les autres offres →
          </Link>
        </div>
      )}

      {/* Confirmed state */}
      {(status === 'leaser_confirmed' || status === 'active') && (
        <div className="rounded-xl p-4 mb-5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div className="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l4 4 6-6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-semibold" style={{ color: '#166534' }}>Financement confirmé</p>
          </div>
          <p className="text-xs" style={{ color: '#166534' }}>
            Votre contrat est en préparation.
          </p>
          <Link
            href={`/app/contrats/${requestId}`}
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: '#166534' }}
          >
            Voir mon contrat →
          </Link>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4 mb-6">
        {/* Step 1 */}
        <div className={`flex items-start gap-3 ${s1 === 'pending' ? 'opacity-40' : ''}`}>
          <StepIcon state={s1} n={1} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#0E0E0C' }}>Vérification</p>
            <p className="text-xs" style={{ color: '#9A9A93' }}>Informations du dossier</p>
            {s1 === 'active' && (
              <div className="mt-3 p-3 rounded-xl border" style={{ background: '#FAFAF9', borderColor: '#E5E5E3' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#0E0E0C' }}>
                  {companyName || userEmail.split('@')[0]}
                </p>
                {siren && (
                  <p className="text-xs mb-0.5" style={{ color: '#9A9A93' }}>SIREN {siren}</p>
                )}
                <p className="text-xs" style={{ color: '#9A9A93' }}>{userEmail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className={`flex items-start gap-3 ${s2 === 'pending' ? 'opacity-40' : ''}`}>
          <StepIcon state={s2} n={2} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#0E0E0C' }}>Validation Everlease</p>
            <p className="text-xs" style={{ color: '#9A9A93' }}>Examen par un conseiller</p>
            {s2 === 'loading' && (
              <p className="text-xs mt-1" style={{ color: '#4F46E5' }}>Votre sélection est enregistrée. Notre équipe examine votre dossier.</p>
            )}
          </div>
        </div>

        {/* Step 3 */}
        <div className={`flex items-start gap-3 ${s3 === 'pending' ? 'opacity-40' : ''}`}>
          <StepIcon state={s3} n={3} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#0E0E0C' }}>Confirmation leaser</p>
            <p className="text-xs" style={{ color: '#9A9A93' }}>Contrat de location</p>
            {s3 === 'loading' && (
              <p className="text-xs mt-1" style={{ color: '#4F46E5' }}>Le leaser examine votre dossier…</p>
            )}
          </div>
        </div>
      </div>

      {referentName && status !== 'refused' && (
        <p className="text-xs mb-4" style={{ color: '#9A9A93' }}>
          Référent : {referentName}
        </p>
      )}

      {/* Confirm button — only when indicative */}
      {status === 'indicative' && (
        <div>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#4F46E5', color: '#fff', borderRadius: 10 }}
          >
            {loading ? (
              <>
                <div
                  className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                />
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
      )}
    </div>
  )
}
