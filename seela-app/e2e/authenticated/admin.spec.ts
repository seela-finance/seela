import { test, expect } from '@playwright/test'

// Le compte de test est un client : le back-office doit lui répondre 404, pas 403.
test('un client reçoit 404 sur /admin', async ({ page }) => {
  const res = await page.goto('/admin')
  expect(res?.status()).toBe(404)
  await expect(page.getByText('Back-office everlease')).toHaveCount(0)
})

test('un client reçoit 404 sur une fiche dossier admin', async ({ page }) => {
  const res = await page.goto('/admin/dossiers/2cfabc4e-1234-4abc-8def-0123456789ab')
  expect(res?.status()).toBe(404)
})

test('un client reçoit 404 sur les sociétés du back-office', async ({ page }) => {
  for (const path of ['/admin/societes', '/admin/societes/2cfabc4e-1234-4abc-8def-0123456789ab']) {
    const res = await page.goto(path)
    expect(res?.status()).toBe(404)
  }
})
