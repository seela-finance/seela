import { mkdirSync } from 'node:fs'
import { test, expect, type Browser, type Page } from '@playwright/test'
import { readContext, stagingAdmin, stateFile, type Role } from '../support/staging'

// Le contrat vu par le client et ses demandes (docs/contrat-client.md) : échéancier indicatif, demande du client,
// alerte et réponse de l'équipe, suivi partenaire (nature et état seulement), étanchéité entre comptes.

const SCREENS = 'test-results/screens'

async function pageAs(browser: Browser, role: Role) {
  const context = await browser.newContext({ storageState: stateFile(role), locale: 'fr-FR' })
  return context.newPage()
}

async function shot(page: Page, name: string) {
  mkdirSync(SCREENS, { recursive: true })
  await page.screenshot({ path: `${SCREENS}/${name}-desktop.png`, fullPage: true })
  const size = page.viewportSize()
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({ path: `${SCREENS}/${name}-mobile.png`, fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow, `Débordement à 375 px sur ${name}`).toBe(false)
  if (size) await page.setViewportSize(size)
}

/** Premier jour du mois, il y a `monthsAgo` mois (AAAA-MM-JJ). */
function firstOfMonthAgo(monthsAgo: number) {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsAgo, 1)).toISOString().slice(0, 10)
}

test('fiche contrat : échéancier, demande du client, réponse de l’équipe, suivi partenaire', async ({ browser }) => {
  test.setTimeout(240_000)
  const run = readContext()
  const db = stagingAdmin()
  const { data: clientContact } = await db.from('contacts').select('company_id').eq('user_id', run.users.client.id).single()
  const { data: partnerContact } = await db.from('contacts').select('id, company_id').eq('user_id', run.users.partner.id).single()

  // Contrat actif démarré il y a trois mois (client direct : un contrat actif de plus fausserait les compteurs du flow partenaire)
  const { data: req, error } = await db.from('financing_requests').insert({
    user_id: run.users.client.id, company_id: clientContact!.company_id, status: 'active', total_amount: 12000, duration_months: 36, document_type: 'devis',
    contract_start_date: firstOfMonthAgo(3),
  }).select('id').single()
  if (error) throw new Error(error.message)
  await db.from('line_items').insert({ request_id: req!.id, description: 'Four mixte', quantity: 1, unit_price: 12000, total_price: 12000, category: 'Industrie', selected: true })
  await db.from('offers').insert({ request_id: req!.id, leaser_name: run.leaser.name, monthly_payment: 380, duration_months: 36, status: 'leaser_confirmed', selected: true })

  const client = await pageAs(browser, 'client')
  await test.step('le client voit l’échéancier indicatif et la prochaine échéance', async () => {
    await client.goto(`/app/contrats/${req!.id}`)
    await expect(client.getByRole('heading', { name: 'Échéancier' })).toBeVisible()
    await expect(client.getByText(/\d+ échéances? restantes? sur 36/)).toBeVisible()
    await expect(client.getByText('Prochaine échéance')).toBeVisible()
    await expect(client.getByText('Réglée').first()).toBeVisible()
    await expect(client.getByText(/Échéancier indicatif, hors assurance et services/)).toBeVisible()
    await shot(client, '50-contrat-client')
  })

  await test.step('le client fait une demande de report d’échéance', async () => {
    await client.getByRole('button', { name: 'Faire une demande' }).click()
    await client.getByRole('radio', { name: /Report d’échéance/ }).check()
    await client.getByRole('button', { name: 'Envoyer la demande' }).click()
    // Message trop court : refusé côté navigateur (minLength), rien n'est écrit
    await expect(client.getByRole('button', { name: 'Envoyer la demande' })).toBeVisible()
    await client.getByLabel('Votre message').fill('Pouvez-vous décaler l’échéance de janvier ? Trésorerie saisonnière.')
    await client.getByRole('button', { name: 'Envoyer la demande' }).click()
    await expect(client.getByText('Demande envoyée. Un conseiller vous rappelle sous 24 h ouvrées.')).toBeVisible()
    const row = client.getByRole('listitem').filter({ hasText: 'Report d’échéance' })
    await expect(row.getByText('Reçue', { exact: true })).toBeVisible()
    await expect(row.getByText('Pouvez-vous décaler l’échéance de janvier ? Trésorerie saisonnière.')).toBeVisible()
    const { data: rows } = await db.from('contract_requests').select('kind, status, company_id, created_by').eq('request_id', req!.id)
    expect(rows).toEqual([{ kind: 'report_echeance', status: 'recue', company_id: clientContact!.company_id, created_by: run.users.client.id }])
  })

  const admin = await pageAs(browser, 'admin')
  await test.step('l’équipe la voit dans « Demandes », la prend en charge puis répond', async () => {
    await admin.goto('/admin/demandes')
    const line = admin.getByRole('row').filter({ hasText: 'Report d’échéance' }).filter({ hasText: run.companyName })
    await expect(line).toBeVisible()
    await expect(line.getByText('Reçue')).toBeVisible()
    await shot(admin, '51-admin-demandes')
    await line.getByRole('link', { name: /^C-/ }).click()
    await expect(admin).toHaveURL(new RegExp(`/admin/dossiers/${req!.id}$`))

    const card = admin.getByRole('listitem').filter({ hasText: 'Report d’échéance' })
    await card.getByRole('button', { name: 'Prendre en charge' }).click()
    await expect(admin.getByText('Demande prise en charge.')).toBeVisible()
    await expect(card.getByText('En cours')).toBeVisible()
    await card.getByRole('button', { name: 'Répondre' }).click()
    await card.getByPlaceholder(/Réponse envoyée au client/).fill('Le financeur accepte un report d’un mois : échéance de janvier reportée au 1er février.')
    await card.getByRole('button', { name: 'Envoyer la réponse' }).click()
    await expect(admin.getByText('Réponse enregistrée, le client est prévenu.')).toBeVisible()
    await expect(card.getByText('Réponse apportée')).toBeVisible()
    const { data: events } = await db.from('admin_events').select('action').eq('request_id', req!.id).order('created_at')
    expect(events?.map(e => e.action)).toEqual(['Demande client prise en charge', 'Réponse à une demande client'])
  })

  await test.step('le client lit la réponse ; l’équipe clôt', async () => {
    await client.reload()
    const row = client.getByRole('listitem').filter({ hasText: 'Report d’échéance' })
    await expect(row.getByText('Réponse apportée')).toBeVisible()
    await expect(row.getByText(/échéance de janvier reportée au 1er février/)).toBeVisible()
    await shot(client, '52-contrat-client-reponse')

    const card = admin.getByRole('listitem').filter({ hasText: 'Report d’échéance' })
    await card.getByRole('button', { name: 'Clore' }).click()
    await expect(admin.getByText('Demande close.')).toBeVisible()
    await expect(card.getByText('Close', { exact: true })).toBeVisible()
  })

  await test.step('le partenaire voit la nature et l’état d’une demande ouverte, jamais le message', async () => {
    // Dossier apporté par le partenaire, accepté par le financeur : une demande de matériel est ouverte
    const { data: brought } = await db.from('financing_requests').insert({
      user_id: run.users.client.id, company_id: clientContact!.company_id, status: 'leaser_confirmed', total_amount: 3000, duration_months: 36, document_type: 'devis',
      partner_company_id: partnerContact!.company_id, partner_contact_id: partnerContact!.id, client_joined_at: new Date().toISOString(),
    }).select('id').single()
    await db.from('contract_requests').insert({ request_id: brought!.id, company_id: clientContact!.company_id, kind: 'materiel', status: 'recue', message: 'Message confidentiel du client', created_by: run.users.client.id })
    const partner = await pageAs(browser, 'partner')
    await partner.goto('/app/partenaire')
    await expect(partner.getByText('Demande du client : Ajout ou remplacement de matériel · reçue')).toBeVisible()
    await expect(partner.getByText('Message confidentiel du client')).toHaveCount(0)
    await expect(partner.getByText(/Report d’échéance/)).toHaveCount(0)
  })

  await test.step('un autre compte ne voit ni la fiche ni les demandes', async () => {
    const intruder = await pageAs(browser, 'intruder')
    expect((await intruder.goto(`/app/contrats/${req!.id}`))?.status()).toBe(404)
  })
})
