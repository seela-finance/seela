import { test, expect } from '@playwright/test'
import { missingConditions, ratesExpired, toPricingLeaser, type LeaserRecord } from '../../lib/leaser-conditions'
import { parseSimulationAmount } from '../../lib/leaser-pricing'

const record = (over: Partial<LeaserRecord> = {}): LeaserRecord => ({
  id: 'g', name: 'Grenke', slug: 'grenke', public_kind: 'Banque', is_active: true, min_amount: 500, max_amount: 350000,
  frais_dossier: null, depot_garantie: null, deposit_terms: null, purchase_option: null, residual_value_pct: null, rent_timing: null,
  periodicites: null, insurance_required: null, insurance_cost: null, commission_included_pct: 2, commission_max_pct: null, markup_pct: 0,
  client_fee_rules: null, rates_valid_until: null, delai_reponse_heures: null, penalite_resiliation: null, anciennete_min_mois: 0,
  referent_name: 'Florent Loisel', referent_email: null, referent_phone: null, supplier_conditions: null, internal_notes: null,
  // PostgREST renvoie les numeric en texte
  leaser_rate_grid: [{ amount_min: '500' as unknown as number, amount_max: null, duration_months: 36, coefficient_pct: '3.28' as unknown as number, equipment_family: null, financing_type: null }],
  leaser_eligibility: [], leaser_financing_types: [{ financing_type: 'leasing' }],
  ...over,
})

test('les conditions inconnues de Grenke sont listées « À compléter »', () => {
  expect(missingConditions(record()).map(m => m.key)).toEqual([
    'frais_dossier', 'purchase_option', 'rent_timing', 'deposit_terms', 'periodicites', 'insurance_required',
    'commission_max_pct', 'rates_valid_until', 'delai_reponse_heures', 'referent_email', 'referent_phone',
  ])
  // 0 et false sont des réponses, pas des manques
  const answered = missingConditions(record({ frais_dossier: 0, insurance_required: false, periodicites: ['mensuelle'] })).map(m => m.key)
  expect(answered).not.toContain('frais_dossier')
  expect(answered).not.toContain('insurance_required')
  expect(missingConditions(record({ periodicites: [] })).map(m => m.key)).toContain('periodicites')
})

test('barème expiré : le jour même reste valable', () => {
  const now = new Date('2026-11-16T12:00:00')
  expect(ratesExpired(null, now)).toBe(false)
  expect(ratesExpired('2026-11-16', now)).toBe(false)
  expect(ratesExpired('2026-11-15', now)).toBe(true)
})

test('les nombres lus en base (texte) deviennent des nombres', () => {
  const p = toPricingLeaser(record())
  expect(p.grid[0]).toMatchObject({ amount_min: 500, amount_max: null, coefficient_pct: 3.28 })
  expect(p.financing_types).toEqual(['leasing'])
})

test('saisie du simulateur', () => {
  expect(parseSimulationAmount('20 000')).toBe(20000)
  expect(parseSimulationAmount('1 234,50 €')).toBe(1234.5)
  expect(parseSimulationAmount('3,5 %')).toBe(3.5)
  expect(parseSimulationAmount('abc')).toBeNull()
  expect(parseSimulationAmount('')).toBeNull()
})
