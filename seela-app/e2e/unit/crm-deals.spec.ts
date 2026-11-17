import { test, expect } from '@playwright/test'
import { CrmError } from '../../lib/crm-companies'
import { buildPipeline, groupTasks, listContacts, parseContactPatch, parseDealInput, type ContactRow, type DealRow } from '../../lib/crm-deals'

const team = ['u-louis', 'u-lorenzo']

test('deal : nom et société requis, montant en euros, étape par défaut', () => {
  expect(parseDealInput({ name: 'Parc IT', company_id: 'c1', amount: '12 500,50', owner_id: 'u-intrus' }, team, ['c1']))
    .toEqual({ name: 'Parc IT', company_id: 'c1', stage: 'a_contacter', amount: 12500.5, next_action: null, next_action_date: null, owner_id: null })
  expect(() => parseDealInput({ name: '', company_id: 'c1' }, team, ['c1'])).toThrow(CrmError)
  expect(() => parseDealInput({ name: 'x', company_id: 'c2' }, team, ['c1'])).toThrow('société')
  expect(() => parseDealInput({ name: 'x', company_id: 'c1', amount: '-3' }, team, ['c1'])).toThrow('montant')
})

test('pipeline : une colonne par étape, totaux, filtre « mes deals »', () => {
  const d = (id: string, stage: string, amount: number | null, owner: string, at: string): DealRow =>
    ({ id, name: id, stage, amount, next_action: null, next_action_date: null, owner_id: owner, company_id: 'c', updated_at: at, companies: null })
  const deals = [d('a', 'rdv_pris', 1000, 'u-louis', '2026-11-01'), d('b', 'rdv_pris', 500, 'u-lorenzo', '2026-11-10'), d('c', 'bizarre', null, 'u-louis', '2026-11-02')]
  const cols = buildPipeline(deals, { mine: false, me: 'u-lorenzo' })
  expect(cols).toHaveLength(7)
  expect(cols.find(c => c.stage === 'rdv_pris')).toMatchObject({ total: 1500 })
  expect(cols.find(c => c.stage === 'rdv_pris')!.deals.map(x => x.id)).toEqual(['b', 'a'])
  expect(cols[0].deals.map(x => x.id)).toEqual(['c'])
  expect(buildPipeline(deals, { mine: true, me: 'u-lorenzo' }).flatMap(c => c.deals).map(x => x.id)).toEqual(['b'])
})

test('contacts : vues, recherche sans accents, y compris sur la société', () => {
  const c = (id: string, patch: Partial<ContactRow>): ContactRow => ({
    id, first_name: null, last_name: null, email: null, phone: null, job_title: null, persona: null, user_id: null,
    owner_id: null, company_id: null, created_at: '2026-11-01', companies: null, ...patch,
  })
  const all = [c('1', { first_name: 'Hélène', company_id: 'x', companies: { name: 'Garage Martin' }, owner_id: 'me' }), c('2', { email: 'a@b.fr', user_id: 'u' })]
  const r = listContacts(all, 'tous', 'helene', 'me')
  expect(r.items.map(x => x.id)).toEqual(['1'])
  expect(listContacts(all, 'tous', 'garage', 'me').items).toHaveLength(1)
  expect(r.counts).toEqual({ tous: 2, miens: 1, acces_app: 1, sans_societe: 1 })
})

test('fiche contact : LinkedIn en lien complet, société et propriétaire filtrés', () => {
  expect(parseContactPatch({ first_name: 'Marie', company_id: 'c9', owner_id: 'u-louis', persona: 'DAF' }, team, ['c1']))
    .toMatchObject({ first_name: 'Marie', company_id: null, owner_id: 'u-louis', persona: 'DAF' })
  expect(() => parseContactPatch({ first_name: 'M', linkedin_url: 'linkedin.com/in/x' }, team, [])).toThrow('LinkedIn')
})

test('mes tâches : en retard, aujourd’hui, à venir, sans échéance', () => {
  const g = groupTasks([{ due_date: '2026-11-20' }, { due_date: null }, { due_date: '2026-11-17' }, { due_date: '2026-11-01' }], '2026-11-17')
  expect(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.length]))).toEqual({ retard: 1, aujourdhui: 1, a_venir: 1, sans_date: 1 })
})
