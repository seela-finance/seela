'use client'

import { useMemo, useState } from 'react'
import { EQUIPMENT_FAMILIES, FINANCING_TYPES } from '@/lib/equipment'
import { amountBands, compareLeasers, coveredDurations, parseSimulationAmount, type PricingLeaser, type Simulation, type SimulationInput } from '@/lib/leaser-pricing'

const eur = (n: number | null, digits = 0) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
const pct = (n: number | null, digits = 2) =>
  n == null || Number.isNaN(n) ? '—' : `${n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`

function band(s: Simulation) {
  if (!s.row) return '—'
  const max = s.row.amount_max == null ? 'sans plafond' : eur(Number(s.row.amount_max))
  return `${eur(Number(s.row.amount_min))} – ${max}`
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="ev-label">{children}</label>
}

/**
 * Simulateur d'un dossier : un seul leaser (fiche) ou tous (comparatif).
 * Le calcul (lib/leaser-pricing.ts) tourne dans le navigateur de l'admin : aucune donnée n'est enregistrée.
 */
export default function LeaserSimulator({ leasers, single = false }: { leasers: PricingLeaser[]; single?: boolean }) {
  const durations = useMemo(() => {
    const all = [...new Set(leasers.flatMap(l => coveredDurations(l.grid)))].sort((a, b) => a - b)
    return all.length ? all : [24, 36, 48, 60]
  }, [leasers])

  const [amount, setAmount] = useState('20000')
  const [duration, setDuration] = useState(durations.includes(36) ? 36 : durations[0])
  const [equipment, setEquipment] = useState('')
  const [financingType, setFinancingType] = useState<SimulationInput['financingType']>('leasing')
  const [timing, setTiming] = useState<'' | 'echoir' | 'echu'>('')
  const [residual, setResidual] = useState('')

  const parsedAmount = parseSimulationAmount(amount)
  const parsedResidual = residual.trim() === '' ? null : parseSimulationAmount(residual)
  const input: SimulationInput = {
    amount: parsedAmount ?? 0,
    duration,
    equipment: equipment || null,
    financingType,
    rentTiming: timing || null,
    residualValuePct: parsedResidual,
  }
  const { eligible, excluded } = compareLeasers(leasers, input)
  const bands = single && leasers[0] ? amountBands(leasers[0].grid) : []

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="sim-amount">Montant HT (€)</Label>
          <input id="sim-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="ev-input ev-mono" aria-invalid={parsedAmount == null} />
        </div>
        <div>
          <Label htmlFor="sim-duration">Durée</Label>
          <select id="sim-duration" value={duration} onChange={e => setDuration(Number(e.target.value))} className="ev-input">
            {durations.map(d => <option key={d} value={d}>{d} mois</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="sim-equipment">Matériel</Label>
          <select id="sim-equipment" value={equipment} onChange={e => setEquipment(e.target.value)} className="ev-input">
            <option value="">Non précisé</option>
            {EQUIPMENT_FAMILIES.map(f => (
              <optgroup key={f.slug} label={f.label}>
                <option value={f.slug}>{f.label} (toute la famille)</option>
                {f.types.map(t => <option key={t.slug} value={t.slug}>{t.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="sim-financing">Type de financement</Label>
          <select id="sim-financing" value={financingType} onChange={e => setFinancingType(e.target.value as SimulationInput['financingType'])} className="ev-input">
            {FINANCING_TYPES.map(f => <option key={f.slug} value={f.slug}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="sim-timing">Loyers</Label>
          <select id="sim-timing" value={timing} onChange={e => setTiming(e.target.value as '' | 'echoir' | 'echu')} className="ev-input">
            <option value="">Valeur du leaser (à échoir si inconnue)</option>
            <option value="echoir">À échoir</option>
            <option value="echu">Échus</option>
          </select>
        </div>
        <div>
          <Label htmlFor="sim-residual">Valeur résiduelle (% du montant)</Label>
          <input id="sim-residual" inputMode="decimal" value={residual} onChange={e => setResidual(e.target.value)} placeholder="Valeur du leaser" className="ev-input ev-mono" />
        </div>
      </div>

      {parsedAmount == null && <p className="ev-alert ev-alert--danger">Montant illisible.</p>}

      {eligible.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {[single ? 'Tranche' : 'Leaser', 'Coefficient', 'Loyer HT / mois', 'Total payé', 'Coût du financement', 'Taux implicite', 'Hors commission', 'Commission', 'Frais client', 'Revenu everlease'].map(h => (
                  <th key={h} className="ev-kicker px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eligible.map(s => (
                <tr key={s.leaser.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-3 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>
                    {single ? <span className="ev-mono">{band(s)}</span> : <>{s.leaser.name}<span className="block text-xs ev-mono" style={{ color: 'var(--ink-3)' }}>{band(s)}</span></>}
                    {s.warnings.map(w => <span key={w} className="ev-tag ev-tag--warning mt-1">{w}</span>)}
                  </td>
                  <td className="ev-mono px-3 py-2.5 text-sm whitespace-nowrap">
                    {pct(s.clientCoefficientPct)}
                    {s.clientCoefficientPct !== s.coefficientPct && <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>barème {pct(s.coefficientPct)}</span>}
                  </td>
                  <td className="ev-mono px-3 py-2.5 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--ink)' }}>{eur(s.monthly, 2)}</td>
                  <td className="ev-mono px-3 py-2.5 text-sm whitespace-nowrap">{eur(s.total)}<span className="block text-xs" style={{ color: 'var(--ink-3)' }}>{pct(s.totalPct)} du montant</span></td>
                  <td className="ev-mono px-3 py-2.5 text-sm whitespace-nowrap">{eur(s.financingCost)}</td>
                  <td className="ev-mono px-3 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>{pct(s.annualRate == null ? null : s.annualRate * 100)} / an</td>
                  <td className="ev-mono px-3 py-2.5 text-sm whitespace-nowrap">{pct(s.annualRateExCommission == null ? null : s.annualRateExCommission * 100)} / an</td>
                  <td className="ev-mono px-3 py-2.5 text-sm whitespace-nowrap">{eur(s.commission)}</td>
                  <td className="ev-mono px-3 py-2.5 text-sm whitespace-nowrap">{eur(s.clientFee)}</td>
                  <td className="ev-mono px-3 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                    {eur(s.everleaseRevenue)}<span className="block text-xs" style={{ color: 'var(--ink-3)' }}>{pct(s.takeRatePct)} du montant</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {excluded.length > 0 && (
        <div>
          <p className="ev-kicker mb-2">{single ? 'Ce leaser ne finance pas ce dossier' : 'Leasers exclus'}</p>
          <ul className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {excluded.map(s => (
              <li key={s.leaser.id} className="py-2 flex flex-col sm:flex-row sm:gap-4 text-sm">
                {!single && <span className="font-medium sm:w-56 sm:shrink-0" style={{ color: 'var(--ink)' }}>{s.leaser.name}</span>}
                <span style={{ color: 'var(--ink-3)' }}>{s.exclusions.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
        Taux implicite : TRI mensuel × 12, selon les loyers à échoir ou échus et la valeur résiduelle. Hors commission : coefficient ÷ (1 + commission incluse).
        Revenu everlease = commission incluse + majoration + frais client.
        {single && bands.length > 0 && ` Barème en ${bands.length} tranche${bands.length > 1 ? 's' : ''}.`}
      </p>
    </div>
  )
}
