import { test, expect } from '@playwright/test'

test.describe('Landing', () => {
  test('affiche le hero et mène vers /auth', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('financer vos équipements')

    await page.locator('a[href="/auth"]:visible').first().click()
    await expect(page).toHaveURL(/\/auth$/)
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
