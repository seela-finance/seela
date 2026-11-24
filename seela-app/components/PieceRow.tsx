'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ALLOWED_MIME_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/documents'
import { PIECE_STATUS_LABEL, type ChecklistRow } from '@/lib/pieces'
import { markFinancialDocsUploaded } from '@/app/app/onboarding/actions'
import { registerPieceAction, removePieceAction } from '@/app/app/compte/actions'

const TAG: Record<ChecklistRow['status'], string> = {
  a_deposer: 'ev-tag',
  en_verification: 'ev-tag ev-tag--accent',
  validee: 'ev-tag ev-tag--ok',
  refusee: 'ev-tag ev-tag--danger',
  dispensee: 'ev-tag',
}

/** Une pièce : son état, le dépôt (bucket privé, dossier du client) et le retrait tant qu'elle n'est pas validée. */
export default function PieceRow({ row, userId }: { row: ChecklistRow; userId: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canUpload = row.status === 'a_deposer' || row.status === 'refusee'
  const canRemove = row.doc && (row.status === 'en_verification' || row.status === 'refusee')

  async function upload(file: File) {
    setError(null)
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) { setError('Format non supporté : PDF, JPG ou PNG.'); return }
    if (file.size > MAX_DOCUMENT_BYTES) { setError('Fichier trop volumineux (20 Mo max).'); return }
    setBusy(true)
    try {
      const supabase = createClient()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
      const path = `${userId}/pieces/${row.kind}-${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { contentType: file.type })
      if (upErr) throw new Error('Envoi impossible, réessayez.')
      const res = await registerPieceAction({ kind: row.kind, path, fileName: file.name, mimeType: file.type, size: file.size })
      if (!res.ok) throw new Error(res.message)
      // Liasse : même chaîne qu'à l'onboarding, le score se met à jour (sans bloquer si ça échoue)
      if (row.kind === 'liasse') {
        try {
          const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
          const analyzed = await fetch('/api/analyze-bilan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentUrl: publicUrl, mimeType: file.type }) })
          if (analyzed.ok) {
            const bilan = await analyzed.json()
            await fetch('/api/score-seela', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bilan) })
          }
          await markFinancialDocsUploaded()
        } catch {
          // Le dépôt est fait : le score sera recalculé plus tard
        }
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible, réessayez.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove() {
    if (!row.doc || !window.confirm('Retirer cette pièce ?')) return
    setBusy(true)
    const res = await removePieceAction(row.doc.id)
    setBusy(false)
    if (!res.ok) { setError(res.message); return }
    router.refresh()
  }

  return (
    <li className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{row.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{row.hint}</p>
        {row.doc?.file_name && row.status !== 'dispensee' && (
          <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-2)' }}>{row.doc.file_name}</p>
        )}
        {row.status === 'refusee' && row.doc?.review_note && (
          <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Motif : {row.doc.review_note}</p>
        )}
        {error && <p role="alert" className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
      <span className={`${TAG[row.status]} shrink-0`}><span className="ev-tag__dot" />{PIECE_STATUS_LABEL[row.status]}</span>
      <div className="flex items-center gap-2 shrink-0">
        {canUpload && (
          <>
            <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" aria-label={`Déposer : ${row.label}`} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="ev-btn ev-btn--primary ev-btn--sm">
              {busy ? 'Envoi…' : row.status === 'refusee' ? 'Redéposer' : 'Déposer'}
            </button>
          </>
        )}
        {canRemove && (
          <button type="button" disabled={busy} onClick={remove} className="text-xs font-medium underline" style={{ color: 'var(--ink-2)' }}>Retirer</button>
        )}
      </div>
    </li>
  )
}
