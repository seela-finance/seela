import { test, expect } from '@playwright/test'
import { SECTORS } from '../../lib/seo/sectors'
import { SOLUTIONS } from '../../lib/seo/solutions'
import { METIERS } from '../../lib/seo/metiers'
import { PILLARS } from '../../lib/seo/pillars'
import { publishedArticles } from '../../lib/seo/blog'

// Chaque page SEO doit répondre, avoir un h1 et un canonical.
const pages = [
  '/solutions',
  '/secteurs',
  '/metiers',
  '/distributeurs',
  '/blog',
  '/mentions-legales',
  '/confidentialite',
  ...PILLARS.map(p => `/${p.slug}`),
  ...SOLUTIONS.map(s => `/solutions/${s.slug}`),
  ...SECTORS.map(s => `/secteurs/${s.slug}`),
  ...METIERS.map(m => `/metiers/${m.slug}`),
  ...publishedArticles().map(a => `/blog/${a.slug}`),
]

for (const path of pages) {
  test(`page SEO ${path}`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  })
}

test.describe('Page distributeurs', () => {
  test('présente les trois arguments et ouvre le formulaire de contact', async ({ page }) => {
    await page.goto('/distributeurs')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Vos commerciaux vendent.')
    for (const title of ["rien d'autre à faire.", 'plus de ventes conclues.', 'autour de votre vente.']) {
      await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: title })).toBeVisible()
    }

    await page.getByRole('button', { name: 'Présenter votre circuit de vente' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Présenter votre circuit de vente' })).toBeVisible()
    await expect(dialog).toContainText('Fournisseurs et distributeurs')
  })

  test('respecte les règles de vérité', async ({ page }) => {
    await page.goto('/distributeurs')
    const text = (await page.locator('main').innerText()).toLowerCase()
    // Chaque bloc chiffré est un exemple, sous réserve d'acceptation.
    expect(text).toContain('exemple illustratif')
    expect(text).toContain('hors assurance et services')
    expect(text).toContain("sous réserve d'acceptation du dossier par le financeur")
    // Financeurs anonymes, aucune promesse de conditions ni d'intégration livrée.
    for (const forbidden of ['grenke', 'bnp', 'leasecom', 'meilleures conditions', 'intégration native']) {
      expect(text).not.toContain(forbidden)
    }
  })

  test('pas de scroll horizontal sur mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/distributeurs')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('la home et la navigation mènent à la page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: "Découvrir l'offre distributeurs" }).click()
    await expect(page).toHaveURL(/\/distributeurs$/)
  })
})

test.describe('Blog', () => {
  test('respecte les règles de vérité', async ({ page }) => {
    await page.goto(`/blog/${publishedArticles()[0].slug}`)
    const text = (await page.locator('main').innerText()).toLowerCase()
    expect(text).toContain('exemple illustratif')
    expect(text).toContain('hors assurance et services')
    expect(text).toContain("sous réserve d'acceptation du dossier par le financeur")
    // Financeurs anonymes, aucune promesse de conditions.
    for (const forbidden of ['grenke', 'bnp', 'leasecom', 'meilleures conditions']) {
      expect(text).not.toContain(forbidden)
    }
  })

  test('un brouillon (published:false) est inaccessible', async ({ page }) => {
    // Le gate de relecture : rien de non publié n'est servi, même avec le slug.
    const res = await page.goto('/blog/leasing-ou-credit-professionnel')
    expect(res?.status()).toBe(404)
  })

  test('le lien Blog de la navigation mène au hub', async ({ page }) => {
    await page.goto('/')
    // Sous 900px la nav est repliée dans le menu burger.
    const burger = page.getByRole('button', { name: /menu/i })
    if (await burger.isVisible()) await burger.click()
    await page.getByRole('navigation').getByRole('link', { name: 'Blog', exact: true }).first().click()
    await expect(page).toHaveURL(/\/blog$/)
  })
})

test.describe('Métiers & pages money', () => {
  test('une page métier respecte les règles de vérité', async ({ page }) => {
    await page.goto(`/metiers/${METIERS[0].slug}`)
    const text = (await page.locator('main').innerText()).toLowerCase()
    expect(text).toContain('exemple illustratif')
    expect(text).toContain("sous réserve d'acceptation du dossier par le financeur")
    for (const forbidden of ['grenke', 'bnp', 'leasecom', 'meilleures conditions']) {
      expect(text).not.toContain(forbidden)
    }
  })

  test('une page money respecte les règles de vérité', async ({ page }) => {
    await page.goto(`/${PILLARS[0].slug}`)
    const text = (await page.locator('main').innerText()).toLowerCase()
    expect(text).toContain("sous réserve d'acceptation du dossier par le financeur")
    for (const forbidden of ['grenke', 'bnp', 'leasecom', 'meilleures conditions']) {
      expect(text).not.toContain(forbidden)
    }
  })

  test('métier inconnu → 404', async ({ page }) => {
    const res = await page.goto('/metiers/metier-qui-nexiste-pas')
    expect(res?.status()).toBe(404)
  })
})

test('slug inconnu → 404', async ({ page }) => {
  const res = await page.goto('/solutions/slug-qui-nexiste-pas')
  expect(res?.status()).toBe(404)
})
