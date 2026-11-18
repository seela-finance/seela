import { test, expect } from '@playwright/test'
import { buildCallList, contactReaction, forward, orderForSession, lemlistEntry, sequenceProgress, statusAfterCall, type CallCandidate } from '../../lib/crm-prepipe'

test('issues d’appel : contact pas intéressé garde la société (Connecté), seule « société disqualifiée » la sort', () => {
  expect(statusAfterCall(null, 'pas_de_reponse')).toBe('tentative')
  expect(statusAfterCall('a_contacter', 'messagerie')).toBe('tentative')
  expect(statusAfterCall('tentative', 'pas_interesse')).toBe('connecte')
  expect(statusAfterCall('tentative', 'interesse')).toBe('connecte')
  expect(statusAfterCall('connecte', 'rdv_pris')).toBe('rdv_pris')
  expect(statusAfterCall('connecte', 'societe_disqualifiee')).toBe('disqualifie')
})

test('jamais de recul automatique ; une société sortie revient au prochain appel', () => {
  expect(statusAfterCall('connecte', 'pas_de_reponse')).toBe('connecte')
  expect(statusAfterCall('rdv_pris', 'pas_interesse')).toBe('rdv_pris')
  expect(statusAfterCall('pas_maintenant', 'pas_de_reponse')).toBe('tentative')
  expect(forward('qualification', 'a_contacter')).toBe('qualification')
  expect(forward('tentative', 'connecte')).toBe('connecte')
})

test('avancement : emails et messages LinkedIn seulement, invitations et visites ignorées', () => {
  const steps = ['email', 'linkedinInvite', 'linkedinSend', 'email', 'linkedinVisit', 'email']
  expect(sequenceProgress(steps, 0)).toBe(0.25)
  expect(sequenceProgress(steps, 2)).toBe(0.5)
  expect(sequenceProgress(steps, 3)).toBe(0.75)
  expect(sequenceProgress(['email', 'email', 'email'], 1)).toBeCloseTo(2 / 3)
  expect(sequenceProgress(['email', 'email', 'email', 'email', 'email'], 2)).toBe(0.6)
  expect(sequenceProgress(['manual'], 0)).toBe(0)
})

test('entrée Lemlist : signal fort d’abord, sinon séquence à 60 %', () => {
  const seq = new Map([['c1', ['email', 'email', 'email', 'email', 'email']]])
  const sent = (step: number) => ({ event: 'emailsSent', campaignId: 'c1', sequenceStep: step })
  expect(lemlistEntry([sent(1)], seq)).toBeNull()
  expect(lemlistEntry([sent(0), sent(1), sent(2)], seq)).toEqual({ signal: 'sequence', status: 'a_contacter' })
  expect(lemlistEntry([sent(0), { event: 'emailsReplied', campaignId: 'c1', sequenceStep: null }], seq)).toEqual({ signal: 'replied', status: 'connecte' })
  expect(lemlistEntry([{ event: 'emailsClicked', campaignId: 'c1', sequenceStep: null }], seq)?.signal).toBe('clicked')
  expect(lemlistEntry([{ event: 'emailsOpened', campaignId: 'c1', sequenceStep: null }], seq)).toBeNull()
  expect(lemlistEntry([sent(2)], seq, 0.8)).toBeNull()
})

test('à appeler aujourd’hui : signal fort, relance arrivée, entré récemment, puis moins de tentatives', () => {
  const now = new Date('2026-11-17T12:00:00Z')
  const c = (id: string, p: Partial<CallCandidate>): CallCandidate => ({ id, lead_status: 'a_contacter', lead_signal: 'sequence', lead_entered_at: '2026-11-01T00:00:00Z', lead_next_date: null, attempts: 0, lastCallAt: null, ...p })
  const list = buildCallList([
    c('vieux-3', { attempts: 3, lead_status: 'tentative' }),
    c('vieux-1', { attempts: 1, lead_status: 'tentative' }),
    c('frais', { lead_entered_at: '2026-11-16T20:00:00Z' }),
    c('relance', { lead_status: 'pas_maintenant', lead_next_date: '2026-11-17' }),
    c('plus-tard', { lead_status: 'pas_maintenant', lead_next_date: '2026-12-01' }),
    c('chaud', { lead_signal: 'replied', lead_status: 'connecte', attempts: 2 }),
    c('sorti', { lead_status: 'disqualifie' }),
    c('rdv', { lead_status: 'rdv_pris' }),
  ], now)
  expect(list.map(x => x.id)).toEqual(['chaud', 'relance', 'frais', 'vieux-1', 'vieux-3'])
})

test('session d’appels : statuts et canal choisis, signal fort d’abord, puis moins d’appels', () => {
  const now = new Date('2026-11-17T12:00:00Z')
  const c = (id: string, p: Partial<CallCandidate & { lead_channel: string | null }>) =>
    ({ id, lead_status: 'a_contacter', lead_channel: 'outbound', lead_signal: 'sequence', lead_entered_at: '2026-11-01T00:00:00Z', lead_next_date: null, attempts: 0, lastCallAt: null, ...p })
  const items = [c('a', { attempts: 2 }), c('b', {}), c('chaud', { lead_signal: 'replied', attempts: 3 }), c('in', { lead_channel: 'inbound' }), c('rdv', { lead_status: 'rdv_pris' })]
  expect(orderForSession(items, ['a_contacter'], 'outbound', now).map(x => x.id)).toEqual(['chaud', 'b', 'a'])
  expect(orderForSession(items, ['a_contacter', 'rdv_pris'], null, now).map(x => x.id)).toEqual(['chaud', 'b', 'in', 'a', 'rdv'])
  expect(contactReaction(['emailsSent', 'emailsOpened'])).toBe('A ouvert')
  expect(contactReaction(['emailsOpened', 'emailsReplied'])).toBe('A répondu')
  expect(contactReaction(['emailsSent'])).toBeNull()
})
