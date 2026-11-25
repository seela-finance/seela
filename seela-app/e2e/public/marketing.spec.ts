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
  '/qui-sommes-nous',
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
    // Chaque bloc chiffré est indicatif, sous réserve d'acceptation.
    expect(text).toContain('montants indicatifs')
    expect(text).toContain('hors assurance et services')
    expect(text).toContain("sous réserve d'acceptation du dossier par le financeur")
    // Financeurs anonymes, aucune promesse de conditions ni d'intégration livrée.
    for (const forbidden of ['grenke', 'bnp', 'leasecom', 'meilleures conditions', 'intégration native', 'financeur a ·']) {
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

  test('le lien Blog du pied de page mène au hub', async ({ page }) => {
    await page.goto('/')
    // La nav ne garde que Solutions et Secteurs : le blog est dans le pied de page.
    await page.getByRole('contentinfo').getByRole('link', { name: 'Blog', exact: true }).click()
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

test.describe('Formulaire de rappel dans la page', () => {
  // Une page par gabarit : solution, secteur, métier, page money, article, hub.
  const withForm = [
    `/solutions/${SOLUTIONS[0].slug}`,
    `/secteurs/${SECTORS[0].slug}`,
    `/metiers/${METIERS[0].slug}`,
    `/${PILLARS[0].slug}`,
    `/blog/${publishedArticles()[0].slug}`,
    '/solutions',
    '/secteurs',
  ]

  for (const path of withForm) {
    test(`${path} : un formulaire remplace le lien mailto`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(0)
      await expect(page.locator('#rappel').getByRole('form', { name: 'Être rappelé par notre équipe' })).toBeVisible()
    })
  }

  test('« Parler à un expert » mène au formulaire, qui s’envoie sans quitter la page', async ({ page }) => {
    // L'envoi est intercepté : aucun email ni lead réel pendant les tests.
    let payload: Record<string, unknown> | null = null
    await page.route('**/api/contact-expert', async (route) => {
      payload = route.request().postDataJSON()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })
    const path = `/solutions/${SOLUTIONS[0].slug}`
    await page.goto(path)
    await page.getByRole('link', { name: 'Parler à un expert' }).first().click()
    await expect(page).toHaveURL(new RegExp(`${path}#rappel$`))

    const form = page.locator('#rappel')
    // Envoi vide : les erreurs s'affichent, rien ne part.
    await form.getByRole('button', { name: 'Être rappelé' }).click()
    await expect(form.getByRole('alert')).toContainText('Certains champs sont à corriger')
    expect(payload).toBeNull()

    await form.getByLabel('Entreprise').fill('Société de test E2E')
    await form.getByLabel('Prénom').fill('Camille')
    await form.getByLabel('Nom', { exact: true }).fill('Test')
    await form.getByLabel('E-mail professionnel').fill('camille@example.test')
    await form.getByLabel('Téléphone').fill('0612345678')
    await form.getByRole('button', { name: 'Être rappelé' }).click()

    await expect(form.getByRole('status')).toContainText("Merci, c'est noté.")
    await expect(page).toHaveURL(new RegExp(`${path}#rappel$`))
    expect(payload).toMatchObject({ entreprise: 'Société de test E2E', telephone: '0612345678', origine: `Page solution · ${SOLUTIONS[0].name}` })
  })
})

test('slug inconnu → 404', async ({ page }) => {
  const res = await page.goto('/solutions/slug-qui-nexiste-pas')
  expect(res?.status()).toBe(404)
})
