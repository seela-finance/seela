'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createCompanyAction, type CrmActionState } from '@/app/admin/crm/actions'
import { LIFECYCLE_LABEL, LIFECYCLE_STAGES, SECTORS } from '@/lib/crm-companies'

export default function NewCompanyForm() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [state, submit, pending] = useActionState<CrmActionState, FormData>(createCompanyAction, null)

  const v = state?.values

  useEffect(() => {
    if (state?.ok && state.id) router.push(`/admin/crm/societes/${state.id}`)
  }, [state, router])

  if (!open) {
    return <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={() => setOpen(true)}>Nouvelle société</button>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
      <div className="ev-scrim" onClick={() => setOpen(false)} />
      <form action={submit} className="ev-modal relative w-full max-w-md p-6 flex flex-col gap-4">
        <h2 className="ev-display text-xl">Nouvelle société</h2>
        <div>
          <label htmlFor="crm-name" className="ev-label">Nom</label>
          <input id="crm-name" name="name" required className="ev-input" autoFocus defaultValue={v?.name} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="crm-siren" className="ev-label">SIREN <span style={{ color: 'var(--ink-3)' }}>(facultatif)</span></label>
            <input id="crm-siren" name="siren" inputMode="numeric" className="ev-input ev-mono" placeholder="123 456 789" defaultValue={v?.siren} />
          </div>
          <div>
            <label htmlFor="crm-domain" className="ev-label">Domaine <span style={{ color: 'var(--ink-3)' }}>(facultatif)</span></label>
            <input id="crm-domain" name="domain" className="ev-input" placeholder="societe.fr" defaultValue={v?.domain} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="crm-sector" className="ev-label">Secteur</label>
            <select id="crm-sector" name="sector" className="ev-input" defaultValue={v?.sector ?? ''}>
              <option value="">—</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="crm-stage" className="ev-label">Statut</label>
            <select id="crm-stage" name="stage" className="ev-input" defaultValue={v?.stage || 'prospect'}>
              {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{LIFECYCLE_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        {state && !state.ok && (
          <div className={state.confirmDomain ? 'ev-alert ev-alert--warning' : 'ev-alert ev-alert--danger'}>
            {state.message}
            {state.id && <> <Link href={`/admin/crm/societes/${state.id}`} className="underline">Voir la fiche</Link></>}
            {state.confirmDomain && (
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" name="confirmDomain" /> C’est une autre société, la créer quand même
              </label>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="ev-btn ev-btn--ghost" onClick={() => setOpen(false)}>Annuler</button>
          <button type="submit" className="ev-btn ev-btn--primary" disabled={pending}>{pending ? 'Création…' : 'Créer'}</button>
        </div>
      </form>
    </div>
  )
}
