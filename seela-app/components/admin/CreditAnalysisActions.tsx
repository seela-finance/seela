'use client'

import { useActionState } from 'react'
import { creditAnalysisAction } from '@/app/admin/dossiers/[id]/actions'

// Lance ou relance l'analyse crédit du dossier (appel au modèle : une trentaine de secondes).
export default function CreditAnalysisActions({ requestId, hasAnalysis }: { requestId: string; hasAnalysis: boolean }) {
  const [state, run, running] = useActionState(creditAnalysisAction, null)

  return (
    <form action={run} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <button type="submit" disabled={running} className="ev-btn ev-btn--ghost ev-btn--sm">
        {running ? 'Analyse en cours (30 s environ)…' : hasAnalysis ? 'Relancer l’analyse' : 'Lancer l’analyse'}
      </button>
      {state && (
        <p role="status" className="text-sm" style={{ color: state.ok ? 'var(--ok)' : 'var(--danger)' }}>{state.message}</p>
      )}
    </form>
  )
}
