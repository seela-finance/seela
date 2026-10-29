import { test as setup, expect } from '@playwright/test'

// Connecte le compte de test (Supabase staging) et sauvegarde la session.
setup('login compte de test', async ({ page }) => {
  await page.goto('/auth')
  await page.locator('input[type="email"]').fill(process.env.E2E_USER_EMAIL!)
  await page.locator('input[type="password"]').first().fill(process.env.E2E_USER_PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/app\/(dashboard|onboarding)/)
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
