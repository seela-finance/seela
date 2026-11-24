import { mkdirSync } from 'node:fs'
import { test, expect, type Browser, type Page } from '@playwright/test'
import { readContext, stagingAdmin, stateFile, type Role } from '../support/staging'

// « Mon compte » et les pièces du dossier (docs/pieces-et-compte.md) : le client dépose, l'équipe refuse puis valide,
// le client voit l'état et le motif. Le compte « intruder » n'a aucune pièce au départ.

const SCREENS = 'test-results/screens'
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

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

test('mon compte : le client dépose une pièce, l’équipe la refuse puis la valide, le tableau de bord suit', async ({ browser }) => {
  test.setTimeout(240_000)
  const run = readContext()
  const db = stagingAdmin()
  const client = await pageAs(browser, 'intruder')
  const { data: contact } = await db.from('contacts').select('company_id').eq('user_id', run.users.intruder.id).single()
  const companyId = contact!.company_id as string

  await test.step('tableau de bord : la bannière compte les pièces manquantes', async () => {
    await client.goto('/app/dashboard')
    await expect(client.getByText(/Pièces du dossier : 0\/3/)).toBeVisible()
    await client.getByRole('link', { name: 'Déposer mes pièces' }).click()
    await expect(client).toHaveURL(/\/app\/compte$/)
  })

  await test.step('mon compte : société en lecture, trois pièces à déposer, dépôt du Kbis', async () => {
    await expect(client.getByRole('heading', { name: 'Mon compte' })).toBeVisible()
    await expect(client.getByText('À déposer')).toHaveCount(3)
    await shot(client, '40-mon-compte')
    await client.getByLabel('Déposer : Extrait Kbis').setInputFiles({ name: 'kbis.pdf', mimeType: 'application/pdf', buffer: PDF })
    await expect(client.getByText('En vérification')).toBeVisible({ timeout: 30_000 })
    await expect(client.getByText('kbis.pdf')).toBeVisible()
    const { data: docs } = await db.from('company_documents').select('kind, status, path').eq('company_id', companyId)
    expect(docs).toEqual([expect.objectContaining({ kind: 'kbis', status: 'en_verification', path: expect.stringMatching(new RegExp(`^${run.users.intruder.id}/pieces/kbis-`)) })])
  })

  const admin = await pageAs(browser, 'admin')
  await test.step('l’équipe refuse avec un motif, le client le voit et redépose', async () => {
    await admin.goto(`/admin/crm/societes/${companyId}`)
    const kbis = admin.getByRole('listitem').filter({ hasText: 'Extrait Kbis' })
    await expect(kbis.getByText('En vérification')).toBeVisible()
    await expect(kbis.getByRole('link', { name: 'kbis.pdf' })).toBeVisible()
    await kbis.getByRole('button', { name: 'Refuser' }).click()
    await kbis.getByPlaceholder(/Motif pour le client/).fill('Document illisible, merci de scanner en PDF.')
    await kbis.getByRole('button', { name: 'Confirmer le refus' }).click()
    await expect(admin.getByText('Extrait Kbis refusée, le client est prévenu.')).toBeVisible()
    await shot(admin, '41-admin-pieces')

    await client.reload()
    const row = client.getByRole('listitem').filter({ hasText: 'Extrait Kbis' })
    await expect(row.getByText('Refusée')).toBeVisible()
    await expect(row.getByText('Motif : Document illisible, merci de scanner en PDF.')).toBeVisible()
    await row.getByLabel('Déposer : Extrait Kbis').setInputFiles({ name: 'kbis-v2.pdf', mimeType: 'application/pdf', buffer: PDF })
    await expect(row.getByText('En vérification')).toBeVisible({ timeout: 30_000 })
  })

  await test.step('l’équipe valide, dispense la situation ; le client voit 2/3', async () => {
    await admin.reload()
    const kbis = admin.getByRole('listitem').filter({ hasText: 'Extrait Kbis' })
    await kbis.getByRole('button', { name: 'Valider' }).click()
    await expect(admin.getByText('Extrait Kbis validée.')).toBeVisible()
    const situation = admin.getByRole('listitem').filter({ hasText: 'Situation comptable intermédiaire' })
    await situation.getByRole('button', { name: 'Dispenser cette pièce' }).click()
    await situation.getByPlaceholder(/Motif interne/).fill('Comptes déjà transmis au financeur')
    await situation.getByRole('button', { name: 'Enregistrer la dispense' }).click()
    // Le formulaire disparaît avec la ligne « Non requise » : on vérifie l'état, pas le message
    await expect(situation.getByText('Non requise')).toBeVisible()

    await client.goto('/app/dashboard')
    await expect(client.getByText(/Pièces du dossier : 2\/3/)).toBeVisible()
    await client.goto('/app/compte')
    await expect(client.getByText('2/3 validées')).toBeVisible()
    await expect(client.getByText('Non requise')).toBeVisible()
  })

  await test.step('la transmission d’un dossier sans pièces exige une dérogation motivée', async () => {
    // Un dossier à l'étape « offre choisie » pour le compte sans pièces complètes (la liasse manque encore)
    const { data: req } = await db.from('financing_requests').insert({
      user_id: run.users.intruder.id, company_id: companyId, status: 'offer_selected', total_amount: 5000, duration_months: 36, document_type: 'devis',
    }).select('id').single()
    const { data: offer } = await db.from('offers').insert({
      request_id: req!.id, leaser_name: run.leaser.name, monthly_payment: 155, duration_months: 36, status: 'client_confirmed', selected: true,
    }).select('id').single()
    await admin.goto(`/admin/dossiers/${req!.id}`)
    await expect(admin.getByText('Pièces manquantes : Liasse fiscale')).toBeVisible()
    await admin.getByRole('button', { name: 'Transmettre quand même' }).click()
    await expect(admin.getByText(/Cochez « Transmettre quand même »/)).toBeVisible()
    const { data: still } = await db.from('offers').select('status').eq('id', offer!.id).single()
    expect(still!.status).toBe('client_confirmed')
    await shot(admin, '42-admin-transmission-bloquee')
  })
})
