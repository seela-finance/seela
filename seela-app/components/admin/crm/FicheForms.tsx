'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  addActivityAction, addContactAction, addTaskAction, completeTaskAction, updateCompanyAction, type FicheState,
} from '@/app/admin/crm/fiche-actions'
import { LIFECYCLE_LABEL, LIFECYCLE_STAGES, SECTORS } from '@/lib/crm-companies'
import { ACTIVITY_LABEL, ACTIVITY_TYPES, CALL_OUTCOMES, OUTCOME_LABEL, PERSONAS, PRIORITIES, PRIORITY_LABEL, type ActivityType } from '@/lib/crm-activities'

type Member = { id: string; name: string }
type ContactOption = { id: string; label: string }

function Message({ state }: { state: FicheState }) {
  if (!state) return null
  return <p className={`ev-alert ${state.ok ? 'ev-alert--ok' : 'ev-alert--danger'}`}>{state.message}</p>
}

/** Formulaire qui se vide après un enregistrement réussi. */
function useResetOnSuccess(state: FicheState) {
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) ref.current?.reset() }, [state])
  return ref
}

// ─── Propriétés ──────────────────────────────────────────────────────────────

export type CompanyValues = {
  name: string; siren: string; domain: string; sector: string; lifecycle_stage: string; legal_form: string; naf_code: string
  creation_year: string; headcount_bracket: string; source: string; signal: string; website: string; owner_id: string
}

export function PropertiesForm({ companyId, values, team }: { companyId: string; values: CompanyValues; team: Member[] }) {
  const [editing, setEditing] = useState(false)
  const [state, submit, pending] = useActionState<FicheState, FormData>(async (prev, form) => {
    const next = await updateCompanyAction(prev, form)
    if (next?.ok) setEditing(false)
    return next
  }, null)

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <Message state={state} />
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm self-start" onClick={() => setEditing(true)}>Modifier les propriétés</button>
      </div>
    )
  }

  const text = (name: keyof CompanyValues, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={`p-${name}`} className="ev-label">{label}</label>
      <input id={`p-${name}`} name={name} defaultValue={values[name]} className="ev-input" {...extra} />
    </div>
  )

  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="companyId" value={companyId} />
      {text('name', 'Nom', { required: true })}
      <div className="grid grid-cols-2 gap-2">
        {text('siren', 'SIREN', { inputMode: 'numeric' })}
        {text('domain', 'Domaine')}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="p-stage" className="ev-label">Statut</label>
          <select id="p-stage" name="lifecycle_stage" defaultValue={values.lifecycle_stage} className="ev-input">
            {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{LIFECYCLE_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="p-owner" className="ev-label">Propriétaire</label>
          <select id="p-owner" name="owner_id" defaultValue={values.owner_id} className="ev-input">
            <option value="">—</option>
            {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="p-sector" className="ev-label">Secteur</label>
        <select id="p-sector" name="sector" defaultValue={values.sector} className="ev-input">
          <option value="">—</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {text('legal_form', 'Forme juridique')}
        {text('naf_code', 'Code NAF')}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {text('creation_year', 'Année de création', { inputMode: 'numeric' })}
        {text('headcount_bracket', 'Effectif')}
      </div>
      {text('source', 'Source')}
      {text('signal', 'Signal')}
      {text('website', 'Site web')}
      <Message state={state} />
      <div className="flex gap-2">
        <button type="submit" className="ev-btn ev-btn--primary ev-btn--sm" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setEditing(false)}>Annuler</button>
      </div>
    </form>
  )
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export function AddContactForm({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false)
  const [state, submit, pending] = useActionState<FicheState, FormData>(addContactAction, null)
  const ref = useResetOnSuccess(state)

  if (!open) return <button type="button" className="text-sm" style={{ color: 'var(--accent)' }} onClick={() => setOpen(true)}>+ Ajouter</button>

  return (
    <form ref={ref} action={submit} className="flex flex-col gap-2 mt-2 w-full">
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid grid-cols-2 gap-2">
        <input name="first_name" placeholder="Prénom" aria-label="Prénom" className="ev-input" />
        <input name="last_name" placeholder="Nom" aria-label="Nom" className="ev-input" />
      </div>
      <input name="email" type="email" placeholder="Email" aria-label="Email" className="ev-input" />
      <input name="phone" placeholder="Téléphone" aria-label="Téléphone" className="ev-input" />
      <div className="grid grid-cols-2 gap-2">
        <input name="job_title" placeholder="Poste" aria-label="Poste" className="ev-input" />
        <select name="persona" aria-label="Persona" className="ev-input" defaultValue="">
          <option value="">Persona</option>
          {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <Message state={state} />
      <div className="flex gap-2">
        <button type="submit" className="ev-btn ev-btn--primary ev-btn--sm" disabled={pending}>{pending ? 'Ajout…' : 'Ajouter le contact'}</button>
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setOpen(false)}>Fermer</button>
      </div>
    </form>
  )
}

// ─── Activité ────────────────────────────────────────────────────────────────

export function ActivityComposer({ companyId, contacts, team }: { companyId: string; contacts: ContactOption[]; team: Member[] }) {
  const [type, setType] = useState<ActivityType>('note')
  const [state, submit, pending] = useActionState<FicheState, FormData>(addActivityAction, null)
  const ref = useResetOnSuccess(state)

  return (
    <form ref={ref} action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Type d’activité">
        {ACTIVITY_TYPES.map(t => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`ev-btn ev-btn--sm ${type === t ? 'ev-btn--ink' : 'ev-btn--ghost'}`}
          >
            {ACTIVITY_LABEL[t]}
          </button>
        ))}
      </div>
      {type === 'call' && (
        <div className="flex flex-wrap gap-3 text-sm" role="radiogroup" aria-label="Issue de l’appel">
          {CALL_OUTCOMES.map(o => (
            <label key={o} className="flex items-center gap-1.5">
              <input type="radio" name="call_outcome" value={o} style={{ accentColor: 'var(--accent)' }} /> {OUTCOME_LABEL[o]}
            </label>
          ))}
        </div>
      )}
      <textarea name="body" className="ev-input" placeholder={type === 'call' ? 'Compte rendu (facultatif)' : 'Écrivez une note, collez un transcript…'} aria-label="Contenu" />
      <div className="flex flex-wrap gap-3 items-center text-sm">
        {contacts.length > 0 && (
          <select name="contact_id" aria-label="Contact concerné" className="ev-input" style={{ width: 'auto' }} defaultValue="">
            <option value="">Contact concerné…</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}
        {team.length > 0 && (
          <span className="flex flex-wrap gap-3 items-center" style={{ color: 'var(--ink-2)' }}>
            Mentionner :
            {team.map(m => (
              <label key={m.id} className="flex items-center gap-1">
                <input type="checkbox" name="mentions" value={m.id} style={{ accentColor: 'var(--accent)' }} /> @{m.name}
              </label>
            ))}
          </span>
        )}
      </div>
      <Message state={state} />
      <button type="submit" className="ev-btn ev-btn--primary ev-btn--sm self-start" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>
    </form>
  )
}

// ─── Tâches ──────────────────────────────────────────────────────────────────

export function AddTaskForm({ companyId, team, today }: { companyId: string; team: Member[]; today: string }) {
  const [state, submit, pending] = useActionState<FicheState, FormData>(addTaskAction, null)
  const ref = useResetOnSuccess(state)
  return (
    <form ref={ref} action={submit} className="flex flex-wrap gap-2 items-center mt-3">
      <input type="hidden" name="companyId" value={companyId} />
      <input name="title" placeholder="Nouvelle tâche…" aria-label="Intitulé de la tâche" className="ev-input" style={{ flex: '2 1 200px' }} />
      <input name="due_date" type="date" defaultValue={today} aria-label="Échéance" className="ev-input" style={{ width: 160 }} />
      <select name="priority" aria-label="Priorité" defaultValue="normale" className="ev-input" style={{ width: 120 }}>
        {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
      </select>
      <select name="assignee_id" aria-label="Assignée à" defaultValue="" className="ev-input" style={{ width: 140 }}>
        <option value="">Moi</option>
        {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm" disabled={pending}>{pending ? 'Ajout…' : 'Ajouter'}</button>
      {state && !state.ok && <p className="ev-alert ev-alert--danger w-full">{state.message}</p>}
    </form>
  )
}

export function CompleteTaskButton({ companyId, taskId }: { companyId: string; taskId: string }) {
  const [, submit, pending] = useActionState<FicheState, FormData>(completeTaskAction, null)
  return (
    <form action={submit}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="taskId" value={taskId} />
      <button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm" disabled={pending}>{pending ? '…' : 'Fait'}</button>
    </form>
  )
}
