import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test as setup, expect } from '@playwright/test'
import { AUTH_DIR, CONTEXT_FILE, stagingAdmin, stateFile, testEmail, type Role, type RunContext } from './support/staging'

// Crée les comptes éphémères du run (mots de passe aléatoires, jamais écrits ni affichés)
// et un leaser de test réservé au client du run, puis connecte chaque compte par la vraie page /auth.
setup('comptes et leaser de test sur staging', async ({ browser }) => {
  setup.setTimeout(180_000)
  const db = stagingAdmin()
  const runId = randomBytes(5).toString('hex')
  const companyName = `Société E2E ${runId}`
  const roles: Role[] = ['client', 'admin', 'intruder']
  const users = {} as RunContext['users']
  const passwords = {} as Record<Role, string>

  for (const role of roles) {
    const email = testEmail(runId, role)
    passwords[role] = randomBytes(24).toString('base64url')
    const { data, error } = await db.auth.admin.createUser({ email, password: passwords[role], email_confirm: true })
    if (error || !data.user) throw new Error(`Création du compte ${role} : ${error?.message}`)
    users[role] = { id: data.user.id, email }

    const { error: profileError } = await db.from('profiles').upsert({
      id: data.user.id,
      email,
      company_name: role === 'client' ? companyName : `${companyName} (${role})`,
      siren: '123456789',
      first_name: 'Test',
      last_name: role,
      date_creation: 2015,
      onboarding_completed: true,
    })
    if (profileError) throw new Error(`Profil ${role} : ${profileError.message}`)
  }

  const { error: adminError } = await db.from('admins').insert({ user_id: users.admin.id, name: 'Admin E2E' })
  if (adminError) throw new Error(`Admin : ${adminError.message}`)

  // Le matching ne propose un leaser de test qu'à son compte : les autres clients ne le voient pas
  const coefficient = 0.031
  const leaserName = `Leaser E2E ${runId}`
  const { data: leaser, error: leaserError } = await db
    .from('leasers')
    .insert({
      name: leaserName,
      is_active: true,
      test_user_id: users.client.id,
      referent_name: 'Référent E2E',
      referent_email: `leaser-${runId}@everlease.test`,
      min_amount: 1000,
      max_amount: 500000,
      periodicites: ['mensuelle'],
    })
    .select('id')
    .single()
  if (leaserError || !leaser) throw new Error(`Leaser : ${leaserError?.message}`)

  for (const [table, row] of [
    ['leaser_equipment_categories', { category: 'Informatique' }],
    ['leaser_financing_types', { financing_type: 'leasing' }],
    ['leaser_financing_types', { financing_type: 'lease_back' }],
    ['leaser_rates', { duration_months: 36, coefficient, taux_nominal: 5.5 }],
  ] as const) {
    const { error } = await db.from(table).insert({ leaser_id: leaser.id, ...row })
    if (error) throw new Error(`${table} : ${error.message}`)
  }

  mkdirSync(AUTH_DIR, { recursive: true })
  const context: RunContext = { runId, companyName, users, leaser: { id: leaser.id, name: leaserName, coefficient } }
  writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2))

  for (const role of roles) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/auth')
    await page.locator('input[type="email"]').fill(users[role].email)
    await page.locator('input[type="password"]').first().fill(passwords[role])
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 60_000 })
    await ctx.storageState({ path: stateFile(role) })
    await ctx.close()
  }
})
