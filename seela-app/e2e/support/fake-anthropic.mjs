// Faux service IA pour `npm run test:staging` : la vraie route /api/analyze tourne et enregistre
// ses lignes, seule la réponse du modèle est simulée (aucun coût, résultat stable).
import { createServer } from 'node:http'

const ANALYSIS = {
  supplier: { name: 'Fournisseur E2E', address: '1 rue du Test, Paris', siren: '987654321' },
  document_number: 'DV-E2E-1',
  document_date: '2026-10-01',
  document_kind: 'facture',
  items: [
    { description: 'Serveur de calcul', quantity: 1, unit_price: 10000, total_price: 10000, category: 'Informatique' },
    { description: 'Écrans 27 pouces', quantity: 4, unit_price: 500, total_price: 2000, category: 'Informatique' },
    { description: 'Installation sur site', quantity: 1, unit_price: 1500, total_price: 1500, category: 'Autre' },
  ],
}

createServer((req, res) => {
  req.resume()
  req.on('end', () => {
    res.setHeader('content-type', 'application/json')
    if (req.method === 'GET') return res.end('{"ok":true}')
    res.end(JSON.stringify({
      id: 'msg_e2e',
      type: 'message',
      role: 'assistant',
      model: 'fake',
      content: [{ type: 'text', text: JSON.stringify(ANALYSIS) }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    }))
  })
}).listen(Number(process.argv[2]), 'localhost')
