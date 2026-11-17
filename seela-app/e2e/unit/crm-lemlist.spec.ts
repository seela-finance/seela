import { test, expect } from '@playwright/test'
import { companyNameFor, mapLemlistActivity, newSince, pageReachedCursor, syncIsDue, type LemlistActivity } from '../../lib/crm-lemlist'

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

test('ignorés : ouvertures, anti-spam, absences, lead sans email ; messagerie grand public sans domaine société', () => {
  for (const type of ['emailsOpened', 'emailsClicked', 'mailinblackDetected', 'outOfOffice']) expect(mapLemlistActivity(act({ type }))).toBeNull()
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
