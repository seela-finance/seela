'use client'

import { useActionState } from 'react'
import { addMemberAction, changeRoleAction, removeMemberAction, type TeamActionState } from '@/app/admin/equipe/actions'
import { ADMIN_ROLES, ROLE_DESCRIPTION, ROLE_LABEL, type AdminRole } from '@/lib/admin-roles'

function Feedback({ state }: { state: TeamActionState }) {
  if (!state) return null
  return <p role="status" className={state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}>{state.message}</p>
}

/** Ajoute un compte everlease existant et confirmé à l'équipe. */
export function AddMemberForm() {
  const [state, submit, pending] = useActionState(addMemberAction, null)
  return (
    <form action={submit} className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="ev-label">Email du compte everlease</span>
          <input name="email" type="email" required autoComplete="off" className="ev-input" />
        </label>
        <label className="block">
          <span className="ev-label">Nom affiché</span>
          <input name="name" required maxLength={80} placeholder="Prénom" className="ev-input" />
        </label>
        <label className="block">
          <span className="ev-label">Rôle</span>
          <select name="role" defaultValue="commercial" className="ev-input">
            {ADMIN_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
      </div>
      <ul className="text-xs space-y-0.5" style={{ color: 'var(--ink-3)' }}>
        {ADMIN_ROLES.map(r => <li key={r}><strong style={{ color: 'var(--ink-2)' }}>{ROLE_LABEL[r]}</strong> : {ROLE_DESCRIPTION[r]}</li>)}
      </ul>
      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
        La personne crée d’abord son compte sur everlease.fr/auth et confirme son email : seul un compte confirmé peut être ajouté.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">{pending ? 'Ajout…' : 'Ajouter à l’équipe'}</button>
        <Feedback state={state} />
      </div>
    </form>
  )
}

/** Rôle et retrait d'un membre ; absent pour soi-même. */
export function MemberActions({ userId, name, role }: { userId: string; name: string; role: AdminRole }) {
  const [roleState, submitRole, changing] = useActionState(changeRoleAction, null)
  const [removeState, submitRemove, removing] = useActionState(removeMemberAction, null)
  const other = ADMIN_ROLES.find(r => r !== role)!

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={submitRole}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="role" value={other} />
        <button type="submit" disabled={changing} className="ev-btn ev-btn--ghost ev-btn--sm">
          {changing ? 'En cours…' : `Passer ${ROLE_LABEL[other].toLowerCase()}`}
        </button>
      </form>
      <form action={submitRemove} onSubmit={e => { if (!window.confirm(`Retirer l’accès de ${name} au back-office ?`)) e.preventDefault() }}>
        <input type="hidden" name="userId" value={userId} />
        <button type="submit" disabled={removing} className="ev-btn ev-btn--danger ev-btn--sm">{removing ? 'Retrait…' : 'Retirer'}</button>
      </form>
      <Feedback state={roleState ?? removeState} />
    </div>
  )
}
