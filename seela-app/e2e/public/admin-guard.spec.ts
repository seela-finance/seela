import { test, expect } from '@playwright/test'

// Fiche dossier admin : sans session → /auth, comme le reste de /admin.
test('/admin/dossiers/[id] redirige vers /auth sans session', async ({ page }) => {
  await page.goto('/admin/dossiers/2cfabc4e-1234-4abc-8def-0123456789ab')
  await expect(page).toHaveURL(/\/auth$/)
})

// Sociétés (liste et fiche) : même garde que le reste de /admin
for (const path of ['/admin/societes', '/admin/societes/2cfabc4e-1234-4abc-8def-0123456789ab']) {
  test(`${path.replace(/[0-9a-f-]{36}/, '[id]')} redirige vers /auth sans session`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/auth$/)
  })
}
