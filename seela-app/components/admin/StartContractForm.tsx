'use client'

import { useActionState } from 'react'
import { startContractAction, type ActionState } from '@/app/admin/dossiers/[id]/actions'

/** Contrat signé et matériel livré : passage en « actif » avec la date de démarrage (fin = début + durée). */
export default function StartContractForm({ requestId, today }: { requestId: string; today: string }) {
  const [state, submit, pending] = useActionState<ActionState, FormData>(startContractAction, null)
  return (
    <form action={submit} className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
      <input type="hidden" name="requestId" value={requestId} />
      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Démarrer le contrat</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="ev-label">Date de démarrage</span>
          <input type="date" name="startDate" defaultValue={today} required className="ev-input" />
        </label>
        <button type="submit" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">
          {pending ? 'Enregistrement…' : 'Passer en contrat actif'}
        </button>
      </div>
      {state && <p role="status" className={state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}>{state.message}</p>}
    </form>
  )
}
