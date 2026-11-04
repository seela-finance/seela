import { mkdirSync } from 'node:fs'
import { test, expect, type Browser, type Page } from '@playwright/test'
import { OS, RS } from '../../lib/status'
import { readContext, stagingAdmin, stateFile, type Role } from '../support/staging'

// Parcours réels sur le Supabase de staging, avec les comptes éphémères de e2e/staging.seed.ts.
// Seul l'appel à l'IA est simulé (coût) ; aucun email ne part (voir loadStagingEnv).

const SCREENS = 'test-results/screens'
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

const ANALYSIS = {
  supplier: { name: 'Fournisseur E2E', address: '1 rue du Test, Paris', siren: '987654321' },
  document_number: 'DV-E2E-1',
  document_date: '2026-10-01',
  document_kind: 'facture',
  items: [
    { description: 'Serveur de calcul', quantity: 1, unit_price: 10000, total_price: 10000, category: 'Informatique' },
    { description: 'Écrans 27 pouces', quantity: 4, unit_price: 500, total_price: 2000, category: 'Informatique' },
    { description: 'Installation sur site', quantity: 1, unit_price: 1500, total_price: 1500, category: 'Autre' },
  ],
}

async function pageAs(browser: Browser, role: Role) {
  const context = await browser.newContext({ storageState: stateFile(role), locale: 'fr-FR' })
  return context.newPage()
}

/** À 375 px, rien ne dépasse de l'écran, sauf dans une zone qui défile (tableaux) ou un menu refermé. */
async function expectNoOverflow(page: Page, name: string) {
  const offenders = await page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const scrolls = (el: Element) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX)
    return [...document.querySelectorAll('body *')]
      .filter(el => {
        const box = el.getBoundingClientRect()
        if (box.width === 0 || box.height === 0 || box.right <= width + 1) return false
        if (getComputedStyle(el).visibility === 'hidden') return false
        for (let p = el.parentElement; p; p = p.parentElement) if (scrolls(p)) return false
        return true
      })
      .slice(0, 8)
      .map(el => `${el.tagName.toLowerCase()} « ${(el.textContent ?? '').trim().slice(0, 40)} »`)
  })
  expect(offenders, `Débordement à 375 px sur ${name}`).toEqual([])
}

/** Capture desktop et mobile (375 px) : la preuve visuelle jointe aux PR et à la session de test de Louis. */
async function shot(page: Page, name: string) {
  mkdirSync(SCREENS, { recursive: true })
  await page.screenshot({ path: `${SCREENS}/${name}-desktop.png`, fullPage: true })
  const size = page.viewportSize()
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({ path: `${SCREENS}/${name}-mobile.png`, fullPage: true })
  await expectNoOverflow(page, name)
  if (size) await page.setViewportSize(size)
}

test('un client soumet un dossier, choisit une offre, l’admin la valide et le leaser accepte', async ({ browser }) => {
  test.setTimeout(300_000)
  const run = readContext()
  const db = stagingAdmin()
  const client = await pageAs(browser, 'client')

  await test.step('étape 1 : dépôt du devis', async () => {
    await client.route('**/api/analyze', route => route.fulfill({ json: ANALYSIS }))
    await client.goto('/app/nouveau')
    await client.locator('input[type="file"]').setInputFiles({ name: 'devis-e2e.pdf', mimeType: 'application/pdf', buffer: PDF })
    await shot(client, '01-depot')
    await client.getByRole('button', { name: 'Analyser le document' }).click()
  })

  await test.step('étape 2 : lignes, et signalement devis/facture', async () => {
    await expect(client.getByText('Ce document ressemble à une facture')).toBeVisible()
    await shot(client, '02-lignes')
    await client.getByRole('button', { name: 'Non, c’est bien un devis' }).or(client.getByRole('button', { name: "Non, c'est bien un devis" })).click()
    await expect(client.getByText('Ce document ressemble à une facture')).toHaveCount(0)

    await expect(client.getByText(/Total sélectionné/)).toContainText(/13\s500\s€/)
    await client.getByRole('row', { name: /Installation sur site/ }).getByRole('checkbox').uncheck()
    await expect(client.getByText(/Total sélectionné/)).toContainText(/12\s000\s€/)
    await client.getByRole('button', { name: 'Continuer' }).click()
  })

  await test.step('étape 3 : configuration et loyer estimé', async () => {
    await client.getByRole('button', { name: '36 mois' }).click()
    await expect(client.getByText(/408\s€/)).toBeVisible() // 12 000 € × 0,034
    await shot(client, '03-configuration')
    await client.getByRole('button', { name: 'Continuer' }).click()
  })

  await test.step('étape 4 : transmission, montant recalculé côté serveur', async () => {
    await expect(client.getByText('Devis (leasing)')).toBeVisible()
    await client.getByRole('button', { name: 'Transmettre ma demande' }).click()
    await expect(client).toHaveURL(/\/app\/offres\/[0-9a-f-]{36}$/, { timeout: 60_000 })
  })

  const requestId = client.url().split('/').pop()!
  const { data: request } = await db.from('financing_requests').select('status, total_amount, document_type, user_id').eq('id', requestId).single()
  expect(request).toMatchObject({ status: RS.offers_available, total_amount: 12000, document_type: 'devis', user_id: run.users.client.id })

  // Le loyer vient de la grille du leaser de test : 12 000 € × 0,031
  const { data: offer } = await db.from('offers').select('id, monthly_payment, status').eq('request_id', requestId).eq('leaser_name', run.leaser.name).single()
  expect(Number(offer!.monthly_payment)).toBe(372)

  await test.step('page du dossier et détail de l’offre, sans condition inventée', async () => {
    await expect(client.getByText(run.leaser.name).first()).toBeVisible()
    await shot(client, '04-offres')
    await client.locator(`a[href="/app/offres/${requestId}/${offer!.id}"]`).first().click()
    await expect(client.getByRole('button', { name: 'Confirmer ma sélection' })).toBeVisible()
    await expect(client.getByText(/1er loyer offert/)).toHaveCount(0)
    await shot(client, '05-offre-detail')
  })

  await test.step('le client confirme son offre', async () => {
    await client.getByRole('button', { name: 'Confirmer ma sélection' }).click()
    await expect(client.getByText('Votre sélection est enregistrée')).toBeVisible()
    const { data } = await db.from('offers').select('status, selected').eq('id', offer!.id).single()
    expect(data).toMatchObject({ status: OS.client_confirmed, selected: true })
  })

  const admin = await pageAs(browser, 'admin')

  await test.step('l’admin valide et transmet', async () => {
    await admin.goto(`/admin/dossiers/${requestId}`)
    await expect(admin.getByRole('heading', { name: run.companyName })).toBeVisible()
    await expect(admin.getByText('Serveur de calcul')).toBeVisible()
    await shot(admin, '06-admin-dossier')
    await admin.getByRole('button', { name: 'Valider et transmettre' }).click()
    await expect(admin.getByText('Offre validée et transmise au leaser.')).toBeVisible({ timeout: 30_000 })
    const { data } = await db.from('financing_requests').select('status').eq('id', requestId).single()
    expect(data?.status).toBe(RS.seela_validated)
  })

  await test.step('l’admin enregistre l’acceptation du leaser', async () => {
    await admin.getByRole('button', { name: 'Accepté par le leaser' }).click()
    await expect(admin.getByText('Acceptation du leaser enregistrée.')).toBeVisible({ timeout: 30_000 })
    const { data } = await db.from('offers').select('status').eq('id', offer!.id).single()
    expect(data?.status).toBe(OS.leaser_confirmed)
  })

  await test.step('le client voit son financement confirmé et son contrat', async () => {
    // Dossier confirmé : la page de l'offre renvoie vers le contrat
    await client.goto(`/app/offres/${requestId}/${offer!.id}`)
    await expect(client).toHaveURL(new RegExp(`/app/contrats/${requestId}`))
    await expect(client.getByText(/Financé par/)).toContainText(run.leaser.name)
    await expect(client.getByText(/372\s€/).first()).toBeVisible()
    await shot(client, '07-contrat')
  })

  await test.step('la fiche société rassemble le dossier et le document', async () => {
    await admin.goto(`/admin/societes?q=${encodeURIComponent(run.companyName)}`)
    await expect(admin.getByRole('link', { name: run.companyName }).first()).toBeVisible()
    await shot(admin, '08-admin-societes')
    await admin.goto(`/admin/societes/${run.users.client.id}`)
    await expect(admin.getByRole('heading', { name: run.companyName })).toBeVisible()
    await expect(admin.getByText(run.users.client.email).first()).toBeVisible()
    await expect(admin.locator(`a[href="/admin/dossiers/${requestId}"]`).first()).toBeVisible()
    await shot(admin, '09-admin-fiche-societe')
  })
})

test('à 375 px, chaque page tient dans l’écran et le menu s’ouvre', async ({ browser }) => {
  test.setTimeout(180_000)
  const run = readContext()
  const client = await pageAs(browser, 'client')
  const admin = await pageAs(browser, 'admin')

  for (const [page, path, name] of [
    [client, '/app/dashboard', '10-dashboard'],
    [client, '/app/offres', '11-offres-liste'],
    [client, '/app/contrats', '12-contrats-liste'],
    [admin, '/admin', '13-admin-dossiers'],
    [admin, `/admin/societes?q=${run.runId}`, '14-admin-recherche'],
  ] as const) {
    await page.goto(path)
    await shot(page, name)
  }

  await client.setViewportSize({ width: 375, height: 812 })
  await client.goto('/app/dashboard')
  await client.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await expect(client.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
  await expect(async () => expect((await client.locator('aside').boundingBox())?.x).toBe(0)).toPass() // fin de l'animation
  await shot(client, '15-menu-ouvert')
  await client.locator('aside').getByRole('link', { name: 'Offres' }).click()
  await expect(client).toHaveURL(/\/app\/offres/)
  await expect(client.getByRole('button', { name: 'Se déconnecter' })).toBeHidden()
})

test('sans offre : l’admin voit pourquoi, note le dossier et relance le matching après correction', async ({ browser }) => {
  test.setTimeout(180_000)
  const run = readContext()
  const db = stagingAdmin()
  const longAgo = '2026-01-05T10:00:00Z'

  // Montant sous le minimum du leaser de test : aucune offre de sa part
  const { data: request, error } = await db
    .from('financing_requests')
    .insert({ user_id: run.users.client.id, status: RS.no_match, document_type: 'devis', total_amount: 100, duration_months: 36, created_at: longAgo, updated_at: longAgo })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const { error: lineError } = await db
    .from('line_items')
    .insert({ request_id: request!.id, description: 'Serveur', quantity: 1, unit_price: 12000, total_price: 12000, category: 'Informatique', selected: true })
  if (lineError) throw new Error(lineError.message)
  const { data: draft, error: draftError } = await db
    .from('financing_requests')
    .insert({ user_id: run.users.client.id, status: RS.draft })
    .select('id')
    .single()
  if (draftError) throw new Error(draftError.message)

  const admin = await pageAs(browser, 'admin')
  const draftLink = admin.locator(`a[href="/admin/dossiers/${draft!.id}"]`)
  const noMatchLink = admin.locator(`a[href="/admin/dossiers/${request!.id}"]`)
  const note = `Note E2E ${run.runId}`

  await test.step('la liste signale le retard et masque les brouillons', async () => {
    await admin.goto(`/admin?tab=all&q=${encodeURIComponent(run.companyName)}`)
    await expect(noMatchLink).toBeVisible()
    await expect(admin.getByRole('row').filter({ has: noMatchLink }).getByText('En retard')).toBeVisible()
    await expect(draftLink).toHaveCount(0)
    await shot(admin, '16-admin-retard')
    await admin.goto(`/admin?tab=all&status=${RS.draft}&q=${encodeURIComponent(run.companyName)}`)
    await expect(draftLink).toBeVisible()
  })

  const row = admin.getByRole('listitem').filter({ hasText: run.leaser.name })

  await test.step('la fiche donne la raison, leaser par leaser', async () => {
    await admin.goto(`/admin/dossiers/${request!.id}`)
    await expect(row).toContainText(/Montant 100\s€ sous le minimum de 1\s000\s€/)
    await shot(admin, '17-admin-sans-offre')
  })

  await test.step('une note interne rejoint l’historique', async () => {
    await admin.getByLabel('Note interne').fill(note)
    await admin.getByRole('button', { name: 'Ajouter la note' }).click()
    await expect(admin.getByText(note)).toBeVisible({ timeout: 30_000 })
  })

  await test.step('après correction du dossier, la relance crée l’offre', async () => {
    await db.from('financing_requests').update({ total_amount: 12000 }).eq('id', request!.id)
    await admin.reload()
    await expect(row).toContainText('Éligible')
    admin.once('dialog', dialog => dialog.accept())
    await admin.getByRole('button', { name: 'Relancer le matching' }).click()
    await expect(admin.getByRole('status').filter({ hasText: /aucun email envoyé/ })).toBeVisible({ timeout: 30_000 })

    const { data: after } = await db.from('financing_requests').select('status').eq('id', request!.id).single()
    expect(after?.status).toBe(RS.offers_available)
    const { data: offers } = await db.from('offers').select('monthly_payment').eq('request_id', request!.id).eq('leaser_name', run.leaser.name)
    expect(offers?.map(o => Number(o.monthly_payment))).toEqual([372]) // 12 000 € × 0,031
    await expect(admin.getByRole('button', { name: 'Relancer le matching' })).toHaveCount(0)
  })

  await test.step('le client voit l’offre, jamais la note', async () => {
    const client = await pageAs(browser, 'client')
    await client.goto(`/app/offres/${request!.id}`)
    await expect(client.getByText(run.leaser.name).first()).toBeVisible()
    await expect(client.getByText(note)).toHaveCount(0)
  })
})

test('un autre client ne voit ni ne modifie le dossier, et le back-office lui répond 404', async ({ browser }) => {
  test.setTimeout(120_000)
  const run = readContext()
  const db = stagingAdmin()

  const { data: request, error } = await db
    .from('financing_requests')
    .insert({ user_id: run.users.client.id, status: RS.offers_available, document_type: 'devis', total_amount: 5000, duration_months: 36 })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const { data: offer, error: offerError } = await db
    .from('offers')
    .insert({ request_id: request!.id, leaser_name: run.leaser.name, monthly_payment: 155, duration_months: 36, status: OS.indicative })
    .select('id')
    .single()
  if (offerError) throw new Error(offerError.message)

  const intruder = await pageAs(browser, 'intruder')

  expect((await intruder.goto(`/app/offres/${request!.id}`))?.status()).toBe(404)
  expect((await intruder.goto(`/app/offres/${request!.id}/${offer!.id}`))?.status()).toBe(404)
  expect((await intruder.goto('/admin'))?.status()).toBe(404)
  expect((await intruder.goto(`/admin/societes/${run.users.client.id}`))?.status()).toBe(404)

  expect((await intruder.request.post(`/api/offers/${offer!.id}/confirm`)).status()).toBe(404)
  expect((await intruder.request.post(`/api/offers/${offer!.id}/decline`)).status()).toBe(404)

  const { data: after } = await db.from('offers').select('status, selected').eq('id', offer!.id).single()
  expect(after).toMatchObject({ status: OS.indicative, selected: false })
})
