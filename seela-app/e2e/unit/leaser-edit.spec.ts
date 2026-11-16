import { test, expect } from '@playwright/test'
import { LeaserEditError, changedFields, decimal, parseConditions, parseEligibility, parseFeeRules, parseGrid } from '../../lib/leaser-edit'

const FORM = {
  name: 'Grenke', public_kind: 'Banque', is_active: 'on', min_amount: '500', max_amount: '350 000',
  frais_dossier: '', residual_value_pct: '', rent_timing: '', periodicites: ['mensuelle', 'trimestrielle', 'hebdo'],
  financing_types: ['leasing', 'lease_back', 'autre'], insurance_required: '', commission_included_pct: '2',
  commission_max_pct: '', markup_pct: '', client_fee_rules: '{"tiers":[{"up_to":null,"rate":0.015}],"min":490,"max":2500}',
  rates_valid_until: '', delai_reponse_heures: '', anciennete_min_mois: '0', referent_email: '', referent_name: ' Florent Loisel ',
}

test('conditions : vide = inconnu (null), jamais 0 ; listes filtrées', () => {
  const { patch, financingTypes } = parseConditions(FORM)
  expect(patch).toMatchObject({
    name: 'Grenke', is_active: true, min_amount: 500, max_amount: 350000, frais_dossier: null, rent_timing: null,
    periodicites: ['mensuelle', 'trimestrielle'], insurance_required: null, commission_included_pct: 2, commission_max_pct: null,
    markup_pct: 0, rates_valid_until: null, anciennete_min_mois: 0, referent_name: 'Florent Loisel', referent_email: null,
    client_fee_rules: { tiers: [{ up_to: null, rate: 0.015 }], min: 490, max: 2500 },
  })
  expect(financingTypes).toEqual(['leasing', 'lease_back'])
  expect(parseConditions({ ...FORM, is_active: undefined }).patch.is_active).toBe(false)
  expect(parseConditions({ ...FORM, insurance_required: 'no' }).patch.insurance_required).toBe(false)
})

test('conditions : saisies refusées avec un message clair', () => {
  const bad = (patch: Record<string, string>) => () => parseConditions({ ...FORM, ...patch })
  expect(bad({ name: ' ' })).toThrow(/Nom/)
  expect(bad({ min_amount: '400000' })).toThrow(/minimum au-dessus/)
  expect(bad({ referent_email: 'florent@' })).toThrow(/Email/)
  expect(bad({ rent_timing: 'mensuel' })).toThrow(/échoir/)
  expect(bad({ commission_included_pct: '4', commission_max_pct: '3' })).toThrow(/dépasse/)
  expect(bad({ markup_pct: '25' })).toThrow(/Majoration/)
  expect(bad({ delai_reponse_heures: '1,5' })).toThrow(/Délai/)
  expect(bad({ rates_valid_until: '31/12/2026' })).toThrow(/Validité/)
})

test('nombres saisis à la française', () => {
  expect(decimal('1 234,50 €', 'x')).toBe(1234.5)
  expect(decimal('', 'x')).toBeNull()
  expect(() => decimal('abc', 'Montant')).toThrow('Montant : nombre illisible.')
})

test('frais client : paliers fixes ou en %, dernier palier sans plafond seulement', () => {
  expect(parseFeeRules('')).toBeNull()
  expect(parseFeeRules({ tiers: [{ up_to: 50000, fixed: 1000 }, { up_to: '', rate: 0.025 }] })).toEqual({
    tiers: [{ up_to: 50000, fixed: 1000 }, { up_to: null, rate: 0.025 }], min: null, max: null,
  })
  expect(() => parseFeeRules({ tiers: [{ up_to: null, rate: 0.01 }, { up_to: 1000, fixed: 10 }] })).toThrow(/dernier palier/)
  expect(() => parseFeeRules({ tiers: [{ up_to: 1000 }] })).toThrow(/fixe ou un pourcentage/)
  expect(() => parseFeeRules({ tiers: [{ up_to: 1000, fixed: 1, rate: 0.1 }] })).toThrow(/fixe ou un pourcentage/)
  expect(() => parseFeeRules({ tiers: [{ up_to: null, rate: 0.5 }] })).toThrow(/20 %/)
  expect(() => parseFeeRules({ tiers: [{ up_to: null, rate: 0.01 }], min: 3000, max: 2500 })).toThrow(/plancher/)
  expect(() => parseFeeRules('{abc')).toThrow(LeaserEditError)
})

const GRID = {
  bands: [{ amount_min: '500', amount_max: '2 500' }, { amount_min: '2500,01', amount_max: null }],
  rows: [{ duration_months: '36', coefficients: ['3,28', '3,24'] }, { duration_months: '24', coefficients: ['4,79', null] }],
}

test('barème : tableau → lignes, cases vides ignorées', () => {
  expect(parseGrid(GRID)).toEqual([
    { amount_min: 500, amount_max: 2500, duration_months: 24, coefficient_pct: 4.79 },
    { amount_min: 500, amount_max: 2500, duration_months: 36, coefficient_pct: 3.28 },
    { amount_min: 2500.01, amount_max: null, duration_months: 36, coefficient_pct: 3.24 },
  ])
})

test('barème : tranches qui se chevauchent, durée en double ou coefficient hors bornes refusés', () => {
  expect(() => parseGrid({ ...GRID, bands: [{ amount_min: '500', amount_max: '5000' }, { amount_min: '4000', amount_max: null }] })).toThrow(/chevauchent/)
  expect(() => parseGrid({ ...GRID, bands: [{ amount_min: '500', amount_max: null }, { amount_min: '4000', amount_max: null }] })).toThrow(/chevauchent/)
  expect(() => parseGrid({ ...GRID, bands: [{ amount_min: '500', amount_max: '400' }, GRID.bands[1]] })).toThrow(/maximum doit dépasser/)
  expect(() => parseGrid({ ...GRID, rows: [GRID.rows[0], { ...GRID.rows[0] }] })).toThrow(/en double/)
  expect(() => parseGrid({ ...GRID, rows: [{ duration_months: '36', coefficients: ['32', null] }] })).toThrow(/hors bornes/)
  expect(() => parseGrid({ ...GRID, rows: [{ duration_months: '36', coefficients: ['0', null] }] })).toThrow(/positif/)
  expect(() => parseGrid({ ...GRID, rows: [{ duration_months: '200', coefficients: ['3', null] }] })).toThrow(/Durée/)
  expect(() => parseGrid({ ...GRID, rows: [{ duration_months: '36', coefficients: ['3'] }] })).toThrow(/incohérent/)
})

test('éligibilité : statut vide ignoré, slugs contrôlés', () => {
  expect(parseEligibility([
    { equipment_family: 'informatique', equipment_type: null, status: 'yes', conditions: '' },
    { equipment_family: 'informatique', equipment_type: 'logiciels-licences', status: 'conditional', conditions: ' Part immatérielle ' },
    { equipment_family: 'medical', equipment_type: null, status: '', conditions: '' },
  ])).toEqual([
    { equipment_family: 'informatique', equipment_type: null, status: 'yes', conditions: null },
    { equipment_family: 'informatique', equipment_type: 'logiciels-licences', status: 'conditional', conditions: 'Part immatérielle' },
  ])
  expect(() => parseEligibility([{ equipment_family: 'cuisine', status: 'yes' }])).toThrow(/famille inconnue/)
  expect(() => parseEligibility([{ equipment_family: 'medical', equipment_type: 'logiciels-licences', status: 'yes' }])).toThrow(/type inconnu/)
  expect(() => parseEligibility([{ equipment_family: 'medical', status: 'peut-être' }])).toThrow(/statut/)
})

test('journal : seuls les champs modifiés, nombres lus en texte comparés comme nombres', () => {
  expect(changedFields({ min_amount: '500', name: 'Grenke', frais_dossier: null }, { min_amount: 500, name: 'Grenke SA', frais_dossier: null })).toEqual({
    before: { name: 'Grenke' }, after: { name: 'Grenke SA' },
  })
})
