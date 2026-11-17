import { mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { test, expect, type Browser, type Page } from '@playwright/test'
import { OS, RS } from '../../lib/status'
import { hashToken } from '../../lib/partner-workflow'
import { readContext, stagingAdmin, stateFile, type Role } from '../support/staging'

// Parcours distributeur sur le staging (docs/parcours-distributeur.md) : le partenaire monte le dossier de son client,
// le client le rejoint par son lien et choisit l'offre, l'équipe démarre le contrat, le partenaire suit.

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

test('distributeur : dossier client, invitation, choix de l’offre par le client, contrat démarré et suivi', async ({ browser }) => {
  test.setTimeout(300_000)
  const run = readContext()
  const db = stagingAdmin()
  const partner = await pageAs(browser, 'partner')
  // SIREN du client propre au run : sa société est créée en prospect par l'envoi du partenaire
  const clientSiren = `9${randomBytes(4).readUInt32BE(0).toString().padStart(8, '0').slice(-8)}`

  try {
    await test.step('le partenaire voit « Mes clients » et monte le dossier', async () => {
      await partner.goto('/app/partenaire')
      await expect(partner.getByRole('heading', { name: 'Mes clients' })).toBeVisible()
      await partner.getByRole('link', { name: 'Nouveau dossier client' }).click()
      await expect(partner).toHaveURL(/\/app\/nouveau/)
      const analyze = partner.getByRole('button', { name: 'Analyser le document' })
      await expect(async () => {
        await partner.locator('input[type="file"]').setInputFiles({ name: 'devis-client.pdf', mimeType: 'application/pdf', buffer: PDF })
        await expect(analyze).toBeEnabled({ timeout: 1_000 })
      }).toPass({ timeout: 60_000 })
      await analyze.click()
      await partner.getByRole('button', { name: 'Non, c’est bien un devis' }).or(partner.getByRole('button', { name: "Non, c'est bien un devis" })).click()
      await partner.getByRole('row', { name: /Installation sur site/ }).getByRole('checkbox').uncheck()
      await partner.getByRole('button', { name: 'Continuer' }).click()
      await partner.getByRole('button', { name: '36 mois' }).click()
      await partner.getByRole('button', { name: 'Continuer' }).click()
    })

    await test.step('étape « Votre client » : SIREN et email obligatoires', async () => {
      const send = partner.getByRole('button', { name: 'Envoyer le dossier à mon client' })
      await expect(send).toBeDisabled()
      await partner.getByLabel('SIREN de la société cliente').fill(clientSiren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'))
      await partner.getByLabel('Email de votre interlocuteur').fill(run.users.invitee.email)
      await shot(partner, '30-partenaire-votre-client')
      await send.click()
      await expect(partner).toHaveURL(/\/app\/partenaire\?envoye=/, { timeout: 60_000 })
      await expect(partner.getByText(/Dossier envoyé à/)).toBeVisible()
      await expect(partner.getByText('En attente du client').first()).toBeVisible()
    })

    const requestId = new URL(partner.url()).searchParams.get('envoye')!
    const { data: request } = await db.from('financing_requests')
      .select('status, user_id, partner_company_id, client_joined_at, companies ( siren )').eq('id', requestId).single()
    const { data: partnerContact } = await db.from('contacts').select('company_id').eq('user_id', run.users.partner.id).single()
    expect(request).toMatchObject({ status: RS.offers_available, user_id: run.users.partner.id, partner_company_id: partnerContact!.company_id, client_joined_at: null })
    expect((request as unknown as { companies: { siren: string } }).companies.siren).toBe(clientSiren)
    const { data: offer } = await db.from('offers').select('id, monthly_payment').eq('request_id', requestId).eq('leaser_name', run.partnerLeaser.name).single()
    expect(Number(offer!.monthly_payment)).toBe(372) // 12 000 € × 3,1 %

    await test.step('le suivi du partenaire : loyer indicatif, financeur anonyme', async () => {
      await expect(partner.getByText(/372\s€\s\/\smois/).first()).toBeVisible()
      expect(await partner.content()).not.toMatch(/Grenke|Leaser E2E/)
      await shot(partner, '31-partenaire-mes-clients')
    })

    await test.step('le partenaire ne choisit pas l’offre à la place du client', async () => {
      const res = await partner.request.post(`/api/offers/${offer!.id}/confirm`)
      expect(res.status()).toBe(403)
    })

    // Le jeton n'existe qu'en clair dans l'email (non envoyé en test) : on en pose un connu sur l'invitation
    const token = randomBytes(24).toString('base64url')
    await db.from('request_invitations').update({ token_hash: hashToken(token) }).eq('request_id', requestId).is('accepted_at', null).is('revoked_at', null)

    await test.step('un autre compte ne peut pas utiliser le lien', async () => {
      const intruder = await pageAs(browser, 'intruder')
      await intruder.goto(`/invitation/${token}`)
      await expect(intruder.getByText(/Ce dossier est réservé à/)).toBeVisible()
      const res = await intruder.request.post('/api/invitations/accept', { data: { token } })
      expect(res.status()).toBe(403)
      await intruder.context().close()
    })

    const invitee = await pageAs(browser, 'invitee')
    await test.step('le client invité rejoint le dossier et choisit son offre', async () => {
      await invitee.goto(`/invitation/${token}`)
      await expect(invitee.getByText(/Préparé par/)).toBeVisible()
      expect(await invitee.content()).not.toMatch(/Grenke|Leaser E2E/)
      await shot(invitee, '32-invitation-client')
      await invitee.getByRole('button', { name: 'Accéder à mon dossier' }).click()
      await expect(invitee).toHaveURL(new RegExp(`/app/offres/${requestId}$`), { timeout: 30_000 })
      const res = await invitee.request.post(`/api/offers/${offer!.id}/confirm`)
      expect(res.ok()).toBe(true)
      const { data } = await db.from('financing_requests').select('user_id, status, client_joined_at').eq('id', requestId).single()
      expect(data).toMatchObject({ user_id: run.users.invitee.id, status: RS.offer_selected })
      expect(data!.client_joined_at).not.toBeNull()
    })

    await test.step('le lien ne sert qu’une fois', async () => {
      const intruder = await pageAs(browser, 'intruder')
      const res = await intruder.request.post('/api/invitations/accept', { data: { token } })
      expect(res.status()).toBe(409)
      await intruder.context().close()
    })

    await test.step('l’équipe démarre le contrat ; le partenaire voit la fin du contrat', async () => {
      // Validation et réponse du financeur couvertes par le parcours client : on se place directement à « accepté »
      await db.from('offers').update({ status: OS.leaser_confirmed }).eq('id', offer!.id)
      await db.from('financing_requests').update({ status: RS.leaser_confirmed }).eq('id', requestId)
      const admin = await pageAs(browser, 'admin')
      await admin.goto(`/admin/dossiers/${requestId}`)
      await expect(admin.getByText('Apporté par')).toBeVisible()
      await admin.getByLabel('Date de démarrage').fill('2026-12-01')
      await admin.getByRole('button', { name: 'Passer en contrat actif' }).click()
      await expect(admin.getByText('Contrat démarré le 01/12/2026.')).toBeVisible()
      const { data } = await db.from('financing_requests').select('status, contract_start_date').eq('id', requestId).single()
      expect(data).toMatchObject({ status: RS.active, contract_start_date: '2026-12-01' })

      await partner.goto('/app/partenaire')
      await expect(partner.getByText('Contrat actif').first()).toBeVisible()
      await expect(partner.getByText(/01 déc\.? 2029/)).toBeVisible()
      await shot(partner, '33-partenaire-contrat-actif')

      const { data: partnerCompany } = await db.from('contacts').select('company_id').eq('user_id', run.users.partner.id).single()
      await admin.goto(`/admin/crm/societes/${partnerCompany!.company_id}`)
      await expect(admin.getByText('Partenaire distributeur')).toBeVisible()
      await shot(admin, '34-admin-partenaire')
      await admin.context().close()
    })
  } finally {
    // Société cliente créée par l'envoi (source « Partenaire distributeur ») : le nettoyage ne la connaît pas
    await db.from('financing_requests').delete().eq('partner_company_id', (await db.from('contacts').select('company_id').eq('user_id', run.users.partner.id).single()).data?.company_id ?? '')
    await db.from('companies').delete().eq('siren', clientSiren).eq('source', 'Partenaire distributeur')
  }
})
