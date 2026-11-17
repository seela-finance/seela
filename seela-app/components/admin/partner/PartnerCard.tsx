'use client'

import { useActionState } from 'react'
import { setPartnerAction, type PartnerState } from '@/app/admin/partner-actions'

/** Fiche société du CRM : activer l'espace partenaire d'un distributeur (dépôt de dossiers clients et suivi). */
export default function PartnerCard({ companyId, enabled, canEdit }: { companyId: string; enabled: boolean; canEdit: boolean }) {
  const [state, submit, pending] = useActionState<PartnerState, FormData>(setPartnerAction, null)
  return (
    <section className="ev-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="ev-kicker">Partenaire distributeur</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>
            {enabled
              ? 'Activé : ses comptes montent les dossiers de leurs clients et les suivent dans « Mes clients ».'
              : 'Non activé. Une fois activé, ses comptes peuvent monter les dossiers de leurs clients.'}
          </p>
        </div>
        {canEdit && (
          <form action={submit}>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
            <button
              type="submit"
              disabled={pending}
              onClick={e => { if (enabled && !window.confirm('Retirer l’espace partenaire ? Ses dossiers déjà envoyés restent suivis par l’équipe.')) e.preventDefault() }}
              className={enabled ? 'ev-btn ev-btn--ghost ev-btn--sm' : 'ev-btn ev-btn--primary ev-btn--sm'}
            >
              {pending ? '…' : enabled ? 'Retirer' : 'Activer comme partenaire'}
            </button>
          </form>
        )}
      </div>
      {state && <p role="status" className={`mt-3 ${state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}`}>{state.message}</p>}
    </section>
  )
}
