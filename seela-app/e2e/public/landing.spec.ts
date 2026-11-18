import { test, expect } from '@playwright/test'

test.describe('Landing', () => {
  test('affiche le hero et mène vers /auth', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Payez vos équipements')

    await page.locator('a[href="/auth"]:visible').first().click()
    await expect(page).toHaveURL(/\/auth$/)
  })

  test('la nav propose Distributeurs à droite et ne liste plus Financeurs', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await expect(nav.locator('.nav__cta a[href="/distributeurs"]')).toHaveCount(1)
    await expect(nav.locator('.nav__links a[href="/distributeurs"]')).toHaveCount(0)
    await expect(nav.locator('a[href="/#financeurs"]')).toHaveCount(0)
  })

  test('pas de scroll horizontal', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('robots.txt et sitemap.xml répondent', async ({ request }) => {
    expect((await request.get('/robots.txt')).ok()).toBeTruthy()
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.ok()).toBeTruthy()
    expect(await sitemap.text()).toContain('/solutions/')
  })
})
