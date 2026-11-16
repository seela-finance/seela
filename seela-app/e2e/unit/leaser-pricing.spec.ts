import { test, expect } from '@playwright/test'
import {
  amountBands, clientFee, compareLeasers, coveredDurations, eligibilityFor, implicitAnnualRate, pickGridRow, simulate,
  type GridRow, type PricingLeaser,
} from '../../lib/leaser-pricing'

// Extrait du barème Grenke (commission everlease de 2 % incluse)
const BANDS = [[500, 2500], [2500.01, 5000], [5000.01, 12500], [12500.01, 25000], [25000.01, 37500], [37500.01, 50000], [50000.01, 350000]] as const
const COEFS: Record<number, number[]> = {
  36: [3.28, 3.24, 3.24, 3.23, 3.21, 3.19, 3.17],
  60: [2.13, 2.11, 2.09, 2.07, 2.06, 2.05, 2.02],
}
const grid: GridRow[] = Object.entries(COEFS).flatMap(([d, cs]) => cs.map((c, i) => ({
  amount_min: BANDS[i][0], amount_max: BANDS[i][1], duration_months: Number(d), coefficient_pct: c, equipment_family: null, financing_type: null,
})))

const grenke = (over: Partial<PricingLeaser> = {}): PricingLeaser => ({
  id: 'g', name: 'Grenke', is_active: true, min_amount: 500, max_amount: 350000, rent_timing: null, residual_value_pct: null,
  commission_included_pct: 2, markup_pct: 0, client_fee_rules: { tiers: [{ up_to: null, rate: 0.015 }], min: 490, max: 2500 },
  financing_types: ['leasing', 'lease_back'], grid,
  eligibility: [
    { equipment_family: 'informatique', equipment_type: null, status: 'yes', conditions: null },
    { equipment_family: 'informatique', equipment_type: 'logiciels-licences', status: 'conditional', conditions: 'Part immatérielle' },
    { equipment_family: 'vehicules', equipment_type: null, status: 'no', conditions: 'Véhicules immatriculés exclus' },
  ],
  ...over,
})

const pct = (r: number) => Math.round(r * 1000) / 10 // 0.1068 → 10.7

test('valeurs de contrôle : 36 mois à 3,23 % à échoir, puis hors commission, puis 60 mois à 2,07 %', () => {
  expect(pct(implicitAnnualRate(0.0323, 36, 'echoir'))).toBe(10.7)
  expect(pct(implicitAnnualRate(0.0323 / 1.02, 36, 'echoir'))).toBe(9.2)
  expect(pct(implicitAnnualRate(0.0207, 60, 'echoir'))).toBe(9.2)
})

test('échu coûte moins qu’à échoir ; une valeur résiduelle augmente le taux', () => {
  expect(implicitAnnualRate(0.0323, 36, 'echu')).toBeLessThan(implicitAnnualRate(0.0323, 36, 'echoir'))
  expect(implicitAnnualRate(0.0323, 36, 'echoir', 0.05)).toBeGreaterThan(implicitAnnualRate(0.0323, 36, 'echoir'))
  expect(implicitAnnualRate(0.02, 36)).toBe(0) // le client paie moins que le montant reçu
})

test('simulation complète : 20 000 € sur 36 mois', () => {
  const s = simulate(grenke(), { amount: 20000, duration: 36, equipment: 'informatique', financingType: 'leasing' })
  expect(s.exclusions).toEqual([])
  expect(s.row).toMatchObject({ amount_min: 12500.01, amount_max: 25000, coefficient_pct: 3.23 })
  expect(s.monthly).toBe(646)
  expect(s.total).toBe(23256)
  expect(s.totalPct).toBe(116.28)
  expect(s.financingCost).toBe(3256)
  expect(pct(s.annualRate!)).toBe(10.7)
  expect(pct(s.annualRateExCommission!)).toBe(9.2)
  expect(s.commission).toBe(400)
  expect(s.clientFee).toBe(490) // 1,5 % = 300 €, relevé au plancher
  expect(s.everleaseRevenue).toBe(890)
})

test('la majoration relève le coefficient affiché au client (arrondi au centième, comme le classeur)', () => {
  const s = simulate(grenke({ markup_pct: 2 }), { amount: 10000, duration: 36, equipment: null, financingType: 'leasing' })
  expect(s.coefficientPct).toBe(3.24)
  expect(s.clientCoefficientPct).toBe(3.3)
  expect(s.monthly).toBe(330)
  expect(s.markupRevenue).toBe(200)
  expect(s.everleaseRevenue).toBe(200 + 200 + 490)
})

test('choix de la tranche : bornes incluses, puis la ligne la plus précise', () => {
  const q = { duration: 36, family: null, financingType: 'leasing' }
  expect(pickGridRow(grid, { ...q, amount: 2500 })?.coefficient_pct).toBe(3.28)
  expect(pickGridRow(grid, { ...q, amount: 2500.01 })?.coefficient_pct).toBe(3.24)
  expect(pickGridRow(grid, { ...q, amount: 350000 })?.coefficient_pct).toBe(3.17)
  expect(pickGridRow(grid, { ...q, amount: 350001 })).toBeNull()
  const specific: GridRow = { amount_min: 0, amount_max: null, duration_months: 36, coefficient_pct: 3, equipment_family: 'medical', financing_type: 'lease_back' }
  expect(pickGridRow([...grid, specific], { amount: 20000, duration: 36, family: 'medical', financingType: 'lease_back' })?.coefficient_pct).toBe(3)
  expect(pickGridRow([...grid, specific], { amount: 20000, duration: 36, family: 'medical', financingType: 'leasing' })?.coefficient_pct).toBe(3.23)
})

test('frais client : paliers fixes ou en %, plancher et plafond', () => {
  const louis = { tiers: [{ up_to: 50000, fixed: 1000 }, { up_to: 150000, rate: 0.025 }, { up_to: null, rate: 0.038 }] }
  expect(clientFee(20000, louis)).toBe(1000)
  expect(clientFee(100000, louis)).toBe(2500)
  expect(clientFee(200000, louis)).toBe(7600)
  const classeur = { tiers: [{ up_to: null, rate: 0.015 }], min: 490, max: 2500 }
  expect(clientFee(10000, classeur)).toBe(490)
  expect(clientFee(40000, classeur)).toBe(600)
  expect(clientFee(200000, classeur)).toBe(2500)
  expect(clientFee(10000, null)).toBe(0)
})

test('éligibilité : le type l’emporte sur la famille ; sans matériel, oui', () => {
  const rows = grenke().eligibility
  expect(eligibilityFor(rows, 'postes-serveurs').status).toBe('yes')
  expect(eligibilityFor(rows, 'logiciels-licences')).toEqual({ status: 'conditional', conditions: 'Part immatérielle' })
  expect(eligibilityFor(rows, 'vehicules-immatricules').status).toBe('no')
  expect(eligibilityFor(rows, 'medical').status).toBe('unknown')
  expect(eligibilityFor(rows, null).status).toBe('yes')
})

test('raisons d’exclusion et avertissements', () => {
  const s = (over: Partial<Parameters<typeof simulate>[1]>) => simulate(grenke(), { amount: 20000, duration: 36, equipment: null, financingType: 'leasing', ...over })
  expect(s({ amount: 400 }).exclusions.join()).toMatch(/sous le minimum de 500/)
  expect(s({ amount: 400000 }).exclusions.join()).toMatch(/au-dessus du maximum/)
  expect(s({ duration: 48 }).exclusions).toContain('Durée de 48 mois absente du barème')
  expect(s({ equipment: 'vehicules-immatricules' }).exclusions.join()).toMatch(/Matériel exclu/)
  expect(s({ financingType: 'credit_bail' }).exclusions.join()).toMatch(/crédit-bail/)
  expect(s({ equipment: 'logiciels-licences' })).toMatchObject({ exclusions: [], warnings: ['Sous conditions : Part immatérielle'] })
  expect(simulate(grenke({ is_active: false }), { amount: 20000, duration: 36, equipment: null, financingType: 'leasing' }).exclusions).toContain('Leaser inactif')
})

test('comparatif : éligibles par loyer croissant, exclus à part', () => {
  const cheaper = grenke({ id: 'b', name: 'B', grid: grid.map(r => ({ ...r, coefficient_pct: r.coefficient_pct - 0.1 })) })
  const narrow = grenke({ id: 'c', name: 'C', max_amount: 10000 })
  const { eligible, excluded } = compareLeasers([grenke(), cheaper, narrow], { amount: 20000, duration: 36, equipment: null, financingType: 'leasing' })
  expect(eligible.map(s => s.leaser.name)).toEqual(['B', 'Grenke'])
  expect(excluded.map(s => s.leaser.name)).toEqual(['C'])
})

test('durées couvertes et tranches du barème', () => {
  expect(coveredDurations(grid)).toEqual([36, 60])
  expect(coveredDurations(grid, 400)).toEqual([])
  expect(amountBands(grid)).toHaveLength(7)
  expect(amountBands(grid)[0]).toEqual({ amount_min: 500, amount_max: 2500 })
})
