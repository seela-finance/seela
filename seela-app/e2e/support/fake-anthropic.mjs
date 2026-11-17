// Faux service IA pour `npm run test:staging` : les vraies routes tournent (analyse du document, analyse
// crédit), seule la réponse du modèle est simulée (aucun coût, résultat stable). La réponse dépend du
// prompt système : l'analyse de document reçoit ses lignes (appel d'outil), l'analyste crédit une fiche (texte).
import { createServer } from 'node:http'

const ANALYSIS = {
  supplier: { name: 'Fournisseur E2E', address: '1 rue du Test, Paris', siren: '987654321' },
  document_number: 'DV-E2E-1',
  document_date: '2026-10-01',
  document_kind: 'facture',
  items: [
    { description: 'Serveur de calcul', quantity: 1, unit_price: 10000, total_price: 10000, equipment_type: 'postes-serveurs' },
    { description: 'Écrans 27 pouces', quantity: 4, unit_price: 500, total_price: 2000, equipment_type: 'affichage-ecrans' },
    { description: 'Installation sur site', quantity: 1, unit_price: 1500, total_price: 1500, equipment_type: null },
  ],
}

export const CREDIT_MEMO = {
  avis: 'favorable_sous_reserve',
  confiance: 'moyenne',
  synthese: 'Synthèse E2E : société de test, actif informatique cohérent, montant modéré. Plaçable sous réserve des comptes.',
  points_forts: ['Actif informatique récupérable', 'Montant cohérent avec le devis'],
  points_vigilance: ['Société introuvable au registre (SIREN de test)'],
  questions_client: ['Confirmer le SIREN de la société'],
  pieces_a_demander: ['Dernière liasse fiscale'],
  placement: { financeur_recommande: null, strategie: 'Présenter au financeur éligible une fois les comptes reçus.' },
}

const isCreditAnalyst = body => {
  try {
    return JSON.stringify(JSON.parse(body).system ?? '').includes('analyste crédit')
  } catch {
    return false
  }
}

createServer((req, res) => {
  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    res.setHeader('content-type', 'application/json')
    if (req.method === 'GET') return res.end('{"ok":true}')
    const credit = isCreditAnalyst(body)
    res.end(JSON.stringify({
      id: 'msg_e2e',
      type: 'message',
      role: 'assistant',
      model: 'fake',
      content: credit
        ? [{ type: 'text', text: JSON.stringify(CREDIT_MEMO) }]
        : [{ type: 'tool_use', id: 'toolu_e2e', name: 'enregistrer_analyse', input: ANALYSIS }],
      stop_reason: credit ? 'end_turn' : 'tool_use',
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    }))
  })
}).listen(Number(process.argv[2]), 'localhost')
