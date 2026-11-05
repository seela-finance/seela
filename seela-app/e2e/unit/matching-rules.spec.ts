import { test, expect } from '@playwright/test'
import { leaserExclusions, pickRate, type MatchingCriteria, type MatchingLeaser, type MatchingRate } from '../../lib/matching-rules'

const rate = (over: Partial<MatchingRate> = {}): MatchingRate => ({
  duration_months: 36, equipment_category: null, financing_type: 'leasing', coefficient: 0.03, taux_nominal: 5, ...over,
})

const leaser = (over: Partial<MatchingLeaser> = {}): MatchingLeaser => ({
  id: 'l1',
  name: 'Financeur A',
  min_amount: 1000,
  max_amount: 500000,
  anciennete_min_mois: 0,
  periodicites: ['mensuelle'],
  score_seela_min: null,
  leaser_equipment_categories: [{ category: 'Informatique' }],
  leaser_financing_types: [{ financing_type: 'leasing' }],
  leaser_advantages: [],
  leaser_rates: [rate()],
  ...over,
})

const criteria = (over: Partial<MatchingCriteria> = {}): MatchingCriteria => ({
  amount: 12000, ageMonths: 48, score: 50, categories: ['Informatique'], financingType: 'leasing',
  periodicite: 'mensuelle', duration: 36, alreadyOffered: [], ...over,
})

test('un leaser qui correspond n’a aucune raison d’être écarté', () => {
  expect(leaserExclusions(leaser(), criteria())).toEqual([])
})

test('chaque critère non rempli donne sa raison', () => {
  const reasons = (l: Partial<MatchingLeaser>, c: Partial<MatchingCriteria> = {}) => leaserExclusions(leaser(l), criteria(c)).join()
  expect(reasons({}, { amount: 500 })).toMatch(/sous le minimum de 1\s000\s€/)
  expect(reasons({}, { amount: 600000 })).toMatch(/au-dessus du maximum de 500\s000\s€/)
  expect(reasons({ anciennete_min_mois: 60 })).toContain('Ancienneté 48 mois, minimum 60 mois')
  expect(reasons({ score_seela_min: 70 })).toContain('Score 50, minimum 70')
  expect(reasons({ leaser_equipment_categories: [{ category: 'BTP' }] })).toContain('Catégorie non couverte : Informatique')
  expect(reasons({ leaser_financing_types: [{ financing_type: 'leasing' }] }, { financingType: 'lease_back' })).toContain('Financement non couvert : lease-back')
  expect(reasons({}, { periodicite: 'trimestrielle' })).toContain('Périodicité non couverte : trimestrielle')
  expect(reasons({}, { duration: 60 })).toContain('Aucun taux pour 60 mois')
  expect(reasons({ min_amount: null })).toContain('à renseigner sur la fiche')
})

test('plusieurs raisons sont toutes listées', () => {
  expect(leaserExclusions(leaser({ anciennete_min_mois: 60 }), criteria({ amount: 500, duration: 60 }))).toHaveLength(3)
})

test('sans catégorie sur le dossier, la catégorie du leaser n’écarte personne', () => {
  expect(leaserExclusions(leaser({ leaser_equipment_categories: [] }), criteria({ categories: [] }))).toEqual([])
})

test('un leaser refusé ou déjà proposé n’est pas reproposé', () => {
  expect(leaserExclusions(leaser(), criteria({ alreadyOffered: ['Financeur A'] }))).toEqual(['Offre déjà faite sur ce dossier'])
})

test('le taux : durée exacte, puis catégorie, générique, autre catégorie', () => {
  const c = criteria()
  const generic = rate({ coefficient: 0.031 })
  const category = rate({ coefficient: 0.032, equipment_category: 'Informatique' })
  const other = rate({ coefficient: 0.033, equipment_category: 'BTP' })
  const otherDuration = rate({ coefficient: 0.04, duration_months: 24, equipment_category: 'Informatique' })

  expect(pickRate([other, generic, category, otherDuration], c)).toBe(category)
  expect(pickRate([other, generic, otherDuration], c)).toBe(generic)
  expect(pickRate([other, otherDuration], c)).toBe(other)
  expect(pickRate([otherDuration], c)).toBeNull()
})

test('le taux du type de financement du dossier passe avant la catégorie', () => {
  const leasing = rate({ coefficient: 0.03, equipment_category: 'Informatique', financing_type: 'leasing' })
  const leaseBack = rate({ coefficient: 0.035, financing_type: 'lease_back' })
  expect(pickRate([leasing, leaseBack], criteria({ financingType: 'lease_back' }))).toBe(leaseBack)
  // Grille sans taux pour ce type : on garde le taux disponible plutôt que d'écarter le leaser
  expect(pickRate([leasing], criteria({ financingType: 'lease_back' }))).toBe(leasing)
})
