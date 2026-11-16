'use client'

import { useActionState, useState } from 'react'
import { saveEligibilityAction } from '@/app/admin/leasers/[id]/actions'
import { EQUIPMENT_FAMILIES } from '@/lib/equipment'
import type { EligibilityRow } from '@/lib/leaser-pricing'

type Cell = { status: '' | 'yes' | 'no' | 'conditional'; conditions: string }
const key = (family: string, type: string | null) => `${family}|${type ?? ''}`

const STATUS_LABEL = { yes: 'Oui', no: 'Non', conditional: 'Sous conditions' } as const

/**
 * Matrice d'éligibilité : une réponse par famille, et au besoin une réponse propre à un type,
 * qui l'emporte sur celle de la famille. « Non renseigné » écarte le leaser des dossiers de ce matériel.
 */
export default function EligibilityEditor({ leaserId, rows }: { leaserId: string; rows: EligibilityRow[] }) {
  const [state, submit, pending] = useActionState(saveEligibilityAction, null)
  const [cells, setCells] = useState<Record<string, Cell>>(() =>
    Object.fromEntries(rows.map(r => [key(r.equipment_family, r.equipment_type), { status: r.status, conditions: r.conditions ?? '' }])))
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.filter(r => r.equipment_type).map(r => [r.equipment_family, true])))

  const get = (family: string, type: string | null): Cell => cells[key(family, type)] ?? { status: '', conditions: '' }
  const set = (family: string, type: string | null, patch: Partial<Cell>) =>
    setCells(c => ({ ...c, [key(family, type)]: { ...get(family, type), ...patch } }))

  const payload = JSON.stringify(Object.entries(cells)
    .filter(([, c]) => c.status)
    .map(([k, c]) => {
      const [family, type] = k.split('|')
      return { equipment_family: family, equipment_type: type || null, status: c.status, conditions: c.conditions }
    }))

  // Fonction de rendu (pas un composant) : déclarée ici, un composant serait recréé à chaque frappe et perdrait le focus
  const statusRow = (family: string, type: string | null, label: string) => {
    const cell = get(family, type)
    return (
      <div key={key(family, type)} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_170px_minmax(0,1.2fr)] gap-2 items-center py-1.5">
        <span className={`text-sm ${type ? 'sm:pl-5' : 'font-medium'}`} style={{ color: type ? 'var(--ink-2)' : 'var(--ink)' }}>{label}</span>
        <select aria-label={`Éligibilité : ${label}`} value={cell.status} onChange={e => set(family, type, { status: e.target.value as Cell['status'] })} className="ev-input" style={{ minHeight: 32 }}>
          <option value="">{type ? 'Comme la famille' : 'Non renseigné'}</option>
          {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <input aria-label={`Conditions : ${label}`} value={cell.conditions} onChange={e => set(family, type, { conditions: e.target.value })} disabled={!cell.status} placeholder={cell.status ? 'Conditions (facultatif)' : ''} className="ev-input" style={{ minHeight: 32 }} />
      </div>
    )
  }

  return (
    <form action={submit} className="px-4 py-4 space-y-3">
      <input type="hidden" name="leaserId" value={leaserId} />
      <input type="hidden" name="eligibility" value={payload} />
      <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
        {EQUIPMENT_FAMILIES.map(f => (
          <div key={f.slug} className="py-1">
            {statusRow(f.slug, null, f.label)}
            <button type="button" onClick={() => setOpen(o => ({ ...o, [f.slug]: !o[f.slug] }))} className="text-xs hover:opacity-70" style={{ color: 'var(--ink-3)' }}>
              {open[f.slug] ? 'Masquer les types' : `Préciser par type (${f.types.length})`}
            </button>
            {open[f.slug] && f.types.map(t => statusRow(f.slug, t.slug, t.label))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">{pending ? 'Enregistrement…' : 'Enregistrer l’éligibilité'}</button>
        {state && <p role="status" className={state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}>{state.message}</p>}
      </div>
    </form>
  )
}
