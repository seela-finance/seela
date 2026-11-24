import { rmSync } from 'node:fs'
import { test as cleanup } from '@playwright/test'
import { AUTH_DIR, TEST_EMAIL_PATTERN, stagingAdmin, readContext } from './support/staging'

const STALE_AFTER_MS = 2 * 60 * 60 * 1000

// Supprime les comptes du run et ceux d'un run interrompu (plus de 2 h).
// Ne touche qu'aux emails e2e-…@everlease.test : jamais test@everlease.fr ni un vrai compte.
cleanup('suppression des comptes de test', async () => {
  cleanup.setTimeout(120_000)
  const db = stagingAdmin()
  let currentRun: string | null = null
  try {
    currentRun = readContext().runId
  } catch {
    // Le seed a échoué avant d'écrire le contexte : on balaie seulement les anciens comptes
  }

  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`Liste des comptes : ${error.message}`)

  const targets = data.users.filter(u => {
    const email = u.email ?? ''
    if (!TEST_EMAIL_PATTERN.test(email)) return false
    return (currentRun && email.startsWith(`e2e-${currentRun}-`)) || Date.now() - new Date(u.created_at).getTime() > STALE_AFTER_MS
  })

  const failures: string[] = []
  for (const user of targets) {
    const { data: files } = await db.storage.from('documents').list(user.id)
    if (files?.length) await db.storage.from('documents').remove(files.map(f => `${user.id}/${f.name}`))
    for (const sub of ['pieces', 'bilans']) {
      const { data: subFiles } = await db.storage.from('documents').list(`${user.id}/${sub}`)
      if (subFiles?.length) await db.storage.from('documents').remove(subFiles.map(f => `${user.id}/${sub}/${f.name}`))
    }

    const { data: contact } = await db.from('contacts').select('company_id').eq('user_id', user.id).maybeSingle()
    for (const [table, column] of [
      ['admin_events', 'admin_id'],
      ['financing_requests', 'user_id'],
      ['leasers', 'test_user_id'],
      ['admins', 'user_id'],
      ['contacts', 'user_id'],
      ['profiles', 'id'],
    ] as const) {
      const { error: deleteError } = await db.from(table).delete().eq(column, user.id)
      if (deleteError) failures.push(`${table} : ${deleteError.message}`)
    }
    // Société du compte de test, seulement si plus personne n'y est rattaché
    if (contact?.company_id) {
      const { count } = await db.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', contact.company_id)
      if (!count) {
        const { error: companyError } = await db.from('companies').delete().eq('id', contact.company_id).eq('source', 'E2E')
        if (companyError) failures.push(`companies : ${companyError.message}`)
      }
    }
    const { error: userError } = await db.auth.admin.deleteUser(user.id)
    if (userError) failures.push(`compte ${user.email} : ${userError.message}`)
  }

  rmSync(AUTH_DIR, { recursive: true, force: true })
  if (failures.length) throw new Error(`Nettoyage incomplet :\n${failures.join('\n')}`)
})
