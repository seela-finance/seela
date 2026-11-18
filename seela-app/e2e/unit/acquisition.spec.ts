import { test, expect } from '@playwright/test'
import { channelOf, parsePeriod, periodStart, summarizeAcquisition, totalRow, type AcquisitionCompany } from '../../lib/acquisition'

const co = (id: string, over: Partial<AcquisitionCompany> = {}): AcquisitionCompany => ({
  id, source: null, lead_channel: null, attribution_channel: null, partner_enabled: false, created_at: '2026-11-10T00:00:00Z', ...over,
})

test('canal : attribution d’abord, sinon origine CRM ; la campagne est séparée', () => {
  expect(channelOf(co('a', { attribution_channel: 'Lemlist · chr-novembre' }))).toEqual({ channel: 'Lemlist', campaign: 'chr-novembre' })
  expect(channelOf(co('a', { attribution_channel: 'Google (naturel)' }))).toEqual({ channel: 'Google (naturel)', campaign: null })
  expect(channelOf(co('a', { source: 'Partenaire distributeur' })).channel).toBe('Partenaire distributeur')
  expect(channelOf(co('a', { source: 'Lemlist' })).channel).toBe('Prospection outbound')
  expect(channelOf(co('a', { lead_channel: 'outbound' })).channel).toBe('Prospection outbound')
  expect(channelOf(co('a', { source: 'Inscription app' })).channel).toBe('Non renseigné')
})

test('indicateurs par canal, campagnes, exclusions et total', () => {
  const rows = summarizeAcquisition(
    [
      co('g1', { attribution_channel: 'Google (naturel)' }),
      co('g2', { attribution_channel: 'Google (naturel)' }),
      co('l1', { attribution_channel: 'Lemlist · chr-novembre' }),
      co('l2', { attribution_channel: 'Lemlist · it-decembre' }),
      co('old', { attribution_channel: 'Google (naturel)', created_at: '2026-01-01T00:00:00Z' }),
      co('n1'),
      co('partner', { partner_enabled: true }),
      co('test', { source: 'E2E' }),
    ],
    [
      { company_id: 'g1', status: 'active', total_amount: '12000' },
      { company_id: 'g1', status: 'offers_available', total_amount: 5000 },
      { company_id: 'g2', status: 'seela_validated', total_amount: 8000 },
      { company_id: 'l1', status: 'draft', total_amount: null },
      { company_id: 'old', status: 'active', total_amount: 99999 },
    ],
    '2026-11-01T00:00:00Z',
  )
  expect(rows.map(r => r.channel)).toEqual(['Google (naturel)', 'Lemlist', 'Non renseigné'])
  expect(rows[0]).toMatchObject({ leads: 2, withRequest: 2, requests: 3, transmitted: 2, accepted: 1, financed: 12000, clients: 1, conversion: 50 })
  expect(rows[1]).toMatchObject({ leads: 2, requests: 0, conversion: 0 })
  expect(rows[1].campaigns.map(c => c.channel).sort()).toEqual(['chr-novembre', 'it-decembre'])
  expect(totalRow(rows)).toMatchObject({ leads: 5, requests: 3, accepted: 1, financed: 12000, clients: 1, conversion: 20 })
  // Un petit taux ne disparaît pas à l'arrondi : 1 client sur 289 → 0,3 %
  const many = summarizeAcquisition(Array.from({ length: 289 }, (_, i) => co(`c${i}`)), [{ company_id: 'c0', status: 'active', total_amount: 1 }], null)
  expect(totalRow(many).conversion).toBe(0.3)
})

test('période : valeur inconnue → 3 mois ; « tout » sans date de début', () => {
  expect(parsePeriod('n-importe')).toBe('90')
  expect(parsePeriod('30')).toBe('30')
  expect(periodStart('tout')).toBeNull()
  expect(periodStart('30', new Date('2026-11-18T00:00:00Z'))).toBe('2026-10-19T00:00:00.000Z')
})
