import { test, expect } from '@playwright/test'

// Le compte de test doit avoir terminé l'onboarding (cf. AGENT.md).
test('dashboard accessible avec CTA nouveau financement', async ({ page }) => {
  await page.goto('/app/dashboard')
  await expect(page).toHaveURL(/\/app\/dashboard/)
  await expect(page.locator('a[href="/app/nouveau"]').first()).toBeVisible()
})

test('le flow de financement démarre', async ({ page }) => {
  await page.goto('/app/nouveau')
  await expect(page).toHaveURL(/\/app\/nouveau/)
  await expect(page.locator('input[type="file"]')).toHaveCount(1)
})
