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
