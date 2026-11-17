'use client'

import { useActionState, useRef, useState } from 'react'
import { addActivityAction, type FicheState } from '@/app/admin/crm/fiche-actions'
import { CALL_OUTCOMES, OUTCOME_LABEL } from '@/lib/crm-activities'
import { formatPhone, toE164 } from '@/lib/phone'

/**
 * Lien d'appel (tel:) : le Mac ouvre l'app d'appel par défaut (iPhone via FaceTime, ou le logiciel de téléphonie).
 * Au même moment, la fenêtre de compte rendu s'ouvre : issue de l'appel et notes, enregistrées sur la fiche.
 */
export default function CallButton({ phone, companyId, contactId, contactName, compact }: {
  phone: string | null; companyId: string | null; contactId: string; contactName: string; compact?: boolean
}) {
  const e164 = toE164(phone)
  const [open, setOpen] = useState(false)
  const startedAt = useRef<number>(0)
  const [state, submit, pending] = useActionState<FicheState, FormData>(async (prev, form) => {
    const next = await addActivityAction(prev, form)
    if (next?.ok) setOpen(false)
    return next
  }, null)

  if (!e164) return phone ? <span style={{ color: 'var(--ink-3)' }}>{phone}</span> : null

  const minutes = () => Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000))

  return (
    <>
      <a
        href={`tel:${e164}`}
        onClick={() => { startedAt.current = Date.now(); if (companyId) setTimeout(() => setOpen(true), 400) }}
        className={compact ? 'ev-mono hover:underline' : 'ev-btn ev-btn--ghost ev-btn--sm'}
        style={compact ? { color: 'var(--accent)' } : undefined}
        title={`Appeler ${contactName}`}
      >
        {compact ? formatPhone(e164) : `Appeler · ${formatPhone(e164)}`}
      </a>
      {open && companyId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
          <div className="ev-scrim" onClick={() => setOpen(false)} />
          <form
            action={form => { form.set('body', `${String(form.get('notes') ?? '').trim()}${form.get('duration') === 'on' ? `\n(Durée : environ ${minutes()} min)` : ''}`.trim()); submit(form) }}
            className="ev-modal relative w-full max-w-md p-6 flex flex-col gap-3"
          >
            <h2 className="ev-display text-xl">Appel avec {contactName}</h2>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="type" value="call" />
            <input type="hidden" name="contact_id" value={contactId} />
            <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <legend className="ev-label mb-1">Issue de l’appel</legend>
              {CALL_OUTCOMES.map(o => (
                <label key={o} className="flex items-center gap-1.5">
                  <input type="radio" name="call_outcome" value={o} required style={{ accentColor: 'var(--accent)' }} /> {OUTCOME_LABEL[o]}
                </label>
              ))}
            </fieldset>
            <textarea name="notes" className="ev-input" placeholder="Compte rendu (facultatif)" aria-label="Compte rendu" />
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
              <input type="checkbox" name="duration" defaultChecked style={{ accentColor: 'var(--accent)' }} /> Noter la durée (depuis le clic sur Appeler)
            </label>
            {state && !state.ok && <p className="ev-alert ev-alert--danger">{state.message}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="ev-btn ev-btn--ghost" onClick={() => setOpen(false)}>Plus tard</button>
              <button type="submit" className="ev-btn ev-btn--primary" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer l’appel'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
