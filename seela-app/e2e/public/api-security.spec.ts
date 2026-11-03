import { test, expect } from '@playwright/test'

// Garde-fous du Lot 0 sécurité : aucune route coûteuse ou admin n'est appelable sans droit.
test.describe('Sécurité des routes API', () => {
  for (const path of ['/api/analyze', '/api/analyze-bilan']) {
    test(`${path} refuse un appel non authentifié`, async ({ request }) => {
      const res = await request.post(path, {
        data: { documentUrl: 'https://example.com/devis.pdf', mimeType: 'application/pdf', requestId: crypto.randomUUID() },
      })
      expect(res.status()).toBe(401)
    })
  }

  // Validation et réponse leaser passent par le back-office (#33) : les anciennes routes à token n'existent plus.
  for (const path of ['/api/validate-offer', '/api/leaser-confirms']) {
    test(`${path} n’existe plus`, async ({ request }) => {
      const res = await request.post(path, { data: { offerId: crypto.randomUUID(), decision: 'confirmed' } })
      expect(res.status()).toBe(404)
    })
  }

  // Soumission et confirmation côté serveur (#21) : session obligatoire
  for (const path of [`/api/requests/${crypto.randomUUID()}/submit`, `/api/offers/${crypto.randomUUID()}/confirm`, `/api/offers/${crypto.randomUUID()}/decline`]) {
    test(`${path.replace(/[0-9a-f-]{36}/, '[id]')} refuse un appel non authentifié`, async ({ request }) => {
      const res = await request.post(path, { data: {} })
      expect(res.status()).toBe(401)
    })
  }

  test('le matching n’est plus déclenchable depuis le navigateur', async ({ request }) => {
    const res = await request.post('/api/match-leasers', { data: { requestId: crypto.randomUUID() } })
    expect(res.status()).toBe(404)
  })

  test('la route de debug du matching n’existe plus', async ({ request }) => {
    const res = await request.post('/api/debug-match', { data: { requestId: crypto.randomUUID(), trigger: true } })
    expect(res.status()).toBe(404)
  })
})
