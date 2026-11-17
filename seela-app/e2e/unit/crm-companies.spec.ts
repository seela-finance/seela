import { test, expect } from '@playwright/test'
import {
  CrmError, findDuplicate, listCrmCompanies, matchesQuery, normalizeDomain, parseCompanyInput, parseCompanyListParams,
  toCrmCompany, type CrmCompany,
} from '../../lib/crm-companies'

const company = (patch: Partial<CrmCompany> = {}): CrmCompany => ({
  id: 'c1', name: 'Boulangerie Dupont', siren: '123456789', domain: 'boulangerie-dupont.fr', stage: 'prospect',
  sector: null, ownerId: 'me', contactCount: 0, requestCount: 0, createdAt: '2026-11-16T10:00:00Z', ...patch,
})

test('normalizeDomain accepte une URL, un email ou un domaine nu', () => {
  expect(normalizeDomain('https://www.Exemple.fr/contact')).toBe('exemple.fr')
  expect(normalizeDomain('jean@exemple.fr')).toBe('exemple.fr')
  expect(normalizeDomain('exemple.fr')).toBe('exemple.fr')
  expect(normalizeDomain('pas un domaine')).toBeNull()
  expect(normalizeDomain('')).toBeNull()
})

test('parseCompanyInput exige un nom, un SIREN à 9 chiffres et refuse les messageries', () => {
  const base = { name: ' Garage Martin ', siren: '987 654 321', domain: 'www.garage-martin.fr', sector: 'Autre', stage: 'client' }
  expect(parseCompanyInput(base)).toEqual({ name: 'Garage Martin', siren: '987654321', domain: 'garage-martin.fr', sector: 'Autre', stage: 'client' })
  expect(() => parseCompanyInput({ ...base, name: '  ' })).toThrow(CrmError)
  expect(() => parseCompanyInput({ ...base, siren: '1234' })).toThrow('9 chiffres')
  expect(() => parseCompanyInput({ ...base, domain: 'gmail.com' })).toThrow('messagerie')
  expect(parseCompanyInput({ ...base, siren: '', domain: '', sector: 'inconnu', stage: 'bidon' })).toMatchObject({ siren: null, domain: null, sector: null, stage: 'prospect' })
})

test('findDuplicate : le SIREN prime sur le domaine', () => {
  const existing = [company(), company({ id: 'c2', name: 'Dupont Traiteur', siren: '111222333', domain: 'dupont.fr' })]
  expect(findDuplicate({ siren: '123456789', domain: 'dupont.fr' }, existing)).toEqual({ kind: 'siren', company: existing[0] })
  expect(findDuplicate({ siren: null, domain: 'dupont.fr' }, existing)?.kind).toBe('domain')
  expect(findDuplicate({ siren: '999999999', domain: null }, existing)).toBeNull()
})

test('liste : vues, recherche sans accents, compteurs', () => {
  const all = [
    company(),
    company({ id: 'c2', name: 'Épicerie Roux', siren: null, domain: null, stage: 'client', ownerId: 'other', createdAt: '2026-11-17T10:00:00Z' }),
  ]
  expect(matchesQuery(all[1], 'epicerie')).toBe(true)
  expect(matchesQuery(all[0], '123 456')).toBe(true)
  const res = listCrmCompanies(all, parseCompanyListParams({ vue: 'miennes' }), 'me')
  expect(res.items.map(c => c.id)).toEqual(['c1'])
  expect(res.counts).toMatchObject({ toutes: 2, miennes: 1, client: 1, prospect: 1 })
  expect(listCrmCompanies(all, parseCompanyListParams({}), 'me').items[0].id).toBe('c2')
})

test('toCrmCompany ne compte pas les brouillons et corrige un statut inconnu', () => {
  const c = toCrmCompany({
    id: 'c1', name: 'X', siren: null, domain: null, lifecycle_stage: '???', sector: null, owner_id: null, created_at: '2026-11-16',
    contacts: [{ id: 'p1' }], financing_requests: [{ id: 'r1', status: 'draft' }, { id: 'r2', status: 'submitted' }],
  })
  expect(c).toMatchObject({ stage: 'prospect', contactCount: 1, requestCount: 1 })
})
