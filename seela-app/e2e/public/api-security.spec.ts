import { test, expect } from '@playwright/test'

// Garde-fous du Lot 0 sécurité : aucune route coûteuse ou admin n'est appelable sans droit.
test.describe('Sécurité des routes API', () => {
  for (const path of ['/api/analyze', '/api/analyze-bilan', '/api/match-leasers']) {
    test(`${path} refuse un appel non authentifié`, async ({ request }) => {
      const res = await request.post(path, {
        data: { documentUrl: 'https://example.com/devis.pdf', mimeType: 'application/pdf', requestId: crypto.randomUUID() },
      })
      expect(res.status()).toBe(401)
    })
  }

  for (const path of ['/api/validate-offer', '/api/leaser-confirms']) {
    test(`${path} refuse sans token admin`, async ({ request }) => {
      const res = await request.post(path, { data: { offerId: crypto.randomUUID(), decision: 'confirmed' } })
      expect(res.status()).toBe(401)
    })

    test(`${path} refuse "Bearer undefined"`, async ({ request }) => {
      const res = await request.post(path, {
        headers: { Authorization: 'Bearer undefined' },
        data: { offerId: crypto.randomUUID(), decision: 'confirmed' },
      })
      expect(res.status()).toBe(401)
    })
  }

  test('la route de debug du matching n’existe plus', async ({ request }) => {
    const res = await request.post('/api/debug-match', { data: { requestId: crypto.randomUUID(), trigger: true } })
    expect(res.status()).toBe(404)
  })
})
