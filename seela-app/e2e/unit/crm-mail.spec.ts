import { test, expect } from '@playwright/test'
import { classifyMessage, excerpt, needsRescan, summarizeMail } from '../../lib/crm-mail'
import { open, seal } from '../../lib/secret-box'

const contacts = new Set(['marie@garage.fr', 'paul@garage.fr'])
const a = (address: string) => ({ address })

test('email gardé seulement avec un contact du CRM ; envoyé ou reçu selon l’expéditeur', () => {
  expect(classifyMessage({ from: [a('Lorenzo@Everlease.fr')], to: [a('MARIE@garage.fr')], cc: [a('paul@garage.fr')] }, 'lorenzo@everlease.fr', contacts))
    .toEqual({ direction: 'sent', contactEmails: ['marie@garage.fr', 'paul@garage.fr'] })
  expect(classifyMessage({ from: [a('marie@garage.fr')], to: [a('lorenzo@everlease.fr')], cc: [] }, 'lorenzo@everlease.fr', contacts))
    .toEqual({ direction: 'received', contactEmails: ['marie@garage.fr'] })
  expect(classifyMessage({ from: [a('news@banque.fr')], to: [a('lorenzo@everlease.fr')], cc: [] }, 'lorenzo@everlease.fr', contacts)).toBeNull()
})

test('extrait : sans l’historique cité, espaces resserrés', () => {
  expect(excerpt('Bonjour,\n\nOui pour jeudi.\n\nLe 12 nov. 2026, Lorenzo a écrit :\n> Êtes-vous dispo ?')).toBe('Bonjour, Oui pour jeudi.')
  expect(excerpt('> tout est cité')).toBeNull()
  expect(excerpt(null)).toBeNull()
})

test('bloc Emails : compteurs, dernier échange, réponse à mon dernier envoi', () => {
  const r = (id: string, event: string, at: string) => ({ id, event, occurred_at: at, title: id, body: null, metadata: null })
  expect(summarizeMail([r('1', 'sent', '2026-11-01'), r('2', 'received', '2026-11-02'), r('3', 'sent', '2026-11-03')]))
    .toMatchObject({ sent: 2, received: 1, lastExchangeAt: '2026-11-03', repliedToLast: false })
  expect(summarizeMail([r('1', 'sent', '2026-11-01'), r('2', 'received', '2026-11-02')]).repliedToLast).toBe(true)
  expect(summarizeMail([r('2', 'received', '2026-11-02')]).repliedToLast).toBeNull()
})

test('mot de passe chiffré : relisible avec la clé, jamais en clair, illisible s’il est modifié', () => {
  process.env.EMAIL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  const sealed = seal('mot-de-passe')
  expect(sealed).not.toContain('mot-de-passe')
  expect(seal('mot-de-passe')).not.toBe(sealed)
  expect(open(sealed)).toBe('mot-de-passe')
  const [v, iv, tag, data] = sealed.split('.')
  expect(() => open([v, iv, tag, `${data.slice(0, -2)}AA`].join('.'))).toThrow()
})

test('relecture des 90 jours : premier passage, dossier recréé, ou contact ajouté depuis le dernier passage', () => {
  const prev = { uidValidity: '1', lastUid: 50, contactsAt: '2026-11-17T10:00:00Z' }
  expect(needsRescan(undefined, '1', null)).toBe(true)
  expect(needsRescan(prev, '2', '2026-11-17T10:00:00Z')).toBe(true)
  expect(needsRescan(prev, '1', '2026-11-17T12:00:00Z')).toBe(true)
  expect(needsRescan(prev, '1', '2026-11-17T10:00:00Z')).toBe(false)
  expect(needsRescan({ uidValidity: '1', lastUid: 50 }, '1', '2026-11-17T10:00:00Z')).toBe(true)
})
