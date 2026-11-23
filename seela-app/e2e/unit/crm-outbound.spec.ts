import { test, expect } from '@playwright/test'
import { DEFAULT_FILTER, filterOutbound, NONE, outboundProfile, selectionEntry, sortOutbound, type OutboundEvent, type OutboundRow } from '../../lib/crm-outbound'
import { autoEntryAllowed } from '../../lib/crm-prepipe'
import { chunkByTime } from '../../lib/crm-lemlist'

const ev = (event: string, patch: Partial<OutboundEvent> = {}): OutboundEvent => ({ event, campaignId: 'c1', sequenceStep: null, occurredAt: '2026-11-10T10:00:00Z', ...patch })
const SEQ = new Map([['c1', ['email', 'linkedinInvite', 'email', 'email', 'email']]])

test('chaleur : la réaction la plus forte, froid sans aucun événement Lemlist', () => {
  expect(outboundProfile([], SEQ)).toEqual({ warmth: 'froid', progress: null, flags: [], lastEventAt: null })
  expect(outboundProfile([ev('emailsSent', { sequenceStep: 0 })], SEQ).warmth).toBe('en_sequence')
  expect(outboundProfile([ev('emailsSent'), ev('emailsOpened')], SEQ).warmth).toBe('ouvert')
  expect(outboundProfile([ev('emailsOpened'), ev('emailsClicked')], SEQ).warmth).toBe('clique')
  expect(outboundProfile([ev('emailsClicked'), ev('linkedinReplied')], SEQ).warmth).toBe('repondu')
  expect(outboundProfile([ev('emailsReplied'), ev('emailsInterested')], SEQ).warmth).toBe('interesse')
})

test('avancement : emails comptés seulement, la campagne la plus avancée, inconnu sans séquence', () => {
  // étape 2 atteinte = 2 emails sur 4
  expect(outboundProfile([ev('emailsSent', { sequenceStep: 0 }), ev('emailsSent', { sequenceStep: 2 })], SEQ).progress).toBe(0.5)
  const two = new Map([...SEQ, ['c2', ['email', 'email']]])
  expect(outboundProfile([ev('emailsSent', { sequenceStep: 0 }), ev('emailsSent', { campaignId: 'c2', sequenceStep: 1 })], two).progress).toBe(1)
  expect(outboundProfile([ev('emailsSent', { campaignId: 'inconnue', sequenceStep: 3 })], SEQ).progress).toBeNull()
})

test('écartés et date du dernier événement', () => {
  const p = outboundProfile([ev('emailsBounced', { occurredAt: '2026-11-01T00:00:00Z' }), ev('emailsNotInterested', { occurredAt: '2026-11-12T00:00:00Z' }), ev('emailsUnsubscribed')], SEQ)
  expect(p.flags).toEqual(['pas_interesse', 'rejete', 'desinscrit'])
  expect(p.lastEventAt).toBe('2026-11-12T00:00:00Z')
})

test('entrée choisie : intéressé ou réponse → Connecté, sinon À contacter', () => {
  expect(selectionEntry('interesse')).toEqual({ status: 'connecte', signal: 'interested' })
  expect(selectionEntry('repondu')).toEqual({ status: 'connecte', signal: 'replied' })
  expect(selectionEntry('clique')).toEqual({ status: 'a_contacter', signal: 'clicked' })
  expect(selectionEntry('froid')).toEqual({ status: 'a_contacter', signal: 'selection' })
})

const row = (id: string, patch: Partial<OutboundRow> = {}): OutboundRow => ({
  id, name: id, industry: null, warmth: 'en_sequence', progress: 0.5, flags: [], lastEventAt: null,
  segment: 'Retail', batchId: 'b1', batchLabel: 'B01', angle: null, contact: null, contacts: 1, phones: 1, ...patch,
})

test('filtres : segment, batch, chaleur, % de séquence, téléphone, écartés masqués par défaut', () => {
  const rows = [
    row('a'), row('b', { segment: null, batchId: null, warmth: 'froid', progress: null }), row('c', { warmth: 'interesse', progress: 0.75 }),
    row('d', { phones: 0 }), row('e', { flags: ['rejete'] }), row('f', { segment: 'BTP', batchId: 'b2' }),
  ]
  const ids = (f: Partial<typeof DEFAULT_FILTER>) => filterOutbound(rows, { ...DEFAULT_FILTER, ...f }).map(r => r.id)
  expect(ids({})).toEqual(['a', 'b', 'c', 'd', 'f'])
  expect(ids({ showFlagged: true })).toContain('e')
  expect(ids({ segment: 'BTP' })).toEqual(['f'])
  expect(ids({ segment: NONE })).toEqual(['b'])
  expect(ids({ batchId: NONE })).toEqual(['b'])
  expect(ids({ warmths: ['interesse', 'froid'] })).toEqual(['b', 'c'])
  expect(ids({ minProgress: 0.6 })).toEqual(['c'])
  expect(ids({ withPhone: true })).not.toContain('d')
})

test('tri : les plus chauds, puis les plus avancés', () => {
  const sorted = sortOutbound([row('froid', { warmth: 'froid', progress: null }), row('seq30', { progress: 0.3 }), row('seq80', { progress: 0.8 }), row('chaud', { warmth: 'repondu' })])
  expect(sorted.map(r => r.id)).toEqual(['chaud', 'seq80', 'seq30', 'froid'])
})

test('entrée automatique : par défaut intéressé et réponse seulement', () => {
  expect(autoEntryAllowed('interested', 'strong')).toBe(true)
  expect(autoEntryAllowed('replied', 'strong')).toBe(true)
  expect(autoEntryAllowed('clicked', 'strong')).toBe(false)
  expect(autoEntryAllowed('sequence', 'strong')).toBe(false)
  expect(autoEntryAllowed('sequence', 'all')).toBe(true)
})

test('synchro par tranches : jamais deux événements de même date dans deux tranches', () => {
  const at = (t: string) => ({ occurredAt: `2026-11-10T10:00:0${t}Z` })
  expect(chunkByTime([at('1'), at('2'), at('3'), at('4'), at('5')], 2).map(c => c.length)).toEqual([2, 2, 1])
  expect(chunkByTime([at('1'), at('2'), at('2'), at('2'), at('3')], 2).map(c => c.map(e => e.occurredAt.slice(18, 19)).join(''))).toEqual(['1222', '3'])
  expect(chunkByTime([], 50)).toEqual([])
})
