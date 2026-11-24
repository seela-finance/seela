'use client'

import { useActionState, useState } from 'react'
import { createContractRequestAction, type ContractRequestState } from '@/app/app/contrats/[id]/actions'
import { KIND_INFO, MESSAGE_MAX, kindLabel, statusInfo, type ContractRequestKind, type ContractRequestRow } from '@/lib/contract-requests'

const DATE = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

/** Formulaire de demande : nature (parmi celles ouvertes à ce stade) + message. Se replie une fois envoyé. */
function RequestForm({ requestId, kinds }: { requestId: string; kinds: ContractRequestKind[] }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ContractRequestKind>(kinds[0])
  const [state, submit, pending] = useActionState<ContractRequestState, FormData>(async (prev, form) => {
    const result = await createContractRequestAction(prev, form)
    if (result?.ok) setOpen(false)
    return result
  }, null)

  if (!open) {
    return (
      <div className="px-4 sm:px-5 py-4">
        <button type="button" onClick={() => setOpen(true)} className="ev-btn ev-btn--primary ev-btn--sm">Faire une demande</button>
        {state?.ok && <p role="status" className="ev-alert ev-alert--ok mt-3">{state.message}</p>}
      </div>
    )
  }

  return (
    <form action={submit} className="px-4 sm:px-5 py-4 space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <fieldset>
        <legend className="ev-label">Nature de la demande</legend>
        <div className="grid sm:grid-cols-2 gap-2 mt-1">
          {kinds.map(k => (
            <label
              key={k}
              className={`ev-card ${kind === k ? 'ev-card--selected' : 'ev-card--interactive'} flex items-start gap-3 px-4 py-3 cursor-pointer`}
              style={{ background: kind === k ? 'var(--accent-soft)' : 'var(--surface)' }}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="mt-0.5 shrink-0" style={{ accentColor: 'var(--accent)' }} />
              <span className="min-w-0">
                <span className="block text-sm font-medium" style={{ color: 'var(--ink)' }}>{KIND_INFO[k].label}</span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>{KIND_INFO[k].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="ev-label">Votre message</span>
        <textarea name="message" rows={4} required minLength={10} maxLength={MESSAGE_MAX} placeholder={KIND_INFO[kind].placeholder} className="ev-input" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">{pending ? 'Envoi…' : 'Envoyer la demande'}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs underline" style={{ color: 'var(--ink-3)' }}>Annuler</button>
      </div>
      {state && !state.ok && <p role="alert" className="ev-alert ev-alert--danger">{state.message}</p>}
      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Un conseiller everlease vous rappelle sous 24 h ouvrées. Les décisions sur le contrat restent celles du financeur.</p>
    </form>
  )
}

/** Bloc « Demandes » de la fiche contrat : formulaire puis historique avec l'état et la réponse de l'équipe. */
export default function ContractRequests({ requestId, kinds, rows }: { requestId: string; kinds: ContractRequestKind[]; rows: ContractRequestRow[] }) {
  return (
    <section className="ev-card overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b flex items-center justify-between gap-3" style={{ borderColor: 'var(--line)' }}>
        <h2 className="ev-kicker">Demandes</h2>
        {rows.length > 0 && <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{rows.length}</span>}
      </div>
      {kinds.length > 0 ? <RequestForm requestId={requestId} kinds={kinds} /> : (
        <p className="px-4 sm:px-5 py-4 text-sm" style={{ color: 'var(--ink-3)' }}>Les demandes s’ouvrent une fois le contrat en place.</p>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-[var(--line)] border-t" style={{ borderColor: 'var(--line)' }}>
          {rows.map(r => {
            const info = statusInfo(r.status)
            return (
              <li key={r.id} className="px-4 sm:px-5 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{kindLabel(r.kind)}</p>
                    <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{DATE(r.created_at)} · {info.client}</p>
                  </div>
                  <span className={`${info.tag} shrink-0`}><span className="ev-tag__dot" />{info.label}</span>
                </div>
                <p className="text-sm mt-2 whitespace-pre-line" style={{ color: 'var(--ink-2)' }}>{r.message}</p>
                {r.answer && (
                  <div className="mt-2 pl-3 text-sm whitespace-pre-line" style={{ borderLeft: '2px solid var(--ink)', color: 'var(--ink)' }}>
                    <span className="block text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>Réponse de votre conseiller{r.answered_at ? ` · ${DATE(r.answered_at)}` : ''}</span>
                    {r.answer}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
