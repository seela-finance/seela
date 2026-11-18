import { test, expect, type BrowserContext } from '@playwright/test'
import { decodeAttribution } from '../../lib/attribution'

// Attribution des leads : le proxy retient la première source du visiteur dans le cookie ev_src (lib/attribution.ts).
async function source(context: BrowserContext) {
  const cookie = (await context.cookies()).find(c => c.name === 'ev_src')
  return { cookie, value: decodeAttribution(cookie?.value) }
}

test('un lien tagué est retenu et n’est pas écrasé par la navigation ni par une autre source', async ({ page, context }) => {
  await page.goto('/distributeurs?utm_source=lemlist&utm_campaign=chr-novembre')
  const first = await source(context)
  expect(first.value).toMatchObject({ utm_source: 'lemlist', utm_campaign: 'chr-novembre', landing: '/distributeurs' })
  expect(first.cookie?.httpOnly).toBe(true)

  await page.goto('/auth')
  await page.goto('/', { referer: 'https://www.google.fr/' })
  expect((await source(context)).value).toEqual(first.value)
})

test('un accès direct cède la place à la première vraie source', async ({ page, context }) => {
  await page.goto('/')
  expect((await source(context)).value).toMatchObject({ utm_source: null, referrer: null })
  await page.goto('/', { referer: 'https://www.linkedin.com/feed/' })
  expect((await source(context)).value).toMatchObject({ referrer: 'linkedin.com' })
})

test('l’API et le back-office ne posent pas de cookie de source', async ({ request }) => {
  const res = await request.get('/api/search-company?q=ab&utm_source=test')
  expect(res.headers()['set-cookie'] ?? '').not.toContain('ev_src')
})
