import { test, expect } from '@playwright/test'
import { attributedBatch, batchExport, buildBatchReports, batchCode, batchEntries, batchFieldsFrom, batchIncomplete, campaignVariables, leadInCampaign } from '../../lib/crm-batches'

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
    firstName: 'Paul', email: 'p@x.fr', companyName: 'Dupont', companySize: '51-200', companyDescription: 'Fondé en 2018', picture: 'https://…', summary: 'long',
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

test('entonnoir : Lemlist par campagne, appels et deals au dernier batch de la société avant l’événement', () => {
  const batch = (id: string, cam: string, created: string) => ({ id, code: null, campaign_name: id, lemlist_campaign_id: cam, created_at: created, segment: null, persona: null, source: null, angle: null, cta: null, hypothesis: null })
  const reports = buildBatchReports({
    batches: [batch('B01', 'cam_1', '2026-12-01T00:00:00Z'), batch('B04', 'cam_4', '2027-02-01T00:00:00Z')],
    leads: [
      { batch_id: 'B01', contact_id: 'p1', company_id: 'dupont', entered_at: '2026-12-01T10:00:00Z' },
      { batch_id: 'B01', contact_id: 'p2', company_id: 'martin', entered_at: '2026-12-01T10:00:00Z' },
      { batch_id: 'B04', contact_id: 'p1', company_id: 'dupont', entered_at: '2027-02-15T10:00:00Z' },
    ],
    lemlist: [
      { event: 'emailsSent', contact_id: 'p1', company_id: 'dupont', campaign_id: 'cam_1', body: null },
      { event: 'emailsSent', contact_id: 'p1', company_id: 'dupont', campaign_id: 'cam_1', body: null },
      { event: 'emailsSent', contact_id: 'p2', company_id: 'martin', campaign_id: 'cam_1', body: null },
      { event: 'emailsReplied', contact_id: 'p2', company_id: 'martin', campaign_id: 'cam_1', body: 'Pas maintenant, rappelez en mars' },
      { event: 'emailsSent', contact_id: 'p1', company_id: 'dupont', campaign_id: 'cam_4', body: null },
      { event: 'emailsInterested', contact_id: 'p1', company_id: 'dupont', campaign_id: 'cam_4', body: null },
    ],
    calls: [
      { company_id: 'dupont', call_outcome: 'messagerie', body: null, occurred_at: '2026-12-05T10:00:00Z' },
      { company_id: 'dupont', call_outcome: 'rdv_pris', body: 'Besoin d’un four', occurred_at: '2027-02-20T10:00:00Z' },
      { company_id: 'martin', call_outcome: 'pas_interesse', body: null, occurred_at: '2026-12-06T10:00:00Z' },
      { company_id: 'inconnue', call_outcome: 'rdv_pris', body: null, occurred_at: '2026-12-06T10:00:00Z' },
    ],
    deals: [
      { company_id: 'dupont', name: 'Four', stage: 'won', amount: '40000', created_at: '2027-03-10T00:00:00Z' },
      { company_id: 'martin', name: 'Pétrin', stage: 'interested', amount: null, created_at: '2026-12-10T00:00:00Z' },
    ],
    companyNames: new Map([['dupont', 'Boulangerie Dupont'], ['martin', 'Fournil Martin']]),
  })
  const b1 = reports.find(r => r.id === 'B01')!
  const b4 = reports.find(r => r.id === 'B04')!
  expect(reports[0].id).toBe('B04')
  expect(b1).toMatchObject({ leads: 2, companies: 2, funnel: { sent: 2, replied: 1, positive: 0, calls: 2, connected: 1, rdv: 0, deals: 1, deals_qualified: 0, won_count: 0, won_amount: 0 } })
  expect(b1.replies).toEqual([{ company: 'Fournil Martin', text: 'Pas maintenant, rappelez en mars' }])
  expect(b4).toMatchObject({ leads: 1, funnel: { sent: 1, positive: 1, calls: 1, connected: 1, rdv: 1, deals: 1, deals_qualified: 1, won_count: 1, won_amount: 40000 } })
  expect(b4.call_notes).toEqual([{ company: 'Boulangerie Dupont', outcome: 'rdv_pris', text: 'Besoin d’un four' }])

  const out = batchExport(reports, new Date('2027-04-01T00:00:00Z'))
  expect(out.generated_at).toBe('2027-04-01T00:00:00.000Z')
  expect(Object.keys(out.batches[0])).toEqual(['code', 'campaign_name', 'lemlist_campaign_id', 'segment', 'persona', 'source', 'angle', 'cta', 'hypothesis', 'started_at', 'leads', 'companies', 'funnel', 'deals', 'replies', 'call_notes'])
})
