import { test, expect } from '@playwright/test'
import {
  buildUserPrompt,
  companyAge,
  computeIndicators,
  CreditAnalysisParseError,
  emailTeamCreditAnalysis,
  indicatorRows,
  opinionInfo,
  parseCreditAnalysis,
  recapHtml,
  recapSubject,
  type CreditDossier,
} from '../../lib/credit-analysis'
import type { RegistryCompany } from '../../lib/company-registry'

// Intl insère des espaces fines insécables dans les montants : on compare sur des espaces simples
const plain = (s: string) => s.replace(/\s/g, ' ')

const NOW = new Date('2026-11-17T09:00:00Z')

const registry = (over: Partial<RegistryCompany> = {}): RegistryCompany => ({
  siren: '123456789', name: 'ACME SAS', active: true, closedOn: null, createdOn: '2015-03-10', legalForm: 'SAS', nafCode: '62.01Z',
  headcount: '10 à 19 salariés', category: 'PME', siret: null, address: null, establishments: null, directors: [],
  finances: [{ year: '2025', revenue: 800000, netResult: 40000 }, { year: '2024', revenue: 700000, netResult: 20000 }],
  ...over,
})

const dossier = (over: Partial<CreditDossier> = {}): CreditDossier => ({
  request: {
    id: '2cfabc4e-1234-4abc-8def-0123456789ab', status: 'offers_available', total_amount: 20000, duration_months: 36, periodicite: 'mensuelle',
    document_type: 'devis', notes: 'Renouvellement du parc', supplier_name: 'Dell', supplier_siren: '351528229', supplier_address: null,
    document_number: 'DV-1', document_date: '2026-11-01', created_at: '2026-11-16T10:00:00Z',
  },
  company: {
    name: 'ACME SAS', siren: '123456789', legal_form: 'SAS', naf_code: '62.01Z', creation_year: 2015, address: null, revenue_bracket: null,
    age_bracket: null, headcount_bracket: null, revenue_declared: 750000, result_declared: 30000, kyc_completed: true,
    financial_docs_uploaded: false, seela_score: 72, seela_score_grade: 'B+', lifecycle_stage: 'client',
  },
  contact: { first_name: 'Ana', last_name: 'Martin', email: 'ana@acme.fr', phone: null, job_title: 'DAF' },
  lines: [
    { description: 'Serveur', quantity: 1, unit_price: 15000, total_price: 15000, category: null, equipment_family: null, equipment_type: 'postes-serveurs', selected: true },
    { description: 'Écrans', quantity: 10, unit_price: 500, total_price: 5000, category: null, equipment_family: null, equipment_type: 'affichage-ecrans', selected: true },
    { description: 'Formation', quantity: 1, unit_price: 2000, total_price: 2000, category: null, equipment_family: null, equipment_type: null, selected: false },
  ],
  offers: [
    { leaser_name: 'Grenke', monthly_payment: 640, duration_months: 36, rate: 6.1, status: 'indicative', selected: false },
    { leaser_name: 'GreenLeaze', monthly_payment: 700, duration_months: 36, rate: 8.2, status: 'indicative', selected: true },
  ],
  history: [{ id: 'old', status: 'active', total_amount: 9000, created_at: '2025-02-01T10:00:00Z' }],
  registry: { status: 'ok', company: registry() },
  supplierRegistry: { status: 'ok', company: registry({ siren: '351528229', name: 'DELL SA' }) },
  // Grenke a déjà une offre sur le dossier : il reste éligible
  leaserVerdicts: [{ name: 'Grenke', reasons: ['Offre déjà faite sur ce dossier'] }, { name: 'GreenLeaze', reasons: [] }, { name: 'BNP Lease', reasons: ['Ancienneté 24 mois, minimum 36 mois'] }],
  ...over,
})

test('indicateurs : loyer de l’offre choisie, finances du registre avant le déclaré, ratios', () => {
  const ind = computeIndicators(dossier(), NOW)
  expect(ind.monthly).toBe(700)
  expect(ind.annualRent).toBe(8400)
  expect(ind.revenue).toBe(800000)
  expect(ind.revenueSource).toBe('registre')
  expect(ind.revenueYear).toBe('2025')
  expect(ind.amountToRevenuePct).toBe(2.5)
  expect(ind.annualRentToRevenuePct).toBe(1.1)
  expect(ind.annualRentToResultPct).toBe(21)
  expect(ind.companyAgeYears).toBe(11)
  expect(ind.mainFamily).toBe('Informatique & bureautique')
  expect(ind.families).toEqual(['Informatique & bureautique', 'Audiovisuel & affichage'])
  expect(ind.eligibleLeasers).toEqual(['Grenke', 'GreenLeaze'])
  expect(ind.previousRequests).toBe(1)
  expect(ind.activeContracts).toBe(1)
  expect(ind.documentAgeDays).toBe(16)
  expect(ind.flags).toEqual([])
})

test('indicateurs : sans offre ni registre, le déclaré sert de repli et les absences deviennent des alertes', () => {
  const ind = computeIndicators(dossier({ offers: [], registry: { status: 'not_found', company: null }, history: [] }), NOW)
  expect(ind.monthly).toBeNull()
  expect(ind.revenue).toBe(750000)
  expect(ind.revenueSource).toBe('déclaré')
  // Année déclarée seule : borne basse (créée le 31 décembre 2015 → 10 ans révolus)
  expect(ind.companyAgeYears).toBe(10)
  expect(ind.flags.map(f => f.code)).toEqual(['registre_introuvable', 'sans_bilan'])
})

test('alertes : société cessée, jeune, trop endettée, lease-back sur facture ancienne, fournisseur = client', () => {
  const ind = computeIndicators(
    dossier({
      request: { ...dossier().request, document_type: 'facture', document_date: '2026-03-01', supplier_siren: '123 456 789 00012', total_amount: 500000 },
      company: { ...dossier().company!, seela_score: 20, kyc_completed: false },
      registry: { status: 'ok', company: registry({ active: false, closedOn: '2026-01-15', createdOn: '2026-05-01', finances: [{ year: '2025', revenue: 600000, netResult: -5000 }] }) },
      history: [{ id: 'r1', status: 'refused', total_amount: 1000, created_at: '2026-01-01T00:00:00Z' }],
      leaserVerdicts: [{ name: 'Grenke', reasons: ['Montant hors barème'] }],
    }),
    NOW,
  )
  const codes = ind.flags.map(f => f.code)
  expect(codes).toEqual(expect.arrayContaining([
    'societe_cessee', 'societe_moins_1_an', 'montant_ca_eleve', 'resultat_negatif', 'facture_ancienne',
    'fournisseur_client', 'aucun_leaser', 'refus_precedent', 'score_faible', 'kyc_incomplet',
  ]))
  expect(ind.flags.find(f => f.code === 'societe_cessee')?.severity).toBe('danger')
  expect(ind.flags.find(f => f.code === 'montant_ca_eleve')?.label).toBe('Montant financé = 83,3 % du CA')
  expect(ind.financingType).toBe('Lease-back')
  expect(ind.refusedRequests).toBe(1)
})

test('companyAge : date exacte du registre, ou borne basse depuis l’année, sinon inconnu', () => {
  expect(companyAge('2015-11-20', 2015, NOW)).toBe(10)
  expect(companyAge('2015-11-10', 2015, NOW)).toBe(11)
  expect(companyAge(null, 2026, NOW)).toBe(0)
  expect(companyAge(null, null, NOW)).toBeNull()
  expect(companyAge('n/a', 1700, NOW)).toBeNull()
})

test('prompt : données du dossier et indicateurs, sans email ni téléphone du contact', () => {
  const d = dossier()
  const prompt = buildUserPrompt(d, computeIndicators(d, NOW), NOW)
  expect(prompt).toContain('C-2CFA-BC4E')
  expect(prompt).toContain('Renouvellement du parc')
  expect(prompt).toContain('"financeurs_eligibles"')
  expect(prompt).toContain('Ancienneté 24 mois, minimum 36 mois')
  expect(prompt).toContain('"fonction_du_contact": "DAF"')
  expect(prompt).not.toContain('ana@acme.fr')
  expect(prompt).not.toContain(d.request.id)
})

test('parse : JSON entouré de texte, listes nettoyées, confiance inconnue → moyenne', () => {
  const a = parseCreditAnalysis(`Voici l'analyse :\n{"avis":"favorable_sous_reserve","confiance":"très haute","synthese":" Dossier sain. ","points_forts":["A", 3, "  "],"points_vigilance":[],"placement":{"financeur_recommande":"Grenke","strategie":"Présenter en direct."}}\nFin.`)
  expect(a.avis).toBe('favorable_sous_reserve')
  expect(a.confiance).toBe('moyenne')
  expect(a.synthese).toBe('Dossier sain.')
  expect(a.points_forts).toEqual(['A'])
  expect(a.questions_client).toEqual([])
  expect(a.placement).toEqual({ financeur_recommande: 'Grenke', strategie: 'Présenter en direct.' })
})

test('parse : réponses inexploitables', () => {
  expect(() => parseCreditAnalysis('pas de json')).toThrow(CreditAnalysisParseError)
  expect(() => parseCreditAnalysis('{"avis":"peut-être","synthese":"x"}')).toThrow(/sans avis/)
  expect(() => parseCreditAnalysis('{"avis":"favorable"}')).toThrow(/sans synthèse/)
  expect(() => parseCreditAnalysis('{"avis":"favorable",}')).toThrow(/JSON invalide/)
  expect(() => parseCreditAnalysis('{"avis":"favorable"')).toThrow(/sans JSON/)
})

test('avis : libellés, valeur inconnue → à compléter', () => {
  expect(opinionInfo('favorable').label).toBe('Favorable')
  expect(opinionInfo('defavorable').label).toBe('Défavorable')
  expect(opinionInfo('n’importe quoi').label).toBe('À compléter')
})

test('email équipe : sujet avec montant et avis, HTML échappé, lien vers la fiche', () => {
  const d = dossier()
  const indicators = computeIndicators(d, NOW)
  const analysis = parseCreditAnalysis('{"avis":"favorable","synthese":"<b>OK</b>","points_forts":["Solide"]}')
  const email = emailTeamCreditAnalysis({ requestRef: 'C-2CFA-BC4E', companyName: 'ACME <SAS>', adminUrl: 'https://everlease.fr/admin/dossiers/x', analysis, indicators, model: 'm' })
  expect(plain(email.subject)).toBe('[everlease] Nouveau dossier C-2CFA-BC4E · ACME <SAS> · 20 000 € · Favorable')
  expect(email.html).toContain('&lt;b&gt;OK&lt;/b&gt;')
  expect(email.html).toContain('ACME &lt;SAS&gt;')
  expect(email.html).toContain('https://everlease.fr/admin/dossiers/x')
  expect(email.html).toContain('Solide')
  expect(plain(indicatorRows(indicators).find(r => r.label === 'Montant / CA')?.value ?? '')).toBe('2,5 %')
})

test('récapitulatif : sujet, compteurs par avis, dossiers sans analyse signalés', () => {
  const recap = {
    since: '2026-11-14T06:00:00Z', until: '2026-11-17T06:00:00Z', analyzedNow: 1, missing: 1,
    items: [
      { id: 'a', ref: 'C-AAAA-0001', companyName: 'ACME', siren: '123456789', status: 'offers_available', amount: 20000, duration: 36, financingType: 'Leasing', createdAt: '2026-11-16T10:00:00Z', avis: 'favorable' as const, synthese: 'Sain.', flags: [], leaserName: 'Grenke', monthly: 640 },
      { id: 'b', ref: 'C-BBBB-0002', companyName: 'Beta', siren: null, status: 'no_match', amount: 5000, duration: 24, financingType: 'Lease-back', createdAt: '2026-11-15T10:00:00Z', avis: null, synthese: null, flags: ['Société cessée au registre'], leaserName: null, monthly: null },
    ],
  }
  expect(plain(recapSubject(recap))).toBe('[everlease] Récap demandes · 2 dossiers reçus · 25 000 €')
  const html = recapHtml(recap, 'https://everlease.fr')
  expect(html).toContain('1 favorable')
  expect(html).toContain('Analyse indisponible')
  expect(html).toContain('Société cessée au registre')
  expect(html).toContain('https://everlease.fr/admin/dossiers/b')
  expect(html).toContain('1 dossier sans analyse')
})
