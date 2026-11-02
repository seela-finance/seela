import { test, expect } from '@playwright/test'
import { adminEventRow } from '../../lib/admin-events'

const ADMIN = '11111111-1111-1111-1111-111111111111'

test('construit la ligne du journal avec des null par défaut', () => {
  expect(adminEventRow(ADMIN, { action: 'offer.validate', requestId: 'r1' })).toEqual({
    admin_id: ADMIN,
    action: 'offer.validate',
    request_id: 'r1',
    profile_id: null,
    leaser_id: null,
    before: null,
    after: null,
    note: null,
  })
})

test('garde avant / après et nettoie la note', () => {
  const row = adminEventRow(ADMIN, { action: ' request.update ', before: { status: 'submitted' }, after: { status: 'offers_available' }, note: '  relance  ' })
  expect(row.action).toBe('request.update')
  expect(row.before).toEqual({ status: 'submitted' })
  expect(row.after).toEqual({ status: 'offers_available' })
  expect(row.note).toBe('relance')
  expect(adminEventRow(ADMIN, { action: 'x', note: '   ' }).note).toBeNull()
})

test('refuse une action vide ou un admin inconnu', () => {
  expect(() => adminEventRow(ADMIN, { action: '  ' })).toThrow('action vide')
  expect(() => adminEventRow('', { action: 'x' })).toThrow('admin inconnu')
})
