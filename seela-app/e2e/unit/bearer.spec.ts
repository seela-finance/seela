import { test, expect } from '@playwright/test'
import { bearerMatches } from '../../lib/bearer'

test('clé de lecture : seule la clé exacte passe', () => {
  expect(bearerMatches('Bearer s3cret', 's3cret')).toBe(true)
  expect(bearerMatches('Bearer s3cre', 's3cret')).toBe(false)
  expect(bearerMatches('bearer s3cret', 's3cret')).toBe(false)
  expect(bearerMatches(null, 's3cret')).toBe(false)
  expect(bearerMatches('Bearer ', '')).toBe(false)
  expect(bearerMatches('Bearer undefined', undefined)).toBe(false)
})
