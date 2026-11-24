'use client'

import { useActionState, useState } from 'react'
import { updateContractRequestAction, type ContractRequestAdminState } from '@/app/admin/contract-requests-actions'
import { ADMIN_TRANSITIONS, isContractRequestStatus, kindLabel, statusInfo, type ContractRequestRow } from '@/lib/contract-requests'

const DATE = (s: string) => new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Feedback({ state }: { state: ContractRequestAdminState }) {
  if (!state) return null
  return <p role="status" className={`mt-2 ${state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}`}>{state.message}</p>
}

/** Prendre en charge, répondre (le client reçoit la réponse), clore. */
function Decision({ row }: { row: ContractRequestRow }) {
  const [answering, setAnswering] = useState(false)
  const [state, submit, pending] = useActionState<ContractRequestAdminState, FormData>(async (prev, form) => {
    const result = await updateContractRequestAction(prev, form)
    if (result?.ok) setAnswering(false)
    return result
  }, null)
  const next = isContractRequestStatus(row.status) ? ADMIN_TRANSITIONS[row.status] : []
  if (next.length === 0) return <Feedback state={state} />
  return (
    <form action={submit} className="mt-3">
      <input type="hidden" name="id" value={row.id} />
      {answering && (
        <textarea name="answer" rows={3} required placeholder="Réponse envoyée au client par email et affichée sur sa fiche contrat" className="ev-input mb-2" defaultValue={row.answer ?? ''} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!answering && next.includes('en_cours') && (
          <button type="submit" name="status" value="en_cours" disabled={pending} className="ev-btn ev-btn--ghost ev-btn--sm">Prendre en charge</button>
        )}
        {next.includes('repondue') && (
          answering ? (
            <>
              <button type="submit" name="status" value="repondue" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">Envoyer la réponse</button>
              <button type="button" onClick={() => setAnswering(false)} className="text-xs underline" style={{ color: 'var(--ink-3)' }}>Annuler</button>
            </>
          ) : (
            <button type="button" onClick={() => setAnswering(true)} className="ev-btn ev-btn--primary ev-btn--sm">{row.answer ? 'Compléter la réponse' : 'Répondre'}</button>
          )
        )}
        {!answering && next.includes('close') && (
          <button type="submit" name="status" value="close" disabled={pending} className="text-xs underline" style={{ color: 'var(--ink-3)' }}>Clore</button>
        )}
      </div>
      <Feedback state={state} />
    </form>
  )
}

/** Demandes du client sur un dossier, dans le back-office : message, état, réponse, actions. */
export default function ContractRequestsCard({ rows, canEdit }: { rows: ContractRequestRow[]; canEdit: boolean }) {
  if (rows.length === 0) return <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Aucune demande du client.</p>
  return (
    <ul className="divide-y divide-[var(--line)]">
      {rows.map(row => {
        const info = statusInfo(row.status)
        return (
          <li key={row.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{kindLabel(row.kind)}</p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Reçue le {DATE(row.created_at)}</p>
              </div>
              <span className={`${info.tag} shrink-0`}><span className="ev-tag__dot" />{info.label}</span>
            </div>
            <p className="text-sm mt-2 whitespace-pre-line" style={{ color: 'var(--ink-2)' }}>{row.message}</p>
            {row.answer && (
              <div className="mt-2 pl-3 text-sm whitespace-pre-line" style={{ borderLeft: '2px solid var(--ink)', color: 'var(--ink)' }}>
                <span className="block text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>Réponse{row.answered_at ? ` · ${DATE(row.answered_at)}` : ''}</span>
                {row.answer}
              </div>
            )}
            {canEdit && <Decision row={row} />}
          </li>
        )
      })}
    </ul>
  )
}
