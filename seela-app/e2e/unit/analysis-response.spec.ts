import { test, expect } from '@playwright/test'
import { ClientActionError } from '../../lib/client-workflow'
import { ANALYSIS_TOOL, ANALYSIS_TOOL_NAME, TRUNCATED_MESSAGE, readAnalysisResponse } from '../../lib/analysis-response'
import { parseAnalysis } from '../../lib/draft-workflow'

// Devis de 60 lignes, dont des descriptions avec guillemets (« Écran 27" ») qui cassaient l'ancien JSON en texte
const longQuote = {
  document_kind: 'devis',
  supplier: { name: 'Fournisseur', address: null, siren: null },
  document_number: 'DV-60',
  document_date: '2026-11-17',
  items: Array.from({ length: 60 }, (_, i) => ({
    description: `Écran 27" modèle ${i + 1}, pied "ergo"`,
    quantity: 2,
    unit_price: 300,
    total_price: 600,
    equipment_type: null,
  })),
}

test('un long devis rendu par l’outil est lu en entier, guillemets compris', () => {
  const raw = readAnalysisResponse({
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', name: ANALYSIS_TOOL_NAME, input: longQuote }],
  })
  const { lines, documentKind } = parseAnalysis(raw)
  expect(lines).toHaveLength(60)
  expect(lines[59].description).toBe('Écran 27" modèle 60, pied "ergo"')
  expect(documentKind).toBe('devis')
})

test('une réponse coupée donne un message clair au client, pas une erreur technique', () => {
  const run = () => readAnalysisResponse({
    stop_reason: 'max_tokens',
    content: [{ type: 'tool_use', name: ANALYSIS_TOOL_NAME, input: { items: [] } }],
  })
  expect(run).toThrow(ClientActionError)
  expect(run).toThrow(TRUNCATED_MESSAGE)
})

test('l’ancien format texte reste lu', () => {
  const raw = readAnalysisResponse({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: `Voici : ${JSON.stringify({ items: [{ description: 'Serveur', total_price: 100 }] })}` }],
  })
  expect(parseAnalysis(raw).lines).toHaveLength(1)
})

test('une réponse sans analyse échoue', () => {
  expect(() => readAnalysisResponse({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Désolé' }] })).toThrow()
})

test('le schéma de l’outil exige les champs lus par parseAnalysis', () => {
  expect(ANALYSIS_TOOL.input_schema.required).toEqual(['document_kind', 'supplier', 'document_number', 'document_date', 'client', 'items'])
  expect(ANALYSIS_TOOL.input_schema.properties.items.items.required).toContain('total_price')
})
