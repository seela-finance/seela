'use client'

import { useActionState, useState } from 'react'
import { saveGridAction } from '@/app/admin/leasers/[id]/actions'
import { amountBands, type GridRow } from '@/lib/leaser-pricing'

type Band = { amount_min: string; amount_max: string }
type Row = { duration: string; cells: string[] }

const fr = (n: number) => String(n).replace('.', ',')

function initial(grid: GridRow[]): { bands: Band[]; rows: Row[] } {
  const generic = grid.filter(r => !r.equipment_family && !r.financing_type)
  const bands = amountBands(generic)
  const durations = [...new Set(generic.map(r => r.duration_months))].sort((a, b) => a - b)
  return {
    bands: bands.map(b => ({ amount_min: fr(b.amount_min), amount_max: b.amount_max == null ? '' : fr(b.amount_max) })),
    rows: durations.map(d => ({
      duration: String(d),
      cells: bands.map(b => {
        const cell = generic.find(r => r.duration_months === d && Number(r.amount_min) === b.amount_min)
        return cell ? fr(Number(cell.coefficient_pct)) : ''
      }),
    })),
  }
}

/**
 * Barème du leaser : tranches de montant en colonnes, durées en lignes, coefficient mensuel en %.
 * Les lignes propres à une famille ou à un type de financement ne sont pas éditées ici et restent en place.
 */
export default function RateGridEditor({ leaserId, grid }: { leaserId: string; grid: GridRow[] }) {
  const [state, submit, pending] = useActionState(saveGridAction, null)
  const start = initial(grid)
  const [bands, setBands] = useState<Band[]>(start.bands)
  const [rows, setRows] = useState<Row[]>(start.rows)
  const specific = grid.filter(r => r.equipment_family || r.financing_type)

  const payload = JSON.stringify({
    bands: bands.map(b => ({ amount_min: b.amount_min, amount_max: b.amount_max || null })),
    rows: rows.map(r => ({ duration_months: r.duration, coefficients: r.cells.map(c => c || null) })),
  })

  const setBand = (i: number, patch: Partial<Band>) => setBands(bs => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const setCell = (ri: number, ci: number, v: string) => setRows(rs => rs.map((r, j) => (j === ri ? { ...r, cells: r.cells.map((c, k) => (k === ci ? v : c)) } : r)))

  return (
    <form action={submit} className="px-4 py-4 space-y-4">
      <input type="hidden" name="leaserId" value={leaserId} />
      <input type="hidden" name="grid" value={payload} />

      <div className="overflow-x-auto">
        <table className="text-left">
          <thead>
            <tr>
              <th className="ev-kicker px-2 py-2 align-bottom whitespace-nowrap">Durée \ tranche (€ HT)</th>
              {bands.map((b, i) => (
                <th key={i} className="px-1 py-2 align-bottom">
                  <div className="flex flex-col gap-1 w-28">
                    <input aria-label={`Tranche ${i + 1}, minimum`} value={b.amount_min} onChange={e => setBand(i, { amount_min: e.target.value })} placeholder="Min" inputMode="decimal" className="ev-input ev-mono" style={{ minHeight: 32 }} />
                    <input aria-label={`Tranche ${i + 1}, maximum`} value={b.amount_max} onChange={e => setBand(i, { amount_max: e.target.value })} placeholder="Sans plafond" inputMode="decimal" className="ev-input ev-mono" style={{ minHeight: 32 }} />
                    <button type="button" onClick={() => { setBands(bs => bs.filter((_, j) => j !== i)); setRows(rs => rs.map(r => ({ ...r, cells: r.cells.filter((_, k) => k !== i) }))) }} className="text-xs hover:opacity-70" style={{ color: 'var(--danger)' }}>
                      Retirer
                    </button>
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 align-bottom">
                <button type="button" onClick={() => { setBands(bs => [...bs, { amount_min: '', amount_max: '' }]); setRows(rs => rs.map(r => ({ ...r, cells: [...r.cells, ''] }))) }} className="ev-btn ev-btn--ghost ev-btn--sm whitespace-nowrap">
                  + Tranche
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} style={{ borderTop: '1px solid var(--line)' }}>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1">
                    <input aria-label={`Durée, ligne ${ri + 1}`} value={r.duration} onChange={e => setRows(rs => rs.map((x, j) => (j === ri ? { ...x, duration: e.target.value } : x)))} inputMode="numeric" className="ev-input ev-mono w-16" style={{ minHeight: 32 }} />
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>mois</span>
                    <button type="button" aria-label={`Retirer la durée ${r.duration}`} onClick={() => setRows(rs => rs.filter((_, j) => j !== ri))} className="text-xs px-1 hover:opacity-70" style={{ color: 'var(--danger)' }}>✕</button>
                  </div>
                </td>
                {r.cells.map((c, ci) => (
                  <td key={ci} className="px-1 py-1">
                    <input aria-label={`Coefficient ${r.duration} mois, tranche ${ci + 1}`} value={c} onChange={e => setCell(ri, ci, e.target.value)} inputMode="decimal" className="ev-input ev-mono w-28 text-right" style={{ minHeight: 32 }} />
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRows(rs => [...rs, { duration: '', cells: bands.map(() => '') }])} className="ev-btn ev-btn--ghost ev-btn--sm">+ Durée</button>
        <button type="submit" disabled={pending} className="ev-btn ev-btn--primary ev-btn--sm">{pending ? 'Enregistrement…' : 'Enregistrer le barème'}</button>
        {state && <p role="status" className={state.ok ? 'ev-alert ev-alert--ok' : 'ev-alert ev-alert--danger'}>{state.message}</p>}
      </div>
      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
        Coefficient mensuel en % du montant financé HT (3,23 = 3,23 % par mois). Case vide : pas de coefficient. Les bornes des tranches sont incluses.
      </p>
      {specific.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {specific.length} coefficient{specific.length > 1 ? 's' : ''} propre{specific.length > 1 ? 's' : ''} à une famille ou à un type de financement : conservé{specific.length > 1 ? 's' : ''} tel{specific.length > 1 ? 's' : ''} quel{specific.length > 1 ? 's' : ''}.
        </p>
      )}
    </form>
  )
}
