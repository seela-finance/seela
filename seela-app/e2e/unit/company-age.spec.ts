import { test, expect } from '@playwright/test'
import { companyAgeMonths } from '../../lib/company-age'

const NOW = new Date('2026-11-03T12:00:00Z')

test('ancienneté : borne basse à partir de l’année de création', () => {
  // Créée en 2026 : au pire le 31 décembre → 0 mois
  expect(companyAgeMonths({ date_creation: 2026 }, NOW)).toBe(0)
  // Créée en 2025 : au moins 11 mois en novembre 2026
  expect(companyAgeMonths({ date_creation: 2025 }, NOW)).toBe(11)
  expect(companyAgeMonths({ date_creation: 2019 }, NOW)).toBe(83)
})

test('ancienneté : ancienne tranche en secours, sinon 0 (jamais supposée)', () => {
  expect(companyAgeMonths({ date_creation: null, age_bracket: '> 5 ans' }, NOW)).toBe(60)
  expect(companyAgeMonths({ date_creation: null, age_bracket: '2 – 5 ans' }, NOW)).toBe(24)
  expect(companyAgeMonths({ date_creation: null, age_bracket: null }, NOW)).toBe(0)
  expect(companyAgeMonths(null, NOW)).toBe(0)
  // Année incohérente (future ou absurde) : ignorée
  expect(companyAgeMonths({ date_creation: 2030 }, NOW)).toBe(0)
  expect(companyAgeMonths({ date_creation: 12 }, NOW)).toBe(0)
})
