'use client'

import { useActionState, useState } from 'react'
import { saveConditionsAction, type LeaserActionState } from '@/app/admin/leasers/[id]/actions'
import { FINANCING_TYPES } from '@/lib/equipment'
import type { LeaserRecord } from '@/lib/leaser-conditions'
import type { ClientFeeRules } from '@/lib/leaser-pricing'

const show = (v: unknown) => (v == null ? '' : String(v))
const PERIODICITES = ['mensuelle', 'trimestrielle', 'annuelle']

function Feedback({ state }: { state: LeaserActionState }) {
  if (!state) return null
  return <p role="status" className={state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}>{state.message}</p>
}

function Todo({ show: visible }: { show: boolean }) {
  return visible ? <span className="ev-tag ev-tag--warning ml-2">À compléter</span> : null
}

function Field({ label, name, defaultValue, missing, hint, type = 'text', mono = false }: {
  label: string; name: string; defaultValue: string; missing?: boolean; hint?: string; type?: string; mono?: boolean
}) {
  return (
    <label className="block">
      <span className="ev-label">{label}<Todo show={!!missing} /></span>
      <input name={name} type={type} defaultValue={defaultValue} inputMode={mono ? 'decimal' : undefined} className={`ev-input${mono ? ' ev-mono' : ''}`} />
      {hint && <span className="block text-xs mt-1" style={{ color: 'var(--ink-3)' }}>{hint}</span>}
    </label>
  )
}

type Tier = { up_to: string; mode: 'fixed' | 'rate'; value: string }

function initialTiers(rules: ClientFeeRules | null): Tier[] {
  return (rules?.tiers ?? []).map(t => ({
    up_to: show(t.up_to),
    mode: t.fixed != null ? 'fixed' : 'rate',
    value: t.fixed != null ? show(t.fixed) : t.rate != null ? String(Math.round(t.rate * 10000) / 100) : '',
  }))
}

const toNumber = (s: string) => {
  const n = Number(s.replace(/[\s €%]/g, '').replace(',', '.'))
  return s.trim() === '' || !Number.isFinite(n) ? null : n
}

/** Barème des frais de dossier client everlease : paliers fixes ou en %, plancher et plafond. */
function FeeRulesEditor({ rules }: { rules: ClientFeeRules | null }) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers(rules))
  const [min, setMin] = useState(show(rules?.min))
  const [max, setMax] = useState(show(rules?.max))
  const update = (i: number, patch: Partial<Tier>) => setTiers(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  const json = tiers.length === 0 ? '' : JSON.stringify({
    tiers: tiers.map(t => ({ up_to: toNumber(t.up_to), ...(t.mode === 'fixed' ? { fixed: toNumber(t.value) } : { rate: toNumber(t.value) == null ? null : toNumber(t.value)! / 100 }) })),
    min: toNumber(min),
    max: toNumber(max),
  })

  return (
    <div className="space-y-2">
      <input type="hidden" name="client_fee_rules" value={json} />
      {tiers.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Aucun frais client pour ce leaser.</p>}
      {tiers.map((t, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <label className="block w-36">
            <span className="ev-label">Jusqu’à (€ HT)</span>
            <input value={t.up_to} onChange={e => update(i, { up_to: e.target.value })} placeholder="Sans plafond" inputMode="decimal" className="ev-input ev-mono" />
          </label>
          <label className="block w-32">
            <span className="ev-label">Type</span>
            <select value={t.mode} onChange={e => update(i, { mode: e.target.value as Tier['mode'] })} className="ev-input">
              <option value="rate">% du montant</option>
              <option value="fixed">Montant fixe</option>
            </select>
          </label>
          <label className="block w-28">
            <span className="ev-label">{t.mode === 'rate' ? 'Taux (%)' : 'Montant (€)'}</span>
            <input value={t.value} onChange={e => update(i, { value: e.target.value })} inputMode="decimal" className="ev-input ev-mono" />
          </label>
          <button type="button" onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))} className="ev-btn ev-btn--ghost ev-btn--sm">Retirer</button>
        </div>
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" onClick={() => setTiers(ts => [...ts, { up_to: '', mode: 'rate', value: '' }])} className="ev-btn ev-btn--ghost ev-btn--sm">Ajouter un palier</button>
        {tiers.length > 0 && (
          <>
            <label className="block w-32">
              <span className="ev-label">Plancher (€)</span>
              <input value={min} onChange={e => setMin(e.target.value)} inputMode="decimal" className="ev-input ev-mono" />
            </label>
            <label className="block w-32">
              <span className="ev-label">Plafond (€)</span>
              <input value={max} onChange={e => setMax(e.target.value)} inputMode="decimal" className="ev-input ev-mono" />
            </label>
          </>
        )}
      </div>
      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Le premier palier qui couvre le montant s’applique ; le dernier peut être sans plafond.</p>
    </div>
  )
}

export default function ConditionsForm({ leaser, missing }: { leaser: LeaserRecord; missing: string[] }) {
  const [state, submit, pending] = useActionState(saveConditionsAction, null)
  const m = (key: string) => missing.includes(key)
  const financing = (leaser.leaser_financing_types ?? []).map(f => f.financing_type)

  return (
    <form action={submit} className="px-4 py-4 space-y-6">
      <input type="hidden" name="leaserId" value={leaser.id} />

      <fieldset className="space-y-4">
        <legend className="ev-kicker mb-2">Identité</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Nom (interne)" name="name" defaultValue={leaser.name} />
          <Field label="Vu par le client" name="public_kind" defaultValue={show(leaser.public_kind)} hint="« Financeur A · … » : jamais le nom du leaser." />
          <label className="flex items-center gap-2 text-sm pt-6" style={{ color: 'var(--ink)' }}>
            <input type="checkbox" name="is_active" defaultChecked={!!leaser.is_active} style={{ accentColor: 'var(--accent)' }} />
            Actif : proposé par le matching
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="ev-kicker mb-2">Financement</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Montant minimum (€ HT)" name="min_amount" defaultValue={show(leaser.min_amount)} mono />
          <Field label="Montant maximum (€ HT)" name="max_amount" defaultValue={show(leaser.max_amount)} mono />
          <Field label="Ancienneté minimale (mois)" name="anciennete_min_mois" defaultValue={show(leaser.anciennete_min_mois)} mono />
          <div>
            <span className="ev-label">Types de financement</span>
            <div className="space-y-1">
              {FINANCING_TYPES.map(f => (
                <label key={f.slug} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink)' }}>
                  <input type="checkbox" name="financing_types" value={f.slug} defaultChecked={financing.includes(f.slug)} style={{ accentColor: 'var(--accent)' }} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="ev-label">Périodicités<Todo show={m('periodicites')} /></span>
            <div className="space-y-1">
              {PERIODICITES.map(p => (
                <label key={p} className="flex items-center gap-2 text-sm capitalize" style={{ color: 'var(--ink)' }}>
                  <input type="checkbox" name="periodicites" value={p} defaultChecked={(leaser.periodicites ?? []).includes(p)} style={{ accentColor: 'var(--accent)' }} />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="ev-label">Loyers<Todo show={m('rent_timing')} /></span>
            <select name="rent_timing" defaultValue={leaser.rent_timing ?? ''} className="ev-input">
              <option value="">Inconnu</option>
              <option value="echoir">À échoir</option>
              <option value="echu">Échus</option>
            </select>
          </label>
          <Field label="Frais de dossier du leaser (€ HT)" name="frais_dossier" defaultValue={show(leaser.frais_dossier)} missing={m('frais_dossier')} mono />
          <Field label="Option d'achat ou valeur résiduelle" name="purchase_option" defaultValue={show(leaser.purchase_option)} missing={m('purchase_option')} hint="Ex. : option d’achat à 1 €, ou 2 % du montant." />
          <Field label="Valeur résiduelle (% du montant)" name="residual_value_pct" defaultValue={show(leaser.residual_value_pct)} mono hint="Utilisée par le simulateur." />
          <Field label="Dépôt de garantie ou premier loyer majoré" name="deposit_terms" defaultValue={show(leaser.deposit_terms)} missing={m('deposit_terms')} />
          <Field label="Dépôt de garantie (€)" name="depot_garantie" defaultValue={show(leaser.depot_garantie)} mono />
          <Field label="Résiliation anticipée" name="penalite_resiliation" defaultValue={show(leaser.penalite_resiliation)} />
          <label className="block">
            <span className="ev-label">Assurance obligatoire<Todo show={m('insurance_required')} /></span>
            <select name="insurance_required" defaultValue={leaser.insurance_required == null ? '' : leaser.insurance_required ? 'yes' : 'no'} className="ev-input">
              <option value="">Inconnu</option>
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </select>
          </label>
          <Field label="Coût indicatif de l'assurance" name="insurance_cost" defaultValue={show(leaser.insurance_cost)} />
          <Field label="Délai de réponse (heures ouvrées)" name="delai_reponse_heures" defaultValue={show(leaser.delai_reponse_heures)} missing={m('delai_reponse_heures')} mono />
          <Field label="Validité du barème" name="rates_valid_until" type="date" defaultValue={show(leaser.rates_valid_until)} missing={m('rates_valid_until')} />
        </div>
        <label className="block">
          <span className="ev-label">Conditions fournisseur</span>
          <textarea name="supplier_conditions" defaultValue={show(leaser.supplier_conditions)} rows={2} className="ev-input" />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="ev-kicker mb-2">Rémunération everlease</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Commission incluse dans le barème (%)" name="commission_included_pct" defaultValue={show(leaser.commission_included_pct)} mono />
          <Field label="Commission maximale autorisée (%)" name="commission_max_pct" defaultValue={show(leaser.commission_max_pct)} missing={m('commission_max_pct')} mono />
          <Field label="Majoration du coefficient client (%)" name="markup_pct" defaultValue={show(leaser.markup_pct)} mono hint="0 : le client voit le barème du leaser." />
        </div>
        <div>
          <span className="ev-label">Frais de dossier client everlease</span>
          <FeeRulesEditor rules={leaser.client_fee_rules} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="ev-kicker mb-2">Référent et notes</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Nom" name="referent_name" defaultValue={show(leaser.referent_name)} />
          <Field label="Email" name="referent_email" type="email" defaultValue={show(leaser.referent_email)} missing={m('referent_email')} hint="Reçoit les dossiers validés." />
          <Field label="Téléphone" name="referent_phone" defaultValue={show(leaser.referent_phone)} missing={m('referent_phone')} />
        </div>
        <label className="block">
          <span className="ev-label">Notes internes</span>
          <textarea name="internal_notes" defaultValue={show(leaser.internal_notes)} rows={3} className="ev-input" />
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="ev-btn ev-btn--primary">{pending ? 'Enregistrement…' : 'Enregistrer les conditions'}</button>
        <Feedback state={state} />
      </div>
    </form>
  )
}
