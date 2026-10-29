import { test, expect } from '@playwright/test'
import { SECTORS } from '../../lib/seo/sectors'
import { SOLUTIONS } from '../../lib/seo/solutions'

// Chaque page SEO doit répondre, avoir un h1 et un canonical.
const pages = [
  '/solutions',
  '/secteurs',
  ...SOLUTIONS.map(s => `/solutions/${s.slug}`),
  ...SECTORS.map(s => `/secteurs/${s.slug}`),
]

for (const path of pages) {
  test(`page SEO ${path}`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  })
}

test('slug inconnu → 404', async ({ page }) => {
  const res = await page.goto('/solutions/slug-qui-nexiste-pas')
  expect(res?.status()).toBe(404)
})
