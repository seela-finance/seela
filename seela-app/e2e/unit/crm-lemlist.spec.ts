import { test, expect } from '@playwright/test'
import { companyNameFor, groupLemlistNoise, mapLemlistActivity, newSince, pageReachedCursor, syncIsDue, type LemlistActivity } from '../../lib/crm-lemlist'

const act = (patch: Partial<LemlistActivity>): LemlistActivity => ({
  _id: 'a1', type: 'emailsSent', createdAt: '2026-11-10T10:00:00.000Z', leadEmail: 'Marie@Garage-Martin.fr', leadFirstName: 'Marie',
  leadCompanyName: 'Garage Martin', campaignName: 'DAF PME', sendUserName: 'Lorenzo', subject: 'Votre parc IT', messagePreview: 'Bonjour…', ...patch,
})

test('envoi : rattaché au lead (email en minuscules, domaine de la société), sans le corps du message', () => {
  expect(mapLemlistActivity(act({}))).toMatchObject({
    externalId: 'a1', event: 'emailsSent', type: 'email', title: 'Votre parc IT', body: null,
    summary: 'Campagne « DAF PME » par Lorenzo',
    lead: { email: 'marie@garage-martin.fr', firstName: 'Marie', companyName: 'Garage Martin', domain: 'garage-martin.fr' },
  })
})

test('réponse : le texte de la réponse est gardé ; LinkedIn a son propre type', () => {
  expect(mapLemlistActivity(act({ type: 'emailsReplied', messagePreview: 'Oui, appelons-nous' }))?.body).toBe('Oui, appelons-nous')
  expect(mapLemlistActivity(act({ type: 'linkedinInviteAccepted' }))?.type).toBe('linkedin')
})

test('gardés : ouvertures, clics, anti-spam, absences (avec le message) ; ignorés : étape sautée, lead sans email', () => {
  for (const type of ['emailsOpened', 'emailsClicked', 'mailinblackDetected']) expect(mapLemlistActivity(act({ type }))?.event).toBe(type)
  expect(mapLemlistActivity(act({ type: 'outOfOffice', messagePreview: 'De retour le 24' }))?.body).toBe('De retour le 24')
  for (const type of ['skipped', 'emailsSendFailed']) expect(mapLemlistActivity(act({ type }))).toBeNull()
  expect(mapLemlistActivity(act({ leadEmail: null }))).toBeNull()
  const gmail = mapLemlistActivity(act({ leadEmail: 'jean@gmail.com', leadCompanyName: null }))!
  expect(gmail.lead.domain).toBeNull()
  expect(companyNameFor(gmail.lead)).toBeNull()
})

test('reprise : seulement les nouveautés, du plus ancien au plus récent, arrêt dès la page déjà importée', () => {
  const page = [act({ _id: 'c', createdAt: '2026-11-12T00:00:00Z' }), act({ _id: 'b', createdAt: '2026-11-11T00:00:00Z' }), act({ _id: 'a', createdAt: '2026-11-10T00:00:00Z' })]
  expect(newSince(page, '2026-11-10T00:00:00Z').map(m => m.externalId)).toEqual(['b', 'c'])
  expect(newSince(page, null)).toHaveLength(3)
  expect(pageReachedCursor(page, '2026-11-10T00:00:00Z')).toBe(true)
  expect(pageReachedCursor(page, '2026-11-01T00:00:00Z')).toBe(false)
  expect(pageReachedCursor(page, null)).toBe(false)
})

test('synchro automatique toutes les 15 minutes au plus', () => {
  const now = new Date('2026-11-17T12:00:00Z')
  expect(syncIsDue(null, now)).toBe(true)
  expect(syncIsDue('2026-11-17T11:50:00Z', now)).toBe(false)
  expect(syncIsDue('2026-11-17T11:44:00Z', now)).toBe(true)
})

test('chronologie : envois et ouvertures qui se suivent regroupés, une réponse coupe le groupe', () => {
  const it = (id: string, event: string | null, source = 'lemlist', summary: string | null = 'Campagne « DAF »') =>
    ({ id, source, event, label: id, summary, title: 'objet', at: id })
  const g = groupLemlistNoise([it('9', 'emailsOpened'), it('8', 'emailsSent'), it('7', 'emailsSent'), it('6', 'emailsReplied'), it('5', 'emailsSent'), it('4', null, 'manuel', null)])
  expect(g.map(x => x.label)).toEqual(['Lemlist · 2 emails envoyés, 1 ouverture', '6', '5', '4'])
  expect(g[0]).toMatchObject({ title: null, summary: 'Campagne « DAF »' })
})
