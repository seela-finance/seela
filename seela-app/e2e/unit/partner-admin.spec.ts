import { test, expect } from '@playwright/test'
import { summarizePartners } from '../../lib/partner-admin'

test('onglet Partenaires : comptes, dossiers, attente client, contrats et volumes par distributeur', () => {
  const rows = summarizePartners(
    [
      { id: 'p1', name: 'BoucheCousue', siren: '518981030', created_at: '2026-11-18' },
      { id: 'p2', name: 'Autre', siren: null, created_at: '2026-11-18' },
    ],
    [
      { partner_company_id: 'p1', status: 'offers_available', total_amount: '122652', client_joined_at: null, created_at: '2026-11-18T10:00:00Z' },
      { partner_company_id: 'p1', status: 'active', total_amount: 12000, client_joined_at: '2026-11-10', created_at: '2026-11-09T10:00:00Z' },
      { partner_company_id: 'p1', status: 'refused', total_amount: 5000, client_joined_at: null, created_at: '2026-11-08T10:00:00Z' },
      { partner_company_id: 'p1', status: 'draft', total_amount: null, client_joined_at: null, created_at: '2026-11-19T10:00:00Z' },
      { partner_company_id: 'autre', status: 'active', total_amount: 99999, client_joined_at: 'x', created_at: '2026-11-18T10:00:00Z' },
    ],
    [{ company_id: 'p1', user_id: 'u1' }, { company_id: 'p1', user_id: null }, { company_id: 'p2', user_id: 'u2' }],
  )
  expect(rows[0]).toEqual({
    id: 'p1', name: 'BoucheCousue', siren: '518981030', accounts: 1, requests: 3, awaitingClient: 1, activeContracts: 1,
    volume: 134652, financed: 12000, lastRequestAt: '2026-11-18T10:00:00Z',
  })
  // Sans dossier : en dernier, tout à zéro
  expect(rows[1]).toMatchObject({ id: 'p2', accounts: 1, requests: 0, volume: 0, lastRequestAt: null })
})
