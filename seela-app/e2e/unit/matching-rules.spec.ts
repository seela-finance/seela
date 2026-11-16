import { test, expect } from '@playwright/test'
import { equipmentOf, lineFamily, matchLeaser, type MatchingCriteria, type MatchingLeaser } from '../../lib/matching-rules'
import { estimateOptions } from '../../lib/estimates'
import type { GridRow } from '../../lib/leaser-pricing'

const row = (over: Partial<GridRow> = {}): GridRow => ({
  amount_min: 500, amount_max: 350000, duration_months: 36, coefficient_pct: 3.23, equipment_family: null, financing_type: null, ...over,
})

const leaser = (over: Partial<MatchingLeaser> = {}): MatchingLeaser => ({
  id: 'l1', name: 'Grenke', is_active: true, min_amount: 500, max_amount: 350000, rent_timing: null, residual_value_pct: null,
  commission_included_pct: 2, markup_pct: 0, client_fee_rules: null, financing_types: ['leasing', 'lease_back'],
  grid: [row(), row({ duration_months: 60, coefficient_pct: 2.07 })],
  eligibility: [
    { equipment_family: 'informatique', equipment_type: null, status: 'yes', conditions: null },
    { equipment_family: 'chr', equipment_type: null, status: 'yes', conditions: null },
    { equipment_family: 'vehicules', equipment_type: null, status: 'no', conditions: 'Véhicules immatriculés exclus' },
  ],
  anciennete_min_mois: 0, periodicites: null, score_seela_min: null, advantages: [],
  ...over,
})

const criteria = (over: Partial<MatchingCriteria> = {}): MatchingCriteria => ({
  amount: 20000, ageMonths: 48, score: 50, mainEquipment: 'postes-serveurs', families: ['informatique'],
  financingType: 'leasing', periodicite: 'mensuelle', duration: 36, alreadyOffered: [], ...over,
})

test('un leaser qui correspond propose le loyer de son barème', () => {
  const { reasons, simulation } = matchLeaser(leaser(), criteria())
  expect(reasons).toEqual([])
  expect(simulation.monthly).toBe(646) // 20 000 € × 3,23 %
  expect(simulation.row?.coefficient_pct).toBe(3.23)
})

test('chaque critère non rempli donne sa raison', () => {
  const reasons = (l: Partial<MatchingLeaser>, c: Partial<MatchingCriteria> = {}) => matchLeaser(leaser(l), criteria(c)).reasons.join(' | ')
  expect(reasons({}, { amount: 400 })).toMatch(/sous le minimum de 500/)
  expect(reasons({ anciennete_min_mois: 60 })).toContain('Ancienneté 48 mois, minimum 60 mois')
  expect(reasons({ anciennete_min_mois: null })).toContain('Ancienneté minimale à renseigner')
  expect(reasons({ score_seela_min: 70 })).toContain('Score 50, minimum 70')
  expect(reasons({}, { periodicite: 'trimestrielle' })).toContain('Périodicité non couverte : trimestrielle')
  expect(reasons({}, { duration: 48 })).toContain('Durée de 48 mois absente du barème')
  expect(reasons({}, { mainEquipment: 'vehicules-immatricules', families: ['vehicules'] })).toMatch(/Matériel exclu/)
  expect(reasons({}, { financingType: 'credit_bail' })).toMatch(/crédit-bail/)
  expect(reasons({ max_amount: null })).toContain('Montants min. et max. à renseigner sur la fiche')
})

test('une famille secondaire exclue ou non renseignée écarte aussi le leaser', () => {
  expect(matchLeaser(leaser(), criteria({ families: ['informatique', 'vehicules'] })).reasons).toContain('Matériel exclu : Véhicules')
  expect(matchLeaser(leaser(), criteria({ families: ['informatique', 'medical'] })).reasons).toContain('Éligibilité non renseignée : Médical & santé')
  expect(matchLeaser(leaser(), criteria({ families: ['informatique', 'chr'] })).reasons).toEqual([])
})

test('un leaser déjà proposé sur le dossier n’est pas reproposé', () => {
  expect(matchLeaser(leaser(), criteria({ alreadyOffered: ['Grenke'] })).reasons).toEqual(['Offre déjà faite sur ce dossier'])
})

test('matériel du dossier : la ligne au plus gros montant fixe le barème ; anciennes catégories reprises', () => {
  const lines = [
    { total_price: 2000, category: 'Informatique', equipment_family: null, equipment_type: null },
    { total_price: 10000, category: null, equipment_family: 'chr', equipment_type: 'cuisine-pro' },
    { total_price: 500, category: 'Autre', equipment_family: null, equipment_type: null },
  ]
  expect(equipmentOf(lines)).toEqual({ mainEquipment: 'cuisine-pro', families: ['informatique', 'chr'] })
  expect(lineFamily({ total_price: 1, category: 'Véhicule', equipment_family: null, equipment_type: null })).toBe('vehicules')
  expect(equipmentOf([])).toEqual({ mainEquipment: null, families: [] })
})

test('estimation client : meilleur loyer par durée couverte, sans nom de leaser', () => {
  const cheaper = leaser({ id: 'l2', name: 'B', grid: [row({ coefficient_pct: 3.1 })] })
  const options = estimateOptions([leaser(), cheaper], { amount: 20000, equipment: 'postes-serveurs', financingType: 'leasing' })
  expect(options).toEqual([{ months: 36, monthly: 620 }, { months: 60, monthly: 414 }])
  expect(JSON.stringify(options)).not.toMatch(/Grenke|"B"/)
})

test('estimation client : rien si aucun leaser ne finance ce montant ou ce matériel', () => {
  expect(estimateOptions([leaser()], { amount: 400, equipment: null, financingType: 'leasing' })).toEqual([])
  expect(estimateOptions([leaser()], { amount: 20000, equipment: 'vehicules-immatricules', financingType: 'leasing' })).toEqual([])
  expect(estimateOptions([leaser()], { amount: 0, equipment: null, financingType: 'leasing' })).toEqual([])
})
