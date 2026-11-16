'use client'

import { useActionState } from 'react'
import { addNoteAction } from '@/app/admin/dossiers/[id]/actions'

// Note interne : s'ajoute à l'historique du dossier, jamais visible par le client.
export default function RequestNote({ requestId }: { requestId: string }) {
  const [state, save, saving] = useActionState(addNoteAction, null)

  return (
    <form action={save} className="px-4 pb-4 space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <textarea
        name="note"
        rows={2}
        required
        maxLength={2000}
        aria-label="Note interne"
        placeholder="Note interne (jamais visible par le client)"
        className="ev-input"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="ev-btn ev-btn--ghost ev-btn--sm"
        >
          {saving ? 'En cours…' : 'Ajouter la note'}
        </button>
        {state && (
          <p role="status" className="text-sm" style={{ color: state.ok ? 'var(--ok)' : 'var(--danger)' }}>{state.message}</p>
        )}
      </div>
    </form>
  )
}
