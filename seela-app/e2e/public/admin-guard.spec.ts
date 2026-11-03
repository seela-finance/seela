import { test, expect } from '@playwright/test'

// Fiche dossier admin : sans session → /auth, comme le reste de /admin.
test('/admin/dossiers/[id] redirige vers /auth sans session', async ({ page }) => {
  await page.goto('/admin/dossiers/2cfabc4e-1234-4abc-8def-0123456789ab')
  await expect(page).toHaveURL(/\/auth$/)
})
