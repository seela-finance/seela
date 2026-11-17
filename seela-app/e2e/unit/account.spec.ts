import { test, expect } from '@playwright/test'
import { decideCompany } from '../../lib/account'

test('onboarding : nouveau SIREN → société créée avec son SIREN', () => {
  expect(decideCompany(null, null)).toEqual({ kind: 'create', setSiren: true, flagged: false })
  expect(decideCompany('c1', null)).toEqual({ kind: 'update', companyId: 'c1', setSiren: true, flagged: false })
})

test('onboarding : prospect du CRM sans compte → le client le rejoint', () => {
  expect(decideCompany(null, { id: 'prospect', hasOtherUser: false })).toEqual({ kind: 'update', companyId: 'prospect', setSiren: true, flagged: false })
})

test('onboarding : SIREN d’une société où travaille un autre compte → jamais rattaché, signalé à l’équipe', () => {
  expect(decideCompany(null, { id: 'autre', hasOtherUser: true })).toEqual({ kind: 'create', setSiren: false, flagged: true })
  expect(decideCompany('c1', { id: 'autre', hasOtherUser: true })).toEqual({ kind: 'update', companyId: 'c1', setSiren: false, flagged: true })
  expect(decideCompany('autre', { id: 'autre', hasOtherUser: true })).toEqual({ kind: 'update', companyId: 'autre', setSiren: true, flagged: false })
})
