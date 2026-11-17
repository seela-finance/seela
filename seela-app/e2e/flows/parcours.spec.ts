import { mkdirSync, readFileSync } from 'node:fs'
import { test, expect, type Browser, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { OS, RS } from '../../lib/status'
import { STAGING_REF, readContext, stagingAdmin, stateFile, type Role } from '../support/staging'

// Parcours réels sur le Supabase de staging, avec les comptes éphémères de e2e/staging.seed.ts.
// Seule la réponse du modèle d'IA est simulée (e2e/support/fake-anthropic.mjs) ; aucun email ne part (voir loadStagingEnv).

const SCREENS = 'test-results/screens'
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

/** Dépose un fichier, en réessayant tant que la page n'est pas hydratée (le dépôt serait ignoré). */
async function deposit(page: Page, name: string) {
  const analyze = page.getByRole('button', { name: 'Analyser le document' })
  await expect(async () => {
    await page.locator('input[type="file"]').setInputFiles({ name, mimeType: 'application/pdf', buffer: PDF })
    await expect(analyze).toBeEnabled({ timeout: 1_000 })
  }).toPass({ timeout: 60_000 })
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
    await client.goto('/app/nouveau')
    await deposit(client, 'devis-e2e.pdf')
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
    // Meilleur loyer des barèmes en base : leaser de test, 12 000 € × 3,1 % (Grenke : 3,24 %)
    await expect(client.getByText(/372\s€/).first()).toBeVisible()
    // Durées des barèmes (Grenke : 18 à 63 mois), jamais de nom de leaser
    await expect(client.getByRole('button', { name: '18 mois' })).toBeVisible()
    expect(await client.content()).not.toMatch(/Grenke|Leaser E2E/)
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
  const { data: offer } = await db.from('offers').select('id, monthly_payment, status, public_name').eq('request_id', requestId).eq('leaser_name', run.leaser.name).single()
  expect(offer!.public_name).toMatch(/^Financeur [A-Z] · /)
  expect(Number(offer!.monthly_payment)).toBe(372)

  await test.step('page du dossier et détail de l’offre, sans condition inventée', async () => {
    // Le client voit le nom public, jamais le nom du leaser (ni à l'écran ni dans le HTML)
    await expect(client.getByText(offer!.public_name!).first()).toBeVisible()
    expect(await client.content()).not.toContain(run.leaser.name)
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
    // Analyse crédit lancée après la réponse de soumission (faux modèle) : elle peut arriver quelques secondes plus tard
    await expect(async () => {
      await admin.reload()
      await expect(admin.getByText('Synthèse E2E')).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 45_000 })
    await expect(admin.getByText('Favorable sous réserve')).toBeVisible()
    await expect(admin.getByText('Dernière liasse fiscale')).toBeVisible()
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
    await expect(client.getByText(/Financé par/)).toContainText(offer!.public_name!)
    expect(await client.content()).not.toContain(run.leaser.name)
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

test('un brouillon se reprend sans nouvelle analyse, change de document sans doublon et se supprime', async ({ browser }) => {
  test.setTimeout(180_000)
  const run = readContext()
  const db = stagingAdmin()
  const client = await pageAs(browser, 'client')
  const analyses: string[] = []
  // Les parcours tournent en parallèle sur le même compte : on compte les créations de cet onglet
  const creations: string[] = []
  client.on('request', r => {
    if (r.url().endsWith('/api/analyze')) analyses.push(r.url())
    if (r.method() === 'POST' && r.url().includes('/rest/v1/financing_requests')) creations.push(r.url())
  })
  const loadDraft = async (id: string) => (await db.from('financing_requests').select('id, document_url').eq('id', id).maybeSingle()).data

  await client.goto('/app/nouveau')
  await deposit(client, 'brouillon-e2e.pdf')
  await client.getByRole('button', { name: 'Analyser le document' }).click()
  const installation = client.getByRole('row', { name: /Installation sur site/ }).getByRole('checkbox')
  await expect(installation).toBeChecked({ timeout: 30_000 })
  expect(analyses).toHaveLength(1)

  await test.step('aller-retour 2 → 3 → 2 : sélection conservée, aucune analyse', async () => {
    await installation.uncheck()
    await client.getByRole('button', { name: 'Continuer' }).click()
    await expect(client.getByRole('heading', { name: 'Configuration du financement' })).toBeVisible()
    await client.getByRole('button', { name: 'Retour' }).click()
    await expect(installation).not.toBeChecked()
    expect(analyses).toHaveLength(1)
    await client.getByRole('button', { name: 'Continuer' }).click()
    await expect(client.getByRole('heading', { name: 'Configuration du financement' })).toBeVisible()
  })

  const draftId = new URL(client.url()).searchParams.get('request')!
  const draft = (await loadDraft(draftId))!
  await expect.poll(async () => (await db.from('line_items').select('selected').eq('request_id', draft.id).eq('description', 'Installation sur site').single()).data?.selected).toBe(false)

  await test.step('quitter puis reprendre depuis le tableau de bord : mêmes lignes, sans analyse', async () => {
    await client.goto('/app/dashboard')
    const row = client.getByRole('row').filter({ hasText: `C-${draft.id.slice(0, 4).toUpperCase()}` })
    await row.getByRole('button', { name: 'Reprendre' }).click()
    await expect(client).toHaveURL(new RegExp(`/app/nouveau\\?request=${draft.id}`))
    await expect(client.getByText(/Total sélectionné/)).toContainText(/12\s000\s€/)
    await expect(installation).not.toBeChecked()
    await expect(client.getByText('Fournisseur E2E')).toBeVisible()
    expect(analyses).toHaveLength(1)
  })

  await test.step('changer de document : même dossier, nouvelle analyse, ancien fichier retiré', async () => {
    await client.getByRole('button', { name: 'Retour' }).click()
    await expect(client.getByRole('button', { name: 'Garder ce document' })).toBeVisible()
    await deposit(client, 'autre-e2e.pdf')
    await client.getByRole('button', { name: 'Analyser le document' }).click()
    await expect(installation).toBeChecked({ timeout: 30_000 })
    expect(analyses).toHaveLength(2)

    expect(creations).toHaveLength(1)
    expect((await loadDraft(draft.id))!.document_url).not.toBe(draft.document_url)
    const { count } = await db.from('line_items').select('id', { count: 'exact', head: true }).eq('request_id', draft.id)
    expect(count).toBe(3)
    const oldName = draft.document_url!.split('/').pop()!
    const { data: files } = await db.storage.from('documents').list(run.users.client.id)
    expect(files!.map(f => f.name)).not.toContain(oldName)
  })

  await test.step('un autre client ne peut ni modifier ni supprimer ce brouillon', async () => {
    const intruder = await pageAs(browser, 'intruder')
    await intruder.goto('/app/dashboard')
    const res = await intruder.evaluate(async id => {
      const del = await fetch(`/api/requests/${id}/draft`, { method: 'DELETE' })
      const ai = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: id }) })
      return [del.status, ai.status]
    }, draft.id)
    expect(res).toEqual([404, 404])
    await intruder.context().close()
  })

  await test.step('supprimer le brouillon : dossier, lignes et fichier disparaissent', async () => {
    await client.goto('/app/dashboard')
    client.once('dialog', d => d.accept())
    const row = client.getByRole('row').filter({ hasText: `C-${draft.id.slice(0, 4).toUpperCase()}` })
    await shot(client, '18-brouillon-dashboard')
    await row.getByRole('button', { name: 'Supprimer' }).click()
    await expect(row).toHaveCount(0)
    expect(await loadDraft(draft.id)).toBeNull()
    const { count } = await db.from('line_items').select('id', { count: 'exact', head: true }).eq('request_id', draft.id)
    expect(count).toBe(0)
  })

  await client.context().close()
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
    await expect(client.getByText(/Financeur [A-Z] · /).first()).toBeVisible()
    expect(await client.content()).not.toContain(run.leaser.name)
    await expect(client.getByText(note)).toHaveCount(0)
  })
})

/** Client Supabase avec la session d'un compte de test (lue dans ses cookies) : un appel direct, sans passer par l'app. */
function directClient(role: Role) {
  const { cookies } = JSON.parse(readFileSync(stateFile(role), 'utf8')) as { cookies: { name: string; value: string }[] }
  const prefix = `sb-${STAGING_REF}-auth-token`
  const raw = cookies
    .filter(c => c.name === prefix || c.name.startsWith(`${prefix}.`))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
    .map(c => c.value)
    .join('')
  const session = JSON.parse(raw.startsWith('base64-') ? Buffer.from(raw.slice(7), 'base64').toString('utf8') : decodeURIComponent(raw))
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  })
}

test('offre manuelle puis contre-proposition : le client voit l’ancien loyer barré et accepte', async ({ browser }) => {
  test.setTimeout(180_000)
  const run = readContext()
  const db = stagingAdmin()
  const leaserName = `Financeur manuel ${run.runId}`

  const { data: request, error } = await db
    .from('financing_requests')
    .insert({ user_id: run.users.client.id, status: RS.no_match, document_type: 'devis', total_amount: 15000, duration_months: 48 })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  await db.from('line_items').insert({ request_id: request!.id, description: 'Four mixte', quantity: 1, unit_price: 15000, total_price: 15000, category: 'Industrie', selected: true })

  const admin = await pageAs(browser, 'admin')
  const client = await pageAs(browser, 'client')
  const offerOf = async () => (await db.from('offers').select('id, status, source, monthly_payment, duration_months, previous_terms, client_message, conditions, frais_dossier').eq('request_id', request!.id).single()).data!
  const statusOf = async () => (await db.from('financing_requests').select('status').eq('id', request!.id).single()).data?.status

  await test.step('l’admin ajoute une offre hors grille sur un dossier sans offre', async () => {
    await admin.goto(`/admin/dossiers/${request!.id}`)
    await admin.getByRole('button', { name: 'Ajouter une offre' }).click()
    await admin.getByLabel('Financeur').fill(leaserName)
    await admin.getByLabel('Loyer HT (€)').fill('410')
    await admin.getByLabel('Durée').selectOption('48')
    await admin.getByLabel('Frais de dossier (€)').fill('150')
    await admin.getByLabel('Conditions particulières').fill('Premier loyer majoré de 10 %')
    admin.once('dialog', d => d.accept())
    await admin.getByRole('button', { name: 'Ajouter l’offre' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'Offre ajoutée' })).toBeVisible({ timeout: 30_000 })
    expect(await offerOf()).toMatchObject({ status: OS.indicative, source: 'manual', duration_months: 48, conditions: 'Premier loyer majoré de 10 %' })
    expect(Number((await offerOf()).monthly_payment)).toBe(410)
    expect(await statusOf()).toBe(RS.offers_available)
  })

  await test.step('le client la voit avec ses conditions et la confirme', async () => {
    const offer = await offerOf()
    await client.goto(`/app/offres/${request!.id}/${offer.id}`)
    await expect(client.getByText('Premier loyer majoré de 10 %')).toBeVisible()
    await expect(client.getByRole('row', { name: /Frais de dossier/ })).toContainText(/150\s€/)
    await client.getByRole('button', { name: 'Confirmer ma sélection' }).click()
    await expect(client.getByText('Votre sélection est enregistrée')).toBeVisible()
    expect(await statusOf()).toBe(RS.offer_selected)
  })

  await test.step('un client ne peut ni créer une offre ni modifier la sienne par un appel direct', async () => {
    const direct = directClient('client')
    const { error: insertError } = await direct.from('offers').insert({ request_id: request!.id, leaser_name: 'Pirate', monthly_payment: 1, duration_months: 12 })
    expect(insertError).not.toBeNull()
    await direct.from('offers').update({ monthly_payment: 1, status: OS.counter_offer }).eq('request_id', request!.id)
    expect(Number((await offerOf()).monthly_payment)).toBe(410)
  })

  await test.step('l’admin envoie une contre-proposition', async () => {
    await admin.reload()
    await admin.getByRole('button', { name: 'Contre-proposition' }).click()
    await admin.getByLabel('Nouveau loyer HT (€)').fill('380')
    await admin.getByLabel('Durée').selectOption('60')
    await admin.getByLabel('Message au client').fill('Le financeur accepte sur 60 mois.')
    admin.once('dialog', d => d.accept())
    await admin.getByRole('button', { name: 'Envoyer la contre-proposition' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'Contre-proposition envoyée' })).toBeVisible({ timeout: 30_000 })
    const offer = await offerOf()
    expect(offer).toMatchObject({ status: OS.counter_offer, source: 'counter_offer', duration_months: 60, client_message: 'Le financeur accepte sur 60 mois.' })
    expect(Number((offer.previous_terms as { monthly_payment: number }).monthly_payment)).toBe(410)
    expect(await statusOf()).toBe(RS.counter_offer)
  })

  await test.step('le client voit l’ancien et le nouveau loyer, puis accepte', async () => {
    await client.goto(`/app/offres/${request!.id}`)
    await expect(client.getByText('Le financeur accepte sur 60 mois.')).toBeVisible()
    await expect(client.getByLabel('Ancien loyer')).toHaveText(/410\s€/)
    await expect(client.getByText(/380\s€/).first()).toBeVisible()
    await shot(client, '19-contre-proposition')
    await client.getByRole('button', { name: 'Accepter les conditions' }).click()
    await expect.poll(statusOf, { timeout: 20_000 }).toBe(RS.offer_selected)
    expect(await offerOf()).toMatchObject({ status: OS.client_confirmed, duration_months: 60 })
  })

  await admin.context().close()
  await client.context().close()
})

test('anonymat : le nom du leaser n’apparaît nulle part côté client, ni par un appel direct', async ({ browser }) => {
  test.setTimeout(120_000)
  const run = readContext()
  const db = stagingAdmin()
  const { data: request, error } = await db
    .from('financing_requests')
    .insert({ user_id: run.users.client.id, status: RS.offers_available, document_type: 'devis', total_amount: 8000, duration_months: 36 })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const { data: offer } = await db
    .from('offers')
    .insert({ request_id: request!.id, leaser_name: run.leaser.name, monthly_payment: 250, duration_months: 36, status: OS.indicative })
    .select('id, public_name, leaser_id')
    .single()
  expect(offer).toMatchObject({ public_name: 'Financeur A · Établissement financier', leaser_id: run.leaser.id })

  const client = await pageAs(browser, 'client')
  // Tableau de bord et liste : le financeur n'y figure qu'une fois l'offre choisie ; le nom réel ne doit jamais y être
  for (const path of ['/app/dashboard', '/app/offres', `/app/offres/${request!.id}`, `/app/offres/${request!.id}/${offer!.id}`]) {
    await client.goto(path)
    if (path.includes(request!.id)) await expect(client.getByText(/Financeur A/).first()).toBeVisible()
    else await expect(client.getByRole('heading').first()).toBeVisible()
    expect(await client.content(), path).not.toContain(run.leaser.name)
  }

  const direct = directClient('client')
  expect((await direct.from('leasers').select('name')).error).not.toBeNull()
  expect((await direct.from('leaser_rates').select('coefficient')).error).not.toBeNull()
  expect((await direct.from('offers').select('leaser_name').eq('id', offer!.id)).error).not.toBeNull()
  expect((await direct.from('offers').select('*').eq('id', offer!.id)).error).not.toBeNull()
  const { data: allowed } = await direct.from('offers').select('public_name, monthly_payment').eq('id', offer!.id).single()
  expect(allowed).toMatchObject({ public_name: 'Financeur A · Établissement financier' })

  const visitor = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: anonymous } = await visitor.from('leasers').select('name')
  expect(anonymous ?? []).toEqual([])
  await client.context().close()
})

test('onglet Leasers : liste, simulateur comparatif, et fiche éditable (barème, éligibilité, conditions)', async ({ browser }) => {
  test.setTimeout(180_000)
  const run = readContext()
  const db = stagingAdmin()
  const admin = await pageAs(browser, 'admin')

  await test.step('la liste montre Grenke actif, avec ses champs à compléter', async () => {
    await admin.goto('/admin/leasers')
    // Première ligne : la liste (Grenke figure aussi dans le comparatif en dessous)
    const grenke = admin.getByRole('row').filter({ hasText: 'Grenke' }).first()
    await expect(grenke).toContainText('Actif')
    await expect(grenke).toContainText(/18 à 63 mois/)
    await expect(grenke).toContainText(/\d+ champs/)
    // Les leasers fictifs sont désactivés, le leaser de test n'apparaît pas
    await expect(admin.getByRole('row').filter({ hasText: 'BNP Lease' }).first()).toContainText('Inactif')
    await expect(admin.getByText(run.leaser.name)).toHaveCount(0)
    await shot(admin, '20-admin-leasers')
  })

  await test.step('simulateur comparatif : 20 000 € sur 36 mois chez Grenke', async () => {
    await admin.getByLabel('Montant HT (€)').fill('20000')
    await admin.getByLabel('Durée').selectOption('36')
    const row = admin.getByRole('row').filter({ hasText: 'Grenke' }).last()
    await expect(row).toContainText(/3,23\s%/)
    await expect(row).toContainText(/646,00\s€/)
    await expect(row).toContainText(/10,68\s%\s\/ an/)
    // Les véhicules immatriculés sont exclus chez Grenke
    await admin.getByLabel('Matériel').selectOption('vehicules-immatricules')
    await expect(admin.getByText(/Matériel exclu/).first()).toBeVisible()
    await admin.getByLabel('Matériel').selectOption('')
    await shot(admin, '21-admin-simulateur')
  })

  const leaserPage = `/admin/leasers/${run.leaser.id}`

  // Les autres parcours tournent en même temps sur ce leaser (36 mois, informatique) : on n'y touche pas
  const grid = async () => ((await db.from('leaser_rate_grid').select('amount_min, amount_max, duration_months, coefficient_pct').eq('leaser_id', run.leaser.id).order('duration_months')).data ?? [])
    .map(r => [Number(r.amount_min), r.amount_max == null ? null : Number(r.amount_max), r.duration_months, Number(r.coefficient_pct)])

  await test.step('barème : ajout d’une durée, enregistré en base', async () => {
    await admin.goto(leaserPage)
    await expect(admin.getByLabel('Coefficient 36 mois, tranche 1')).toHaveValue('3,1')
    await admin.getByRole('button', { name: '+ Durée' }).click()
    await admin.getByLabel('Durée, ligne 2').fill('48')
    await admin.getByLabel('Coefficient 48 mois, tranche 1').fill('2,55')
    await admin.getByRole('button', { name: 'Enregistrer le barème' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'Barème enregistré : 2 coefficients' })).toBeVisible({ timeout: 30_000 })
    expect(await grid()).toEqual([[0, null, 36, 3.1], [0, null, 48, 2.55]])
  })

  await test.step('une saisie invalide est refusée sans rien écrire', async () => {
    await admin.reload()
    await admin.getByLabel('Coefficient 48 mois, tranche 1').fill('35')
    await admin.getByRole('button', { name: 'Enregistrer le barème' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'hors bornes' })).toBeVisible({ timeout: 30_000 })
    expect(await grid()).toEqual([[0, null, 36, 3.1], [0, null, 48, 2.55]])
  })

  await test.step('éligibilité : CHR exclu, le reste conservé', async () => {
    await admin.reload()
    await expect(admin.getByLabel('Éligibilité : Informatique & bureautique')).toHaveValue('yes')
    await admin.getByLabel('Éligibilité : CHR & métiers de bouche').selectOption('no')
    await admin.getByLabel('Conditions : CHR & métiers de bouche').fill('Hors périmètre E2E')
    await admin.getByRole('button', { name: 'Enregistrer l’éligibilité' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'Éligibilité enregistrée' })).toBeVisible({ timeout: 30_000 })
    const { data } = await db.from('leaser_eligibility').select('equipment_family, equipment_type, status, conditions').eq('leaser_id', run.leaser.id).order('equipment_family')
    expect(data).toEqual([
      { equipment_family: 'audiovisuel', equipment_type: null, status: 'yes', conditions: null },
      { equipment_family: 'chr', equipment_type: null, status: 'no', conditions: 'Hors périmètre E2E' },
      { equipment_family: 'informatique', equipment_type: null, status: 'yes', conditions: null },
    ])
  })

  await test.step('conditions : frais de dossier et frais client, journalisés', async () => {
    await admin.reload()
    await admin.getByLabel('Frais de dossier du leaser (€ HT)').fill('150')
    await admin.getByRole('button', { name: 'Ajouter un palier' }).click()
    await admin.getByLabel('Taux (%)').fill('1,5')
    await admin.getByRole('button', { name: 'Enregistrer les conditions' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'Conditions enregistrées' })).toBeVisible({ timeout: 30_000 })
    const { data } = await db.from('leasers').select('frais_dossier, client_fee_rules, is_active').eq('id', run.leaser.id).single()
    expect(Number(data?.frais_dossier)).toBe(150)
    expect(data?.client_fee_rules).toEqual({ tiers: [{ up_to: null, rate: 0.015 }], min: null, max: null })
    expect(data?.is_active).toBe(true)
    const { data: events } = await db.from('admin_events').select('action').eq('leaser_id', run.leaser.id)
    expect(events?.map(e => e.action).sort()).toEqual(['Barème du leaser modifié', 'Leaser modifié', 'Éligibilité du leaser modifiée'])
    await shot(admin, '22-admin-fiche-leaser')
  })

  await test.step('le simulateur de la fiche suit le barème enregistré', async () => {
    await admin.getByLabel('Durée').first().selectOption('48')
    await admin.getByLabel('Montant HT (€)').fill('10000')
    await expect(admin.getByText(/255,00\s€/).first()).toBeVisible()
  })

  const client = await pageAs(browser, 'client')
  expect((await client.goto('/admin/leasers'))?.status()).toBe(404)
  expect((await client.goto(leaserPage))?.status()).toBe(404)
  await client.context().close()
  await admin.context().close()
})

test('équipe : un admin ajoute un commercial, change son rôle puis le retire', async ({ browser }) => {
  test.setTimeout(180_000)
  const run = readContext()
  const db = stagingAdmin()
  const admin = await pageAs(browser, 'admin')
  const member = await pageAs(browser, 'member')
  const memberId = run.users.member.id
  const row = admin.getByRole('listitem').filter({ hasText: 'Membre E2E' })

  // Dossier sans offre du client, pour vérifier ce que le commercial peut y faire
  const { data: request, error } = await db
    .from('financing_requests')
    .insert({ user_id: run.users.client.id, status: RS.no_match, document_type: 'devis', total_amount: 100, duration_months: 36 })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  expect((await member.goto('/admin'))?.status()).toBe(404)

  await test.step('ajout : compte inconnu refusé, compte confirmé ajouté en commercial', async () => {
    await admin.goto('/admin/equipe')
    await admin.getByLabel('Email du compte everlease').fill(`inconnu-${run.runId}@everlease.test`)
    await admin.getByLabel('Nom affiché').fill('Inconnu')
    await admin.getByRole('button', { name: 'Ajouter à l’équipe' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'd’abord en créer un' })).toBeVisible({ timeout: 30_000 })

    await admin.getByLabel('Email du compte everlease').fill(run.users.member.email.toUpperCase())
    await admin.getByLabel('Nom affiché').fill('Membre E2E')
    await admin.getByLabel('Rôle').selectOption('commercial')
    await admin.getByRole('button', { name: 'Ajouter à l’équipe' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'a rejoint l’équipe' })).toBeVisible({ timeout: 30_000 })
    await expect(row).toContainText('Commercial')
    const { data } = await db.from('admins').select('name, role').eq('user_id', memberId).single()
    expect(data).toEqual({ name: 'Membre E2E', role: 'commercial' })
    await shot(admin, '23-admin-equipe')
  })

  await test.step('commercial : dossiers et notes, ni leasers, ni équipe, ni décision', async () => {
    await member.goto('/admin')
    await expect(member.getByRole('link', { name: 'Dossiers' })).toBeVisible()
    await expect(member.getByRole('link', { name: 'Leasers' })).toHaveCount(0)
    await expect(member.getByRole('link', { name: 'Équipe' })).toHaveCount(0)
    expect((await member.goto('/admin/leasers'))?.status()).toBe(404)
    expect((await member.goto(`/admin/leasers/${run.leaser.id}`))?.status()).toBe(404)
    expect((await member.goto('/admin/equipe'))?.status()).toBe(404)

    await member.goto(`/admin/dossiers/${request!.id}`)
    await expect(member.getByRole('button', { name: 'Ajouter la note' })).toBeVisible()
    await expect(member.getByRole('button', { name: 'Relancer le matching' })).toHaveCount(0)
    await expect(member.getByRole('button', { name: 'Ajouter une offre' })).toHaveCount(0)
    await expect(member.getByText('Refuser le dossier…')).toHaveCount(0)
    await member.getByLabel('Note interne').fill(`Note du commercial ${run.runId}`)
    await member.getByRole('button', { name: 'Ajouter la note' }).click()
    await expect(member.getByText(`Note du commercial ${run.runId}`)).toBeVisible({ timeout: 30_000 })
  })

  await test.step('passé admin : il voit les leasers', async () => {
    await admin.reload()
    await row.getByRole('button', { name: 'Passer admin' }).click()
    await expect(admin.getByRole('status').filter({ hasText: 'Rôle modifié' })).toBeVisible({ timeout: 30_000 })
    expect((await member.goto('/admin/leasers'))?.status()).toBe(200)
  })

  await test.step('retiré : plus d’accès au back-office, compte et historique conservés', async () => {
    await admin.reload()
    admin.once('dialog', d => d.accept())
    await row.getByRole('button', { name: 'Retirer' }).click()
    // La ligne du membre retiré disparaît de la liste (avec son message)
    await expect(row).toHaveCount(0, { timeout: 30_000 })
    expect((await db.from('admins').select('user_id').eq('user_id', memberId)).data).toEqual([])
    expect((await member.goto('/admin'))?.status()).toBe(404)
    expect((await member.goto('/app/dashboard'))?.status()).toBe(200)
    const { data: events } = await db.from('admin_events').select('action').eq('profile_id', memberId).order('created_at')
    expect(events?.map(e => e.action)).toEqual(['Membre ajouté à l’équipe', 'Rôle modifié', 'Membre retiré de l’équipe'])
  })

  await admin.context().close()
  await member.context().close()
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
