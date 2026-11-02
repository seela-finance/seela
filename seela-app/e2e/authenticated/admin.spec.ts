import { test, expect } from '@playwright/test'

// Le compte de test est un client : le back-office doit lui répondre 404, pas 403.
test('un client reçoit 404 sur /admin', async ({ page }) => {
  const res = await page.goto('/admin')
  expect(res?.status()).toBe(404)
  await expect(page.getByText('Back-office everlease')).toHaveCount(0)
})
