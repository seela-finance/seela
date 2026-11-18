import { test, expect } from '@playwright/test'
import { channelLabel, decodeAttribution, encodeAttribution, readAttribution, shouldReplace } from '../../lib/attribution'

const NOW = new Date('2026-11-18T10:00:00Z')
const read = (url: string, referrer: string | null = null) => readAttribution(new URL(url), referrer, 'www.everlease.fr', NOW)

test('lien tagué : paramètres utm retenus, en minuscules, page d’arrivée sans paramètres', () => {
  const a = read('https://www.everlease.fr/distributeurs?utm_source=Lemlist&utm_campaign=chr-novembre&x=1')
  expect(a).toMatchObject({ utm_source: 'lemlist', utm_campaign: 'chr-novembre', referrer: null, landing: '/distributeurs' })
  expect(channelLabel(a!)).toBe('Lemlist · chr-novembre')
})

test('site référent : seul le domaine est gardé, canal reconnu', () => {
  expect(channelLabel(read('https://www.everlease.fr/', 'https://www.google.fr/search?q=leasing')!)).toBe('Google (naturel)')
  expect(channelLabel(read('https://www.everlease.fr/', 'https://www.linkedin.com/feed/')!)).toBe('LinkedIn')
  expect(channelLabel(read('https://www.everlease.fr/', 'https://chatgpt.com/')!)).toBe('IA (chatgpt.com)')
  expect(channelLabel(read('https://www.everlease.fr/', 'https://blog.example.com/article')!)).toBe('Site référent (blog.example.com)')
  expect(read('https://www.everlease.fr/', 'https://www.google.fr/search?q=x')!.referrer).toBe('google.fr')
})

test('navigation interne : rien à retenir ; accès direct reconnu', () => {
  expect(read('https://www.everlease.fr/auth', 'https://www.everlease.fr/')).toBeNull()
  expect(read('https://www.everlease.fr/auth', 'https://everlease.fr/')).toBeNull()
  expect(channelLabel(read('https://www.everlease.fr/')!)).toBe('Accès direct')
})

test('première source gardée ; un accès direct cède la place à une vraie source', () => {
  const direct = read('https://www.everlease.fr/')!
  const google = read('https://www.everlease.fr/', 'https://www.google.fr/')!
  const lemlist = read('https://www.everlease.fr/?utm_source=lemlist')!
  expect(shouldReplace(null, direct)).toBe(true)
  expect(shouldReplace(direct, google)).toBe(true)
  expect(shouldReplace(google, lemlist)).toBe(false)
  expect(shouldReplace(google, null)).toBe(false)
  expect(shouldReplace(direct, read('https://www.everlease.fr/')!)).toBe(false)
})

test('cookie : aller-retour, et un cookie trafiqué est nettoyé ou ignoré', () => {
  const a = read('https://www.everlease.fr/?utm_source=lemlist')!
  expect(decodeAttribution(encodeAttribution(a))).toEqual(a)
  expect(decodeAttribution('pas-du-json')).toBeNull()
  expect(decodeAttribution(Buffer.from(JSON.stringify({ utm_source: 'x' })).toString('base64url'))).toBeNull()
  const forged = decodeAttribution(Buffer.from(JSON.stringify({
    utm_source: '<script>alert(1)</script>', landing: 'https://evil.com', first_seen: '2026-11-18T10:00:00Z',
  })).toString('base64url'))
  expect(forged).toMatchObject({ utm_source: 'scriptalert(1)/script', landing: '/' })
})
