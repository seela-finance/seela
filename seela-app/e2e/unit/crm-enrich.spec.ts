import { test, expect } from '@playwright/test'
import { bestPhone, pickEnrichable, toFullEnrichItem, type EnrichableContact } from '../../lib/crm-enrich'

const c = (id: string, p: Partial<EnrichableContact>): EnrichableContact =>
  ({ id, first_name: 'Marie', last_name: 'Dupont', phone: null, linkedin_url: null, company_domain: 'garage.fr', company_name: 'Garage', ...p })

test('on n’envoie que les contacts sans téléphone et identifiables', () => {
  const r = pickEnrichable([c('a', {}), c('b', { phone: '0612345678' }), c('c', { last_name: null, company_domain: null, company_name: null }), c('d', { first_name: null, linkedin_url: 'https://linkedin.com/in/x' })])
  expect(r.send.map(x => x.id)).toEqual(['a', 'd'])
  expect(r.unidentifiable).toBe(1)
  expect(toFullEnrichItem(c('a', {}))).toMatchObject({ first_name: 'Marie', domain: 'garage.fr', enrich_fields: ['contact.phones'], custom: { contact_id: 'a' } })
})

test('numéro retenu : mobile le plus probable, sinon un numéro actif', () => {
  expect(bestPhone({ contact_info: { most_probable_phone: { number: '+33 6 12 34 56 78' }, phones: [] } })).toBe('+33 6 12 34 56 78')
  expect(bestPhone({ contact_info: { most_probable_phone: null, phones: [{ number: '+33 1 00', line_status: 'INACTIVE' }, { number: '+33 2 35', line_status: 'ACTIVE' }] } })).toBe('+33 2 35')
  expect(bestPhone({ contact_info: null })).toBeNull()
})
