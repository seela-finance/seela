import { test, expect } from '@playwright/test'
import { companyNameFor, emailHtmlToText, fillEmpty, mapLemlistLead, mapLemlistActivity, summarizeLemlist, newSince, pageReachedCursor, syncIsDue, type LemlistActivity } from '../../lib/crm-lemlist'

const act = (patch: Partial<LemlistActivity>): LemlistActivity => ({
  _id: 'a1', type: 'emailsSent', createdAt: '2026-11-10T10:00:00.000Z', leadEmail: 'Marie@Garage-Martin.fr', leadFirstName: 'Marie',
  leadCompanyName: 'Garage Martin', campaignName: 'DAF PME', sendUserName: 'Lorenzo', subject: 'Votre parc IT', messagePreview: 'Bonjour…', ...patch,
})

test('envoi : rattaché au lead (email en minuscules, domaine de la société), contenu récupéré à part', () => {
  expect(mapLemlistActivity(act({}))).toMatchObject({
    externalId: 'a1', event: 'emailsSent', type: 'email', title: 'Votre parc IT', body: null,
    summary: 'Campagne « DAF PME » par Lorenzo',
    lead: { email: 'marie@garage-martin.fr', firstName: 'Marie', companyName: 'Garage Martin', domain: 'garage-martin.fr' },
  })
})

test('réponse LinkedIn : texte gardé, type LinkedIn ; email : identifiants pour récupérer le contenu', () => {
  expect(mapLemlistActivity(act({ type: 'linkedinReplied', messagePreview: 'Oui, appelons-nous' }))?.body).toBe('Oui, appelons-nous')
  expect(mapLemlistActivity(act({ type: 'emailsReplied', messageId: '<m1>', contactId: 'ctc_1' }))?.metadata).toMatchObject({ messageId: '<m1>', lemlistContactId: 'ctc_1' })
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

test('bloc Lemlist : compteurs, dernier avis intéressé, absence avec date de retour, campagnes, dernière réponse', () => {
  const r = (event: string, at: string, patch: Partial<{ body: string; metadata: Record<string, unknown> }> = {}) =>
    ({ event, occurred_at: at, body: patch.body ?? null, metadata: patch.metadata ?? { campaignName: 'DAF PME' } })
  const s = summarizeLemlist([
    r('emailsSent', '2026-11-01'), r('emailsSent', '2026-11-05'), r('emailsOpened', '2026-11-05'), r('emailsOpened', '2026-11-06'),
    r('emailsClicked', '2026-11-06'), r('emailsNotInterested', '2026-11-07'), r('emailsReplied', '2026-11-08', { body: 'Rappelez-moi' }),
    r('emailsInterested', '2026-11-09'), r('outOfOffice', '2026-11-02', { metadata: { outOfOfficeEndsAt: '2026-11-04' } }),
  ])
  expect(s).toMatchObject({
    sent: 2, opened: 2, clicked: 1, replied: 1, interested: true, bounced: false, antiSpam: false, outOfOffice: '2026-11-04',
    campaigns: ['DAF PME'], lastActivityAt: '2026-11-09', lastSentAt: '2026-11-05', lastReply: { at: '2026-11-08', text: 'Rappelez-moi' },
  })
  expect(s.emails.map(e => `${e.event} ${e.occurred_at}`)).toEqual(['emailsReplied 2026-11-08', 'emailsSent 2026-11-05', 'emailsSent 2026-11-01'])
  expect(summarizeLemlist([])).toMatchObject({ sent: 0, interested: null, outOfOffice: false, lastActivityAt: null })
})

test('contenu complet : HTML → texte avec paragraphes, sans l’historique cité ni la mise en forme', () => {
  const reply = '<html><head><style>p{}</style></head><body><p>Bonjour&nbsp;Louis,</p><p>Oui pour jeudi &amp; merci.</p>'
    + '<table><tr><td><span>Cindy</span><span>Assistante</span></td></tr></table>'
    + '<div class="gmail_quote">Le 12 nov., Louis a écrit :<blockquote>Êtes-vous dispo ?</blockquote></div></body></html>'
  expect(emailHtmlToText(reply)).toBe('Bonjour Louis,\nOui pour jeudi & merci.\nCindy Assistante')
  expect(emailHtmlToText('Merci<br>À bientôt<br><br><br>Le 3 nov. 2026, Paul a écrit :<br>&gt; ancien')).toBe('Merci\nÀ bientôt')
  expect(emailHtmlToText('<div id="divRplyFwdMsg">De : x</div>')).toBeNull()
  expect(emailHtmlToText(null)).toBeNull()
})

test('fiche du lead : champs du contact et de la société, année et liens nettoyés', () => {
  const m = mapLemlistLead({ contactId: 'ctc_1', firstName: ' Marie ', jobTitle: 'DAF', linkedinUrl: 'linkedin.com/in/marie', tagline: 'DAF chez Garage', location: 'Rouen',
    companyIndustry: 'Automotive', companySize: '11-50', companyFoundedOn: '2009-01-01', companyLocation: 'Rouen, Normandie', companyDescription: 'Garage', companyLinkedinUrl: 'https://linkedin.com/company/g' })
  expect(m.contact).toEqual({ first_name: 'Marie', last_name: null, job_title: 'DAF', linkedin_url: 'https://linkedin.com/in/marie', headline: 'DAF chez Garage', location: 'Rouen', lemlist_contact_id: 'ctc_1' })
  expect(m.company).toEqual({ lemlist_industry: 'Automotive', headcount_bracket: '11-50', creation_year: 2009, location: 'Rouen, Normandie', description: 'Garage', linkedin_url: 'https://linkedin.com/company/g' })
  expect(mapLemlistLead({ companyFoundedOn: 'inconnu' }).company.creation_year).toBeNull()
})

test('champs vides seulement : une saisie de l’équipe n’est jamais écrasée', () => {
  expect(fillEmpty({ job_title: 'Directeur financier', location: null, headline: '' }, { job_title: 'DAF', location: 'Rouen', headline: 'DAF chez X', linkedin_url: null }))
    .toEqual({ location: 'Rouen', headline: 'DAF chez X' })
})
