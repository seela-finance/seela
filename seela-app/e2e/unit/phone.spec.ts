import { test, expect } from '@playwright/test'
import { formatPhone, toE164 } from '../../lib/phone'

test('numéros français et étrangers au format international, numéros inexploitables refusés', () => {
  expect(toE164('06 12 34 56 78')).toBe('+33612345678')
  expect(toE164('+33 (0)6 12 34 56 78')).toBe('+33612345678')
  expect(toE164('0033 1.23.45.67.89')).toBe('+33123456789')
  expect(toE164('+32 470 12 34 56')).toBe('+32470123456')
  expect(toE164('12')).toBeNull()
  expect(toE164('')).toBeNull()
  expect(formatPhone('+33612345678')).toBe('+33 6 12 34 56 78')
  expect(formatPhone('+32470123456')).toBe('+32470123456')
})
