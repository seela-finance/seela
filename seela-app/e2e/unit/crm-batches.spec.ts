import { test, expect } from '@playwright/test'
import { attributedBatch, batchCode, batchEntries, batchFieldsFrom, batchIncomplete, campaignVariables, leadInCampaign } from '../../lib/crm-batches'

test('numéro de batch lu en tête du nom de campagne', () => {
  expect(batchCode('B05 · Boulangeries IDF · Google Maps')).toBe('B05')
  expect(batchCode('b5 - BTP')).toBe('B05')
  expect(batchCode('B112 Santé')).toBe('B112')
  expect(batchCode('EVL | C BTP | Direction')).toBeNull()
  expect(batchCode('Boulangeries')).toBeNull()
  expect(batchCode(null)).toBeNull()
})

test('variables copiées : textes de campagne en entier, sans les champs standard', () => {
  const vars = campaignVariables({
    firstName: 'Paul', email: 'p@x.fr', companyName: 'Dupont', picture: 'https://…', summary: 'long',
    icebreaker: ' Bravo pour l’ouverture du 2e site ', ctaB: 'Est-ce que je peux vous appeler 10 minutes cette semaine ?', vide: '  ', n: 3,
  })
  expect(vars).toEqual({ icebreaker: 'Bravo pour l’ouverture du 2e site', ctaB: 'Est-ce que je peux vous appeler 10 minutes cette semaine ?', n: '3' })
  expect(campaignVariables(null)).toEqual({})
})

test('champs du batch remplis depuis les variables (alias Lemlist existants acceptés)', () => {
  expect(batchFieldsFrom({ secteur: 'BTP', sourceListe: 'Pharow', angle: 'Trésorerie', ctaB: 'Appel 10 min ?', Persona: 'Direction' })).toEqual({
    segment: 'BTP', persona: 'Direction', source: 'Pharow', angle: 'Trésorerie', cta: 'Appel 10 min ?', hypothesis: null,
  })
  expect(batchFieldsFrom({ segment: 'Boulangeries IDF', secteur: 'Alimentaire' }).segment).toBe('Boulangeries IDF')
  expect(batchIncomplete(batchFieldsFrom({ segment: 'A', angle: 'B' }))).toBe(true)
  expect(batchIncomplete({ segment: 'A', angle: 'B', cta: 'C' })).toBe(false)
})

test('une entrée par campagne et contact, datée du premier événement ; événements sans campagne ignorés', () => {
  const base = { campaignName: 'B01', contactId: 'c1', companyId: 'co1', email: 'a@x.fr', leadId: 'lea_1' }
  const entries = batchEntries([
    { ...base, campaignId: 'cam_1', at: '2026-12-03T10:00:00Z' },
    { ...base, campaignId: 'cam_1', at: '2026-12-01T10:00:00Z' },
    { ...base, campaignId: 'cam_2', at: '2026-12-05T10:00:00Z', campaignName: 'B02' },
    { ...base, campaignId: null, at: '2026-11-01T10:00:00Z' },
  ])
  expect(entries).toHaveLength(2)
  expect(entries.find(e => e.campaignId === 'cam_1')).toMatchObject({ at: '2026-12-01T10:00:00Z', campaignName: 'B01', leadId: 'lea_1' })
})

test('réponse Lemlist : le lead de la bonne campagne', () => {
  const payload = [
    { _id: 'lea_a', campaign: { id: 'cam_1' }, variables: { icebreaker: 'A' } },
    { _id: 'lea_b', campaign: { id: 'cam_2' }, variables: { icebreaker: 'B' } },
  ]
  expect(leadInCampaign(payload, 'cam_2')).toEqual({ id: 'lea_b', variables: { icebreaker: 'B' } })
  expect(leadInCampaign({ _id: 'lea_c', campaignId: 'cam_3', variables: {} }, 'cam_3')?.id).toBe('lea_c')
  expect(leadInCampaign(payload, 'cam_9')).toBeNull()
  expect(leadInCampaign(null, 'cam_1')).toBeNull()
})

test('crédit du deal : dernier batch de la société avant la création du deal', () => {
  const entries = [
    { batch: 'B01', entered_at: '2026-12-01T10:00:00Z' },
    { batch: 'B04', entered_at: '2027-02-15T10:00:00Z' },
    { batch: 'B08', entered_at: '2027-04-01T10:00:00Z' },
  ]
  expect(attributedBatch('2027-03-10T09:00:00Z', entries)?.batch).toBe('B04')
  expect(attributedBatch('2026-12-01T10:00:00Z', entries)?.batch).toBe('B01')
  expect(attributedBatch('2026-11-01T10:00:00Z', entries)).toBeNull()
  expect(attributedBatch('2027-03-10T09:00:00Z', [])).toBeNull()
})
