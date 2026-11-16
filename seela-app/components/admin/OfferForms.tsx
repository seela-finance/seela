'use client'

import { useActionState, useState } from 'react'
import { addManualOfferAction, counterOfferAction, type ActionState } from '@/app/admin/dossiers/[id]/actions'

const DURATIONS = [12, 24, 36, 48, 60, 72, 84]

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null
  return <p role="status" className={state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}>{state.message}</p>
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="ev-label">{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1" style={{ color: 'var(--ink-3)' }}>{hint}</span>}
    </label>
  )
}

function DurationSelect({ defaultValue }: { defaultValue: number }) {
  return (
    <select name="durationMonths" defaultValue={defaultValue} className="ev-input">
      {DURATIONS.map(d => <option key={d} value={d}>{d} mois</option>)}
    </select>
  )
}

/** Offre hors matching : leaser de la liste ou nom libre. Le client est prévenu par email. */
export function AddOfferForm({ requestId, leaserNames, defaultDuration }: { requestId: string; leaserNames: string[]; defaultDuration: number }) {
  const [state, submit, pending] = useActionState(addManualOfferAction, null)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="px-4 py-4">
        {state?.ok && <div className="mb-3"><Feedback state={state} /></div>}
        <button type="button" onClick={() => setOpen(true)} className="ev-btn ev-btn--ghost ev-btn--sm">Ajouter une offre</button>
      </div>
    )
  }

  return (
    <form
      action={async form => { await submit(form) }}
      onSubmit={e => { if (!window.confirm('Ajouter cette offre ? Le client la verra et recevra un email.')) e.preventDefault() }}
      className="px-4 py-4 space-y-4"
    >
      <input type="hidden" name="requestId" value={requestId} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Financeur" hint="Choisissez dans la liste ou saisissez un nom.">
          <input name="leaserName" list="admin-leasers" required maxLength={120} className="ev-input" />
          <datalist id="admin-leasers">
            {leaserNames.map(n => <option key={n} value={n} />)}
          </datalist>
        </Field>
        <Field label="Loyer HT (€)">
          <input name="monthlyPayment" inputMode="decimal" required className="ev-input" placeholder="410" />
        </Field>
        <Field label="Durée">
          <DurationSelect defaultValue={defaultDuration} />
        </Field>
        <Field label="Périodicité">
          <select name="periodicite" defaultValue="mensuelle" className="ev-input">
            <option value="mensuelle">Mensuelle</option>
            <option value="trimestrielle">Trimestrielle</option>
            <option value="annuelle">Annuelle</option>
          </select>
        </Field>
        <Field label="Taux nominal (%)" hint="Facultatif.">
          <input name="rate" inputMode="decimal" className="ev-input" />
        </Field>
        <Field label="Frais de dossier (€)" hint="Facultatif.">
          <input name="fraisDossier" inputMode="decimal" className="ev-input" />
        </Field>
        <Field label="Dépôt de garantie (€)" hint="Facultatif.">
          <input name="depotGarantie" inputMode="decimal" className="ev-input" />
        </Field>
      </div>
      <Field label="Conditions particulières" hint="Visibles par le client sur l’offre.">
        <textarea name="conditions" rows={2} maxLength={2000} className="ev-input" />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">{pending ? 'En cours…' : 'Ajouter l’offre'}</button>
        <button type="button" onClick={() => setOpen(false)} className="ev-btn ev-btn--ghost ev-btn--sm">Annuler</button>
      </div>
      {state && !state.ok && <Feedback state={state} />}
    </form>
  )
}

export type CounterOfferTarget = { id: string; label: string; durationMonths: number | null }

/** Nouvelles conditions sur une offre existante ; l'ancien loyer reste affiché barré au client. */
export function CounterOfferForm({ requestId, offers }: { requestId: string; offers: CounterOfferTarget[] }) {
  const [state, submit, pending] = useActionState(counterOfferAction, null)
  const [open, setOpen] = useState(false)
  const [offerId, setOfferId] = useState(offers[0]?.id ?? '')
  const target = offers.find(o => o.id === offerId) ?? offers[0]

  if (!open) {
    return (
      <div className="px-4 py-4">
        {state?.ok && <div className="mb-3"><Feedback state={state} /></div>}
        <button type="button" onClick={() => setOpen(true)} className="ev-btn ev-btn--ghost ev-btn--sm">Contre-proposition</button>
      </div>
    )
  }

  return (
    <form
      action={async form => { await submit(form) }}
      onSubmit={e => { if (!window.confirm('Envoyer cette contre-proposition au client ? Il recevra un email.')) e.preventDefault() }}
      className="px-4 py-4 space-y-4"
    >
      <input type="hidden" name="requestId" value={requestId} />
      <Field label="Offre concernée">
        <select name="offerId" value={offerId} onChange={e => setOfferId(e.target.value)} className="ev-input">
          {offers.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Nouveau loyer HT (€)">
          <input name="monthlyPayment" inputMode="decimal" required className="ev-input" />
        </Field>
        <Field label="Durée">
          <DurationSelect key={target?.id} defaultValue={target?.durationMonths ?? 36} />
        </Field>
        <Field label="Taux nominal (%)" hint="Facultatif.">
          <input name="rate" inputMode="decimal" className="ev-input" />
        </Field>
      </div>
      <Field label="Conditions particulières" hint="Remplacent celles de l’offre.">
        <textarea name="conditions" rows={2} maxLength={2000} className="ev-input" />
      </Field>
      <Field label="Message au client" hint="Affiché sur son espace et dans l’email.">
        <textarea name="clientMessage" rows={3} maxLength={2000} className="ev-input" />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">{pending ? 'En cours…' : 'Envoyer la contre-proposition'}</button>
        <button type="button" onClick={() => setOpen(false)} className="ev-btn ev-btn--ghost ev-btn--sm">Annuler</button>
      </div>
      {state && !state.ok && <Feedback state={state} />}
    </form>
  )
}
