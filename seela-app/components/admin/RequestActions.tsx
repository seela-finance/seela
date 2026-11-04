'use client'

import { useActionState, useState } from 'react'
import {
  leaserDecisionAction,
  refuseRequestAction,
  validateOfferAction,
  type ActionState,
} from '@/app/admin/dossiers/[id]/actions'

type Preview = { to: string; cc?: string; subject: string; html: string } | { error: string }

type Props = {
  requestId: string
  // Ce que la fiche autorise selon les statuts (calculé côté serveur avec lib/status.ts)
  canValidate: boolean
  awaitingLeaser: boolean
  canRefuse: boolean
  offer: { id: string; leaserName: string } | null
  leaserPreview: Preview | null
}

const input = 'ev-input'

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null
  return (
    <p className={state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}>
      {state.message}
    </p>
  )
}

function Button({ pending, children, tone = 'dark' }: { pending: boolean; children: React.ReactNode; tone?: 'dark' | 'light' | 'danger' }) {
  const variant = tone === 'dark'
    ? 'ev-btn--primary'
    : tone === 'danger'
      ? 'ev-btn--danger'
      : 'ev-btn--ghost'
  return (
    <button type="submit" disabled={pending} className={`ev-btn ${variant} ev-btn--sm`}>
      {pending ? 'En cours…' : children}
    </button>
  )
}

export default function RequestActions({ requestId, canValidate, awaitingLeaser, canRefuse, offer, leaserPreview }: Props) {
  const [validateState, validate, validating] = useActionState(validateOfferAction, null)
  const [decisionState, decide, deciding] = useActionState(leaserDecisionAction, null)
  const [refuseState, refuse, refusing] = useActionState(refuseRequestAction, null)
  const [showRefuse, setShowRefuse] = useState(false)

  if (!canValidate && !awaitingLeaser && !canRefuse) {
    return <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Aucune action possible sur ce dossier.</p>
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {canValidate && offer && (
        <form action={validate} className="space-y-3">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="offerId" value={offer.id} />
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Valider et transmettre à {offer.leaserName}</p>
          {leaserPreview && 'error' in leaserPreview ? (
            <p className="ev-alert ev-alert--danger">{leaserPreview.error}</p>
          ) : leaserPreview ? (
            <details className="rounded-md border" style={{ borderColor: 'var(--line)' }}>
              <summary className="px-3 py-2 text-xs cursor-pointer" style={{ color: 'var(--ink-3)' }}>
                Aperçu de l&apos;email : {leaserPreview.to}{leaserPreview.cc ? ` (copie ${leaserPreview.cc})` : ''}
              </summary>
              <p className="px-3 pt-1 text-xs" style={{ color: 'var(--ink)' }}>{leaserPreview.subject}</p>
              <iframe srcDoc={leaserPreview.html} sandbox="" title="Aperçu de l'email au leaser" className="w-full" style={{ height: 380 }} />
            </details>
          ) : null}
          <textarea name="note" rows={3} placeholder="Mot pour le leaser (facultatif, ajouté à l'email)" className={input} />
          <div className="flex items-center gap-3">
            <Button pending={validating}>Valider et transmettre</Button>
          </div>
          <Feedback state={validateState} />
        </form>
      )}

      {awaitingLeaser && offer && (
        <form action={decide} className="space-y-3">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="offerId" value={offer.id} />
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Réponse de {offer.leaserName}</p>
          <textarea name="reason" rows={2} placeholder="Motif du refus (interne, obligatoire si refusé)" className={input} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit" name="decision" value="confirmed" disabled={deciding}
              className="ev-btn ev-btn--primary ev-btn--sm"
            >
              {deciding ? 'En cours…' : 'Accepté par le leaser'}
            </button>
            <button
              type="submit" name="decision" value="refused" disabled={deciding}
              className="ev-btn ev-btn--danger ev-btn--sm"
            >
              Refusé par le leaser
            </button>
          </div>
          <Feedback state={decisionState} />
        </form>
      )}

      {canRefuse && (
        <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--line)' }}>
          {!showRefuse ? (
            <button type="button" onClick={() => setShowRefuse(true)} className="text-sm hover:opacity-70" style={{ color: 'var(--danger)' }}>
              Refuser le dossier…
            </button>
          ) : (
            <form
              action={refuse}
              onSubmit={e => { if (!window.confirm('Refuser définitivement ce dossier ?')) e.preventDefault() }}
              className="space-y-3"
            >
              <input type="hidden" name="requestId" value={requestId} />
              <textarea name="reason" rows={2} required placeholder="Motif du refus (interne)" className={input} />
              <textarea name="clientMessage" rows={3} placeholder="Message au client (facultatif : sans message, aucun email n'est envoyé)" className={input} />
              <div className="flex items-center gap-2">
                <Button pending={refusing} tone="danger">Refuser le dossier</Button>
                <button type="button" onClick={() => setShowRefuse(false)} className="ev-btn ev-btn--ghost ev-btn--sm">Annuler</button>
              </div>
            </form>
          )}
          <Feedback state={refuseState} />
        </div>
      )}
    </div>
  )
}
