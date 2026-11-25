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
    // À gauche, deux entrées seulement : Solutions et Secteurs.
    await expect(nav.locator('.nav__links > *')).toHaveCount(2)
    for (const href of ['/metiers', '/blog', '/#comment']) {
      await expect(nav.locator(`.nav__links a[href="${href}"]`)).toHaveCount(0)
      await expect(page.getByRole('contentinfo').locator(`a[href="${href}"]`)).toHaveCount(1)
    }
  })

  test('met quatre secteurs à la une et mène à « Qui sommes-nous »', async ({ page }) => {
    await page.goto('/')
    const sectors = page.locator('a.hm-sector')
    await expect(sectors).toHaveCount(4)
    await expect(sectors.first()).toHaveAttribute('href', '/secteurs/chr-hotellerie-restauration')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Qui sommes-nous' }).click()
    await expect(page).toHaveURL(/\/qui-sommes-nous$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dix ans à financer')
  })

  test('respecte les règles de vérité', async ({ page }) => {
    await page.goto('/')
    const text = (await page.locator('.lp').innerText()).toLowerCase()
    expect(text).toContain('hors assurance et services')
    expect(text).toContain("sous réserve d'acceptation du dossier par le financeur")
    // Financeurs désignés par leur type, jamais nommés ; aucune promesse de conditions.
    for (const forbidden of ['grenke', 'bnp', 'leasecom', 'meilleures conditions', 'financeur a ·']) {
      expect(text).not.toContain(forbidden)
    }
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
