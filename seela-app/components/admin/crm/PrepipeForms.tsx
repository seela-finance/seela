'use client'

import { useActionState, useState } from 'react'
import { setLeadStatusAction, type FicheState } from '@/app/admin/crm/fiche-actions'
import { saveCrmSettingsAction, type CrmFormState } from '@/app/admin/crm/crm-actions'
import { EXIT_REASONS, LEAD_CHANNEL_LABEL, LEAD_CHANNELS, LEAD_STATUS_LABEL, LEAD_STATUSES, type LeadStatus } from '@/lib/crm-prepipe'

const small = { fontSize: 12, padding: '4px 8px' }

/**
 * Lead status d'une société, changé à la main. Disqualifié demande la raison, Pas maintenant la date de relance ;
 * les autres choix s'enregistrent tout de suite.
 */
export function LeadStatusControl({ companyId, status, channel, compact }: { companyId: string; status: string | null; channel: string | null; compact?: boolean }) {
  const [value, setValue] = useState<string>(status ?? '')
  const [state, submit, pending] = useActionState<FicheState, FormData>(setLeadStatusAction, null)
  const needsMore = (value === 'disqualifie' || value === 'pas_maintenant') && value !== status
  return (
    <form action={submit} className="flex flex-col gap-1.5">
      <input type="hidden" name="companyId" value={companyId} />
      <div className={compact ? 'flex flex-col gap-1.5' : 'grid grid-cols-2 gap-2'}>
        <select
          name="lead_status" aria-label="Lead status" value={value} disabled={pending} className="ev-input" style={compact ? small : undefined}
          onChange={e => {
            setValue(e.target.value)
            if (e.target.value !== 'disqualifie' && e.target.value !== 'pas_maintenant') e.currentTarget.form?.requestSubmit()
          }}
        >
          <option value="">Hors pré-pipe</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
        </select>
        {compact
          ? <input type="hidden" name="lead_channel" value={channel ?? 'outbound'} />
          : (
            <select name="lead_channel" aria-label="Canal" defaultValue={channel ?? 'outbound'} className="ev-input" onChange={e => e.currentTarget.form?.requestSubmit()}>
              {LEAD_CHANNELS.map(c => <option key={c} value={c}>{LEAD_CHANNEL_LABEL[c]}</option>)}
            </select>
          )}
      </div>
      {needsMore && (
        <div className="flex gap-1">
          {value === 'disqualifie'
            ? (
              <select name="exit_reason" aria-label="Raison" required defaultValue="" className="ev-input" style={compact ? small : undefined}>
                <option value="" disabled>Raison…</option>
                {EXIT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )
            : <input type="date" name="next_date" aria-label="Date de relance" required className="ev-input" style={compact ? small : undefined} />}
          <button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm" disabled={pending}>OK</button>
        </div>
      )}
      {state && !state.ok && <p className="text-xs" style={{ color: 'var(--danger)' }}>{state.message}</p>}
      {state?.ok && !compact && <p className="text-xs" style={{ color: 'var(--ok)' }}>{state.message}</p>}
    </form>
  )
}

export function ExitReasonField() {
  return (
    <div>
      <label htmlFor="exit-reason" className="ev-label">Pourquoi la société est disqualifiée ?</label>
      <select id="exit-reason" name="exit_reason" required defaultValue="" className="ev-input">
        <option value="" disabled>Choisir…</option>
        {EXIT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
    </div>
  )
}

export function PrepipeSettingsForm({ ownerId, threshold, autoEntry, team }: { ownerId: string | null; threshold: number; autoEntry: 'strong' | 'all'; team: { id: string; name: string }[] }) {
  const [state, submit, pending] = useActionState<CrmFormState, FormData>(saveCrmSettingsAction, null)
  return (
    <form action={submit} className="flex flex-wrap items-end gap-3 text-sm">
      <div>
        <label htmlFor="ps-owner" className="ev-label">Propriétaire des nouveaux leads</label>
        <select id="ps-owner" name="prepipe_owner" defaultValue={ownerId ?? ''} className="ev-input">
          <option value="">Personne</option>
          {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="ps-auto" className="ev-label">Entrée automatique depuis Lemlist</label>
        <select id="ps-auto" name="auto_entry" defaultValue={autoEntry === 'all' ? `all:${threshold}` : 'strong'} className="ev-input">
          <option value="strong">Intéressé ou réponse seulement (le reste au choix)</option>
          {[0.33, 0.5, 0.6, 0.67, 0.75, 1].map(t => <option key={t} value={`all:${t}`}>Aussi au clic et à {Math.round(t * 100)} % de séquence</option>)}
        </select>
      </div>
      <button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>
      {state && <p className={`ev-alert ${state.ok ? 'ev-alert--ok' : 'ev-alert--danger'} w-full`}>{state.message}</p>}
    </form>
  )
}

export type { LeadStatus }
