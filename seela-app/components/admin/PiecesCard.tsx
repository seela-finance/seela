'use client'

import { useActionState, useState } from 'react'
import { dispensePieceAction, reviewPieceAction, type PieceReviewState } from '@/app/admin/pieces-actions'
import { PIECE_STATUS_LABEL, type ChecklistRow } from '@/lib/pieces'

export type PieceView = ChecklistRow & { previewUrl: string | null; uploadedAt: string | null }

const TAG: Record<ChecklistRow['status'], string> = {
  a_deposer: 'ev-tag ev-tag--warning',
  en_verification: 'ev-tag ev-tag--accent',
  validee: 'ev-tag ev-tag--ok',
  refusee: 'ev-tag ev-tag--danger',
  dispensee: 'ev-tag',
}

function Feedback({ state }: { state: PieceReviewState }) {
  if (!state) return null
  return <p role="status" className={`mt-2 ${state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}`}>{state.message}</p>
}

/** Décision sur une pièce déposée : valider, ou refuser avec un motif envoyé au client. */
function ReviewForm({ row, companyId }: { row: PieceView; companyId: string }) {
  const [refusing, setRefusing] = useState(false)
  // Décision enregistrée : le champ de motif se referme, le message reste
  const [state, submit, pending] = useActionState<PieceReviewState, FormData>(async (prev, form) => {
    const result = await reviewPieceAction(prev, form)
    if (result?.ok) setRefusing(false)
    return result
  }, null)
  if (!row.doc) return null
  return (
    <form action={submit} className="mt-2">
      <input type="hidden" name="pieceId" value={row.doc.id} />
      <input type="hidden" name="companyId" value={companyId} />
      {refusing && (
        <textarea name="note" rows={2} required placeholder="Motif pour le client (illisible, périmée, mauvais document…)" className="ev-input mb-2" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {row.status !== 'validee' && (
          <button type="submit" name="decision" value="validee" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">Valider</button>
        )}
        {!refusing ? (
          row.status !== 'refusee' && <button type="button" onClick={() => setRefusing(true)} className="ev-btn ev-btn--ghost ev-btn--sm">Refuser</button>
        ) : (
          <>
            <button type="submit" name="decision" value="refusee" disabled={pending} className="ev-btn ev-btn--danger ev-btn--sm">Confirmer le refus</button>
            <button type="button" onClick={() => setRefusing(false)} className="text-xs underline" style={{ color: 'var(--ink-3)' }}>Annuler</button>
          </>
        )}
      </div>
      <Feedback state={state} />
    </form>
  )
}

/** Dispense d'une pièce non déposée (motif interne). */
function DispenseForm({ row, companyId }: { row: PieceView; companyId: string }) {
  const [state, submit, pending] = useActionState<PieceReviewState, FormData>(dispensePieceAction, null)
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <div className="mt-2">
        <button type="button" onClick={() => setOpen(true)} className="text-xs underline" style={{ color: 'var(--ink-3)' }}>Dispenser cette pièce</button>
        <Feedback state={state} />
      </div>
    )
  }
  return (
    <form action={submit} className="mt-2">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="kind" value={row.kind} />
      <textarea name="note" rows={2} required placeholder="Motif interne (ex. : le financeur a déjà les comptes)" className="ev-input mb-2" />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="ev-btn ev-btn--ghost ev-btn--sm">Enregistrer la dispense</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs underline" style={{ color: 'var(--ink-3)' }}>Annuler</button>
      </div>
      <Feedback state={state} />
    </form>
  )
}

/** Pièces d'une société dans le back-office : état, aperçu (lien temporaire), décision. */
export default function PiecesCard({ companyId, rows, canEdit, title }: { companyId: string; rows: PieceView[]; canEdit: boolean; title?: string }) {
  if (rows.length === 0) return null
  return (
    <div>
      {title && <p className="ev-kicker px-4 pt-3">{title}</p>}
      <ul className="divide-y divide-[var(--line)]">
        {rows.map(row => (
          <li key={row.kind} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{row.label}</p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  {row.previewUrl ? (
                    <a href={row.previewUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--ink-2)' }}>{row.doc?.file_name ?? 'Ouvrir le fichier'}</a>
                  ) : row.doc?.file_name ?? row.hint}
                  {row.uploadedAt && ` · déposée le ${new Date(row.uploadedAt).toLocaleDateString('fr-FR')}`}
                </p>
                {row.doc?.review_note && row.status !== 'en_verification' && (
                  <p className="text-xs mt-0.5" style={{ color: row.status === 'refusee' ? 'var(--danger)' : 'var(--ink-3)' }}>Motif : {row.doc.review_note}</p>
                )}
              </div>
              <span className={`${TAG[row.status]} shrink-0`}><span className="ev-tag__dot" />{PIECE_STATUS_LABEL[row.status]}</span>
            </div>
            {canEdit && row.doc && row.status !== 'dispensee' && <ReviewForm row={row} companyId={companyId} />}
            {canEdit && row.status === 'a_deposer' && <DispenseForm row={row} companyId={companyId} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
