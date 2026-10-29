import { test, expect } from '@playwright/test'

// Toutes les routes /app sont protégées : sans session → /auth.
const protectedRoutes = ['/app', '/app/dashboard', '/app/nouveau', '/app/contrats', '/app/offres', '/app/onboarding']

for (const path of protectedRoutes) {
  test(`${path} redirige vers /auth sans session`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/auth$/)
  })
}

test('/auth affiche connexion et inscription', async ({ page }) => {
  await page.goto('/auth')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Créer un compte' })).toBeVisible()
})

test('inscription : mots de passe différents → erreur', async ({ page }) => {
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Créer un compte' }).click()
  await page.locator('input[type="email"]').fill('e2e@example.com')
  const passwords = page.locator('input[type="password"]')
  await passwords.nth(0).fill('motdepasse-1')
  await passwords.nth(1).fill('motdepasse-2')
  await page.locator('button[type="submit"]').click()
  await expect(page.getByText('Les mots de passe ne correspondent pas.')).toBeVisible()
})
