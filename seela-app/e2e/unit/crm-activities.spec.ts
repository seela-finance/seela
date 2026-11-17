import { test, expect } from '@playwright/test'
import { CrmError } from '../../lib/crm-companies'
import { buildTimeline, daysUntil, parseActivityInput, parseCompanyPatch, parseContactInput, parseTaskInput } from '../../lib/crm-activities'

const team = ['u-louis', 'u-lorenzo']

test('propriétés : nom requis, propriétaire limité à l’équipe, année plausible', () => {
  const p = parseCompanyPatch({ name: 'Garage', siren: '987654321', domain: 'https://garage.fr', owner_id: 'u-intrus', creation_year: '2012', lifecycle_stage: 'client' }, team)
  expect(p).toMatchObject({ name: 'Garage', domain: 'garage.fr', owner_id: null, creation_year: 2012, lifecycle_stage: 'client' })
  expect(() => parseCompanyPatch({ name: '' }, team)).toThrow(CrmError)
  expect(() => parseCompanyPatch({ name: 'X', creation_year: '12' }, team)).toThrow('Année')
})

test('contact : au moins un nom ou un email, email valide et en minuscules', () => {
  expect(parseContactInput({ first_name: 'Marie', email: 'Marie@Dupont.FR', persona: 'DAF' })).toMatchObject({ first_name: 'Marie', email: 'marie@dupont.fr', persona: 'DAF' })
  expect(() => parseContactInput({})).toThrow(CrmError)
  expect(() => parseContactInput({ email: 'pas-un-email' })).toThrow('email')
})

test('activité : un appel exige une issue, les mentions et contacts sont filtrés', () => {
  expect(() => parseActivityInput({ type: 'call', call_outcome: '', body: '', contact_id: '', mentions: [] }, team, [])).toThrow('issue')
  expect(() => parseActivityInput({ type: 'note', call_outcome: '', body: ' ', contact_id: '', mentions: [] }, team, [])).toThrow(CrmError)
  const a = parseActivityInput({ type: 'call', call_outcome: 'rdv_pris', body: '', contact_id: 'p-x', mentions: ['u-louis', 'u-louis', 'u-intrus'] }, team, ['p-1'])
  expect(a).toEqual({ type: 'call', call_outcome: 'rdv_pris', body: '', contact_id: null, mentions: ['u-louis'], exit_reason: null })
  expect(() => parseActivityInput({ type: 'call', call_outcome: 'societe_disqualifiee', body: '', contact_id: '', mentions: [] }, team, [])).toThrow('disqualifiée')
  expect(parseActivityInput({ type: 'call', call_outcome: 'societe_disqualifiee', body: '', contact_id: '', mentions: [], exit_reason: 'Pas de besoin' }, team, []).exit_reason).toBe('Pas de besoin')
  expect(parseActivityInput({ type: 'note', call_outcome: 'rdv_pris', body: 'ok', contact_id: 'p-1', mentions: [] }, team, ['p-1']).call_outcome).toBeNull()
})

test('tâche : intitulé requis, priorité par défaut normale', () => {
  expect(parseTaskInput({ title: 'Rappeler', due_date: '2026-11-20' }, team)).toEqual({ title: 'Rappeler', due_date: '2026-11-20', priority: 'normale', assignee_id: null })
  expect(() => parseTaskInput({ title: '' }, team)).toThrow(CrmError)
  expect(() => parseTaskInput({ title: 'x', due_date: '20/11' }, team)).toThrow('Date')
  expect(daysUntil('2026-11-15', '2026-11-17')).toBe(-2)
  expect(daysUntil(null, '2026-11-17')).toBeNull()
})

test('chronologie : activités et journal admin mélangés, du plus récent au plus ancien', () => {
  const t = buildTimeline(
    [{ id: 'a1', type: 'call', call_outcome: 'interesse', body: null, occurred_at: '2026-11-15T10:00:00Z', author_id: 'u-lorenzo', contact_id: null, crm_mentions: [{ user_id: 'u-louis' }] }],
    [{ id: 'e1', admin_id: 'u-louis', action: 'Dossier transmis', note: null, created_at: '2026-11-16T10:00:00Z' }],
  )
  expect(t.map(x => x.id)).toEqual(['e1', 'a1'])
  expect(t[1]).toMatchObject({ label: 'Appel', outcome: 'interesse', mentions: ['u-louis'] })
})
