'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  connectMailboxAction, createContactAction, createDealAction, disconnectMailboxAction, moveDealAction, syncLemlistAction, syncMailboxAction,
  updateContactAction, type CrmFormState,
} from '@/app/admin/crm/crm-actions'
import { PERSONAS } from '@/lib/crm-activities'
import { DEAL_STAGES, DEAL_STAGE_LABEL, type DealStage } from '@/lib/crm-deals'

type Option = { id: string; name: string }

function Alert({ state }: { state: CrmFormState }) {
  if (!state) return null
  return <p className={`ev-alert ${state.ok ? 'ev-alert--ok' : 'ev-alert--danger'}`}>{state.message}</p>
}

function Modal({ title, onClose, children, action }: { title: string; onClose: () => void; children: React.ReactNode; action: (f: FormData) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      <div className="ev-scrim" onClick={onClose} />
      <form action={action} className="ev-modal relative w-full max-w-md p-6 flex flex-col gap-3">
        <h2 className="ev-display text-xl">{title}</h2>
        {children}
      </form>
    </div>
  )
}

const label = (id: string, text: string) => <label htmlFor={id} className="ev-label">{text}</label>

// ─── Nouveau contact (depuis la liste) ───────────────────────────────────────

export function NewContactButton({ companies }: { companies: Option[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [state, submit, pending] = useActionState<CrmFormState, FormData>(createContactAction, null)
  useEffect(() => { if (state?.ok && state.id) router.push(`/admin/crm/contacts/${state.id}`) }, [state, router])

  if (!open) return <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={() => setOpen(true)}>Nouveau contact</button>
  return (
    <Modal title="Nouveau contact" onClose={() => setOpen(false)} action={submit}>
      <div className="grid grid-cols-2 gap-2">
        <div>{label('nc-first', 'Prénom')}<input id="nc-first" name="first_name" className="ev-input" autoFocus /></div>
        <div>{label('nc-last', 'Nom')}<input id="nc-last" name="last_name" className="ev-input" /></div>
      </div>
      <div>{label('nc-email', 'Email')}<input id="nc-email" name="email" type="email" className="ev-input" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div>{label('nc-phone', 'Téléphone')}<input id="nc-phone" name="phone" className="ev-input" /></div>
        <div>{label('nc-job', 'Poste')}<input id="nc-job" name="job_title" className="ev-input" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          {label('nc-company', 'Société')}
          <select id="nc-company" name="company_id" className="ev-input" defaultValue="">
            <option value="">—</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          {label('nc-persona', 'Persona')}
          <select id="nc-persona" name="persona" className="ev-input" defaultValue="">
            <option value="">—</option>
            {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <Alert state={state && !state.ok ? state : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="ev-btn ev-btn--ghost" onClick={() => setOpen(false)}>Annuler</button>
        <button type="submit" className="ev-btn ev-btn--primary" disabled={pending}>{pending ? 'Création…' : 'Créer'}</button>
      </div>
    </Modal>
  )
}

// ─── Propriétés d'un contact ─────────────────────────────────────────────────

export type ContactValues = {
  first_name: string; last_name: string; email: string; phone: string; job_title: string; persona: string
  linkedin_url: string; company_id: string; owner_id: string
}

export function ContactPropertiesForm({ contactId, values, companies, team, emailLocked }: {
  contactId: string; values: ContactValues; companies: Option[]; team: Option[]; emailLocked: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [state, submit, pending] = useActionState<CrmFormState, FormData>(async (prev, form) => {
    const next = await updateContactAction(prev, form)
    if (next?.ok) setEditing(false)
    return next
  }, null)

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <Alert state={state} />
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm self-start" onClick={() => setEditing(true)}>Modifier les propriétés</button>
      </div>
    )
  }
  const text = (name: keyof ContactValues, text: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>{label(`c-${name}`, text)}<input id={`c-${name}`} name={name} defaultValue={values[name]} className="ev-input" {...extra} /></div>
  )
  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="contactId" value={contactId} />
      <div className="grid grid-cols-2 gap-2">{text('first_name', 'Prénom')}{text('last_name', 'Nom')}</div>
      {text('email', emailLocked ? 'Email (identifiant de connexion)' : 'Email', { type: 'email', readOnly: emailLocked })}
      <div className="grid grid-cols-2 gap-2">{text('phone', 'Téléphone')}{text('job_title', 'Poste')}</div>
      {text('linkedin_url', 'LinkedIn')}
      <div className="grid grid-cols-2 gap-2">
        <div>
          {label('c-persona', 'Persona')}
          <select id="c-persona" name="persona" defaultValue={values.persona} className="ev-input">
            <option value="">—</option>
            {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          {label('c-owner', 'Propriétaire')}
          <select id="c-owner" name="owner_id" defaultValue={values.owner_id} className="ev-input">
            <option value="">—</option>
            {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        {label('c-company', 'Société')}
        <select id="c-company" name="company_id" defaultValue={values.company_id} className="ev-input">
          <option value="">—</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Alert state={state} />
      <div className="flex gap-2">
        <button type="submit" className="ev-btn ev-btn--primary ev-btn--sm" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setEditing(false)}>Annuler</button>
      </div>
    </form>
  )
}

// ─── Deals ───────────────────────────────────────────────────────────────────

export function NewDealButton({ companies, team, fixedCompany, small }: { companies: Option[]; team: Option[]; fixedCompany?: Option; small?: boolean }) {
  const [open, setOpen] = useState(false)
  const [state, submit, pending] = useActionState<CrmFormState, FormData>(async (prev, form) => {
    const next = await createDealAction(prev, form)
    if (next?.ok) setOpen(false)
    return next
  }, null)

  if (!open) {
    return small
      ? <button type="button" className="text-sm" style={{ color: 'var(--accent)' }} onClick={() => setOpen(true)}>+ Créer</button>
      : <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={() => setOpen(true)}>Nouveau deal</button>
  }
  return (
    <Modal title="Nouveau deal" onClose={() => setOpen(false)} action={submit}>
      <div>{label('nd-name', 'Nom du deal')}<input id="nd-name" name="name" required className="ev-input" autoFocus placeholder={fixedCompany ? `${fixedCompany.name} — parc IT` : 'Société — besoin'} /></div>
      {fixedCompany
        ? <input type="hidden" name="company_id" value={fixedCompany.id} />
        : (
          <div>
            {label('nd-company', 'Société')}
            <select id="nd-company" name="company_id" required className="ev-input" defaultValue="">
              <option value="" disabled>Choisir…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      <div className="grid grid-cols-2 gap-2">
        <div>{label('nd-amount', 'Montant (€ HT)')}<input id="nd-amount" name="amount" inputMode="decimal" className="ev-input ev-mono" /></div>
        <div>
          {label('nd-stage', 'Étape')}
          <select id="nd-stage" name="stage" className="ev-input" defaultValue="a_contacter">
            {DEAL_STAGES.map(s => <option key={s} value={s}>{DEAL_STAGE_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>{label('nd-next', 'Prochaine action')}<input id="nd-next" name="next_action" className="ev-input" /></div>
        <div>{label('nd-date', 'Pour le')}<input id="nd-date" name="next_action_date" type="date" className="ev-input" /></div>
      </div>
      <div>
        {label('nd-owner', 'Propriétaire')}
        <select id="nd-owner" name="owner_id" className="ev-input" defaultValue="">
          <option value="">Moi</option>
          {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <Alert state={state && !state.ok ? state : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="ev-btn ev-btn--ghost" onClick={() => setOpen(false)}>Annuler</button>
        <button type="submit" className="ev-btn ev-btn--primary" disabled={pending}>{pending ? 'Création…' : 'Créer'}</button>
      </div>
    </Modal>
  )
}

/** Changer l'étape d'un deal : le choix s'enregistre tout de suite ; « Perdu » demande la raison. */
export function DealStageSelect({ dealId, stage }: { dealId: string; stage: DealStage }) {
  const [value, setValue] = useState<DealStage>(stage)
  const [state, submit, pending] = useActionState<CrmFormState, FormData>(moveDealAction, null)
  return (
    <form action={submit} className="flex flex-col gap-1.5">
      <input type="hidden" name="dealId" value={dealId} />
      <select
        name="stage"
        aria-label="Étape du deal"
        value={value}
        disabled={pending}
        className="ev-input"
        style={{ fontSize: 12, padding: '4px 8px' }}
        onChange={e => {
          const next = e.target.value as DealStage
          setValue(next)
          if (next !== 'perdu') e.currentTarget.form?.requestSubmit()
        }}
      >
        {DEAL_STAGES.map(s => <option key={s} value={s}>{DEAL_STAGE_LABEL[s]}</option>)}
      </select>
      {value === 'perdu' && stage !== 'perdu' && (
        <div className="flex gap-1">
          <input name="lost_reason" placeholder="Raison (facultatif)" aria-label="Raison de la perte" className="ev-input" style={{ fontSize: 12, padding: '4px 8px' }} />
          <button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm">OK</button>
        </div>
      )}
      {state && !state.ok && <p className="text-xs" style={{ color: 'var(--danger)' }}>{state.message}</p>}
    </form>
  )
}

// ─── Lemlist ─────────────────────────────────────────────────────────────────

export function LemlistSyncButton({ neverSynced }: { neverSynced: boolean }) {
  const [state, submit, pending] = useActionState<CrmFormState, FormData>(syncLemlistAction, null)
  return (
    <form action={submit} className="flex flex-col gap-2">
      {neverSynced && <input type="hidden" name="full" value="on" />}
      <button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm self-start" disabled={pending}>
        {pending ? 'Synchronisation…' : neverSynced ? 'Importer l’historique Lemlist' : 'Synchroniser maintenant'}
      </button>
      <Alert state={state} />
    </form>
  )
}

// ─── Boîte mail ──────────────────────────────────────────────────────────────

export function MailboxConnectForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, submit, pending] = useActionState<CrmFormState, FormData>(connectMailboxAction, null)
  return (
    <form action={submit} className="flex flex-col gap-2">
      <div>{label('mb-email', 'Email')}<input id="mb-email" name="email" type="email" defaultValue={defaultEmail} required className="ev-input" autoComplete="username" /></div>
      <div>{label('mb-password', 'Mot de passe de la boîte')}<input id="mb-password" name="password" type="password" required className="ev-input" autoComplete="current-password" /></div>
      <details className="text-xs" style={{ color: 'var(--ink-3)' }}>
        <summary className="cursor-pointer">Serveur (Hostinger par défaut)</summary>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <input name="imap_host" defaultValue="imap.hostinger.com" aria-label="Serveur IMAP" className="ev-input col-span-2" />
          <input name="imap_port" defaultValue="993" inputMode="numeric" aria-label="Port" className="ev-input ev-mono" />
        </div>
      </details>
      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Lecture seule. Le mot de passe est chiffré avant d’être stocké. Seuls les échanges avec des contacts du CRM sont enregistrés.</p>
      <Alert state={state} />
      <button type="submit" className="ev-btn ev-btn--primary ev-btn--sm self-start" disabled={pending}>{pending ? 'Vérification…' : 'Connecter ma boîte'}</button>
    </form>
  )
}

export function MailboxActions() {
  const [syncState, sync, syncing] = useActionState<CrmFormState, FormData>(syncMailboxAction, null)
  const [offState, disconnect, leaving] = useActionState<CrmFormState, FormData>(disconnectMailboxAction, null)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <form action={sync}><button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm" disabled={syncing}>{syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}</button></form>
        <form action={disconnect}><button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm" disabled={leaving}>Déconnecter</button></form>
      </div>
      <Alert state={syncState ?? offState} />
    </div>
  )
}
