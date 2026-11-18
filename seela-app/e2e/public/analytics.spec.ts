import { test, expect } from '@playwright/test'

// PostHog (lib/track.ts) : sans clé en test, rien n'est envoyé ; aucun cookie de mesure dans tous les cas.
test('pas de cookie ni d’appel PostHog sans clé', async ({ page, context }) => {
  const calls: string[] = []
  page.on('request', r => { if (/\/ingest\/|posthog\.com/.test(r.url())) calls.push(r.url()) })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(calls).toEqual([])
  expect((await context.cookies()).filter(c => c.name.startsWith('ph_'))).toEqual([])
})

test('une page avec barre finale redirige toujours vers son adresse canonique', async ({ request }) => {
  const res = await request.get('/distributeurs/', { maxRedirects: 0 })
  expect(res.status()).toBe(308)
  expect(res.headers().location).toMatch(/\/distributeurs$/)
})
