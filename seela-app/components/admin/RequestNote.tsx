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
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#9A9A93]"
        style={{ background: '#fff', borderColor: '#E5E5E3', color: '#0E0E0C' }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: '#fff', color: '#0E0E0C', border: '1px solid #E5E5E3' }}
        >
          {saving ? 'En cours…' : 'Ajouter la note'}
        </button>
        {state && (
          <p role="status" className="text-sm" style={{ color: state.ok ? '#166534' : '#991B1B' }}>{state.message}</p>
        )}
      </div>
    </form>
  )
}
