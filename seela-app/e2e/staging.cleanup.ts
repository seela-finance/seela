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

    for (const [table, column] of [
      ['admin_events', 'admin_id'],
      ['financing_requests', 'user_id'],
      ['leasers', 'test_user_id'],
      ['admins', 'user_id'],
      ['profiles', 'id'],
    ] as const) {
      const { error: deleteError } = await db.from(table).delete().eq(column, user.id)
      if (deleteError) failures.push(`${table} : ${deleteError.message}`)
    }
    const { error: userError } = await db.auth.admin.deleteUser(user.id)
    if (userError) failures.push(`compte ${user.email} : ${userError.message}`)
  }

  rmSync(AUTH_DIR, { recursive: true, force: true })
  if (failures.length) throw new Error(`Nettoyage incomplet :\n${failures.join('\n')}`)
})
