import { mkdirSync } from 'node:fs'
import { test, expect, type Browser, type Page } from '@playwright/test'
import { readContext, stagingAdmin, stateFile, type Role } from '../support/staging'

// CRM du back-office sur le staging : société, doublon, contact, appel, tâche, deal et pipeline.
// Les données créées portent l'identifiant du run et sont supprimées à la fin.

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
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const scrolls = (el: Element) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX)
    return [...document.querySelectorAll('body *')].filter(el => {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0 || box.right <= width + 1 || getComputedStyle(el).visibility === 'hidden') return false
      for (let p = el.parentElement; p; p = p.parentElement) if (scrolls(p)) return false
      return true
    }).slice(0, 5).map(el => `${el.tagName.toLowerCase()} « ${(el.textContent ?? '').trim().slice(0, 40)} »`)
  })
  expect(overflow, `Débordement à 375 px sur ${name}`).toEqual([])
  if (size) await page.setViewportSize(size)
}

test('CRM : société, doublon SIREN, contact, appel, tâche et deal jusqu’au pipeline', async ({ browser }) => {
  test.setTimeout(180_000)
  const run = readContext()
  const db = stagingAdmin()
  const name = `CRM E2E ${run.runId}`
  const siren = `8${String(parseInt(run.runId, 16) % 1e8).padStart(8, '0')}`
  const admin = await pageAs(browser, 'admin')
  let companyId = ''

  try {
    await test.step('créer une société, puis refuser le même SIREN', async () => {
      await admin.goto('/admin/crm/societes')
      await admin.getByRole('button', { name: 'Nouvelle société' }).click()
      await admin.locator('#crm-name').fill(name)
      await admin.locator('#crm-siren').fill(siren)
      await admin.locator('#crm-domain').fill(`crm-${run.runId}.test`)
      await admin.getByRole('button', { name: 'Créer' }).click()
      await expect(admin.getByRole('heading', { name })).toBeVisible({ timeout: 30_000 })
      const ficheUrl = admin.url()
      companyId = ficheUrl.split('/').pop() ?? ''

      await admin.goto('/admin/crm/societes')
      await admin.getByRole('button', { name: 'Nouvelle société' }).click()
      await admin.locator('#crm-name').fill(`${name} bis`)
      await admin.locator('#crm-siren').fill(siren)
      await admin.getByRole('button', { name: 'Créer' }).click()
      await expect(admin.getByText(`Ce SIREN appartient déjà à « ${name} »`)).toBeVisible()
      await admin.goto(ficheUrl)
    })

    await test.step('ajouter un contact, un appel avec son issue et une tâche', async () => {
      await admin.getByRole('button', { name: '+ Ajouter' }).click()
      await admin.getByPlaceholder('Prénom').fill('Marie')
      await admin.getByPlaceholder('Email').fill(`marie-${run.runId}@everlease.test`)
      await admin.getByRole('button', { name: 'Ajouter le contact' }).click()
      await expect(admin.getByRole('link', { name: 'Marie' })).toBeVisible()

      await admin.getByRole('radio', { name: 'Appel' }).click()
      await admin.getByRole('radio', { name: 'RDV pris' }).check()
      await admin.getByLabel('Contenu').fill(`Premier appel ${run.runId}`)
      await admin.getByRole('button', { name: 'Enregistrer' }).click()
      await expect(admin.getByText(`Premier appel ${run.runId}`)).toBeVisible()
      await expect(admin.getByText('Deal créé en « Pending qualification »')).toBeVisible()
      await expect(admin.getByLabel('Lead status')).toHaveValue('rdv_pris')

      await admin.getByLabel('Intitulé de la tâche').fill(`Envoyer la proposition ${run.runId}`)
      await admin.getByRole('button', { name: 'Ajouter', exact: true }).click()
      await expect(admin.getByText(`Envoyer la proposition ${run.runId}`)).toBeVisible()
      await shot(admin, '20-crm-fiche-societe')
    })

    await test.step('la tâche apparaît dans Ma journée et se termine', async () => {
      await admin.goto('/admin/crm')
      const task = admin.getByRole('listitem').filter({ hasText: `Envoyer la proposition ${run.runId}` })
      await expect(task).toBeVisible()
      await shot(admin, '21-crm-ma-journee')
      await task.getByRole('button', { name: 'Fait' }).click()
      await expect(task).toHaveCount(0)
    })

    await test.step('créer un deal et le faire avancer dans le pipeline', async () => {
      await admin.goto('/admin/crm/deals')
      await admin.getByRole('button', { name: 'Nouveau deal' }).click()
      await admin.locator('#nd-name').fill(`Parc IT ${run.runId}`)
      await admin.locator('#nd-company').selectOption({ label: name })
      await admin.locator('#nd-amount').fill('12000')
      await admin.getByRole('button', { name: 'Créer' }).click()
      const card = admin.getByRole('article').filter({ hasText: `Parc IT ${run.runId}` })
      await expect(admin.getByRole('region', { name: 'Pending qualification' }).getByText(`Parc IT ${run.runId}`)).toBeVisible()
      await card.getByLabel('Étape du deal').selectOption('evaluating')
      await expect(admin.getByRole('region', { name: 'Evaluating' }).getByText(`Parc IT ${run.runId}`)).toBeVisible()
      await shot(admin, '22-crm-deals')
    })

    await test.step('l’écran de session d’appels réunit la société, Lemlist, le dernier appel et les contacts', async () => {
      await admin.goto(`/admin/crm/appels/${companyId}`)
      await expect(admin.getByRole('link', { name, exact: true })).toBeVisible()
      await expect(admin.getByText('Pour l’approche')).toBeVisible()
      await expect(admin.getByText('Contacts à appeler (1)')).toBeVisible()
      await expect(admin.getByText('Hors session d’appels')).toBeVisible()
      await shot(admin, '25-crm-session-appels')
    })

    await test.step('le pré-pipe range la société en RDV pris ; une sortie manuelle demande la raison', async () => {
      await admin.goto('/admin/crm/prospection')
      const column = admin.getByRole('region', { name: 'RDV pris' })
      await expect(column.getByRole('link', { name })).toBeVisible()
      await shot(admin, '24-crm-prospection')
      const card = column.getByRole('article').filter({ hasText: name })
      await card.getByLabel('Lead status').selectOption('disqualifie')
      await card.getByLabel('Raison').selectOption('Pas de besoin')
      await card.getByRole('button', { name: 'OK' }).click()
      await expect(admin.getByRole('region', { name: 'Disqualifié' }).getByRole('link', { name })).toBeVisible()
    })

    await test.step('le contact se retrouve par la recherche', async () => {
      await admin.goto(`/admin/crm/contacts?q=marie-${run.runId}`)
      await admin.getByRole('link', { name: /Marie/ }).first().click()
      await expect(admin.getByRole('heading', { name: 'Marie' })).toBeVisible()
      await shot(admin, '23-crm-fiche-contact')
    })

    const intruder = await pageAs(browser, 'intruder')
    expect((await intruder.goto('/admin/crm/societes'))?.status()).toBe(404)
  } finally {
    const { data } = await db.from('companies').select('id').like('name', `${name}%`)
    const ids = (data ?? []).map(c => c.id as string)
    if (ids.length) {
      await db.from('contacts').delete().in('company_id', ids)
      await db.from('companies').delete().in('id', ids)
    }
  }
})

test('Batches : export brut des batches Lemlist rattachés aux sociétés, réservé à l’équipe', async ({ browser }) => {
  test.setTimeout(120_000)
  const run = readContext()
  const db = stagingAdmin()
  const campaign = `B99 · Batch E2E ${run.runId}`
  let companyId = '', contactId = '', batchId = ''

  try {
    const { data: company, error: cErr } = await db.from('companies').insert({ name: `Batch E2E ${run.runId}`, source: 'E2E' }).select('id').single()
    if (cErr) throw new Error(cErr.message)
    companyId = company.id
    const { data: contact, error: ctErr } = await db.from('contacts').insert({ first_name: 'Paul', email: `paul-${run.runId}@everlease.test`, company_id: companyId }).select('id').single()
    if (ctErr) throw new Error(ctErr.message)
    contactId = contact.id
    const { data: batch, error: bErr } = await db.from('crm_batches')
      .insert({ lemlist_campaign_id: `cam_e2e_${run.runId}`, campaign_name: campaign, code: 'B99', segment: 'Boulangeries IDF', angle: 'Trésorerie', cta: 'Est-ce que je peux vous appeler 10 minutes ?' })
      .select('id').single()
    if (bErr) throw new Error(bErr.message)
    batchId = batch.id
    const { error: lErr } = await db.from('crm_batch_leads').insert({
      batch_id: batchId, contact_id: contactId, company_id: companyId, entered_at: new Date().toISOString(),
      variables: { icebreaker: `Bravo pour l’ouverture du 2e site ${run.runId}` },
    })
    if (lErr) throw new Error(lErr.message)

    const admin = await pageAs(browser, 'admin')
    const exported = await (await admin.request.get('/admin/crm/batches/export')).json()
    expect(exported.batches.find((x: { campaign_name: string }) => x.campaign_name === campaign)).toMatchObject({ segment: 'Boulangeries IDF', cta: 'Est-ce que je peux vous appeler 10 minutes ?', leads: 1, companies: 1, funnel: { deals: 0 } })

    const intruder = await pageAs(browser, 'intruder')
    expect((await intruder.request.get('/admin/crm/batches/export')).status()).toBe(404)
    expect([401, 503]).toContain((await intruder.request.get('/api/crm/batches-export', { headers: { authorization: 'Bearer mauvaise-cle' } })).status())
  } finally {
    if (batchId) await db.from('crm_batches').delete().eq('id', batchId)
    if (contactId) await db.from('contacts').delete().eq('id', contactId)
    if (companyId) await db.from('companies').delete().eq('id', companyId)
  }
})

test('Ajouter des leads : filtrer la base outbound et faire entrer une société choisie dans le pré-pipe', async ({ browser }) => {
  test.setTimeout(120_000)
  const run = readContext()
  const db = stagingAdmin()
  const name = `Outbound E2E ${run.runId}`
  const { data: company, error } = await db.from('companies').insert({ name, lifecycle_stage: 'prospect' }).select('id').single()
  if (error) throw error
  const admin = await pageAs(browser, 'admin')

  try {
    await db.from('contacts').insert({ company_id: company.id, first_name: 'Paul', email: `paul-${run.runId}@everlease.test`, phone: '+33600000000' })

    await test.step('la société froide, hors pré-pipe, apparaît avec les filtres « sans batch » et « froid »', async () => {
      await admin.goto('/admin/crm/prospection')
      await admin.getByRole('link', { name: 'Ajouter des leads outbound' }).click()
      await admin.getByLabel('Batch', { exact: true }).selectOption({ label: 'Sans batch (jamais dans Lemlist)' })
      await admin.getByRole('checkbox', { name: /^Froid/ }).check()
      await admin.getByLabel('Avec téléphone').check()
      const row = admin.getByRole('row').filter({ hasText: name })
      await expect(row).toBeVisible({ timeout: 30_000 })
      await expect(row.getByText('Froid')).toBeVisible()
      await row.getByRole('checkbox', { name: `Choisir ${name}` }).check()
      const add = admin.getByRole('button', { name: /^Ajouter au pré-pipe \(1\)/ })
      await expect(add).toBeEnabled()
      await shot(admin, '26-crm-ajouter-leads')
      await add.click()
      await expect(admin.getByText('1 société ajoutée au pré-pipe outbound.')).toBeVisible()
      await expect(admin.getByRole('row').filter({ hasText: name })).toHaveCount(0)
    })

    await test.step('elle est dans le pré-pipe outbound, en « À contacter »', async () => {
      await admin.goto('/admin/crm/prospection?vue=outbound')
      await expect(admin.getByRole('region', { name: 'À contacter' }).getByRole('link', { name })).toBeVisible()
      const { data } = await db.from('companies').select('lead_status, lead_channel, lead_signal').eq('id', company.id).single()
      expect(data).toEqual({ lead_status: 'a_contacter', lead_channel: 'outbound', lead_signal: 'selection' })
    })

    const intruder = await pageAs(browser, 'intruder')
    expect((await intruder.goto('/admin/crm/prospection/ajouter'))?.status()).toBe(404)
  } finally {
    await db.from('contacts').delete().eq('company_id', company.id)
    await db.from('companies').delete().eq('id', company.id)
  }
})
