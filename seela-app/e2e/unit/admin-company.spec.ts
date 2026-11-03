import { test, expect } from '@playwright/test'
import { isSiren, parseRegistry } from '../../lib/company-registry'
import {
  classifyDocuments,
  companyAlert,
  compareIdentity,
  formatBytes,
  listCompanies,
  matchesCompanySearch,
  parseCompanyListParams,
  scoreBreakdown,
  toAdminCompany,
  type CompanyProfileRow,
} from '../../lib/admin-company'

// Réponse fictive au format de l'API Recherche d'entreprises (champs utiles seulement)
const registryJson = (patch: Record<string, unknown> = {}) => ({
  results: [
    {
      siren: '123456789',
      nom_raison_sociale: 'ATELIER DUPONT',
      nom_complet: 'ATELIER DUPONT (AD)',
      etat_administratif: 'A',
      date_creation: '2019-03-01',
      date_fermeture: null,
      nature_juridique: '5710',
      activite_principale: '62.01Z',
      tranche_effectif_salarie: '11',
      categorie_entreprise: 'PME',
      nombre_etablissements: 3,
      nombre_etablissements_ouverts: 2,
      siege: { siret: '12345678900021', adresse: '1 RUE DE LA PAIX 75002 PARIS' },
      dirigeants: [
        { type_dirigeant: 'personne physique', nom: 'DUPONT', prenoms: 'JEAN-PIERRE', qualite: 'Président de SAS', date_de_naissance: '1980-01' },
        { type_dirigeant: 'personne morale', denomination: 'HOLDING DUPONT', qualite: 'Commissaire aux comptes' },
      ],
      finances: { '2022': { ca: 800000, resultat_net: 40000 }, '2023': { ca: 950000, resultat_net: -5000 } },
      ...patch,
    },
  ],
})

test('registre : identité, dirigeants (sans date de naissance) et finances triées', () => {
  const c = parseRegistry(registryJson(), '123456789')!
  expect(c).toMatchObject({
    name: 'ATELIER DUPONT',
    active: true,
    createdOn: '2019-03-01',
    legalForm: 'Société par actions simplifiée',
    nafCode: '62.01Z',
    headcount: '10 à 19 salariés',
    siret: '12345678900021',
    address: '1 RUE DE LA PAIX 75002 PARIS',
    establishments: { total: 3, open: 2 },
  })
  expect(c.directors).toEqual([
    { name: 'Jean-Pierre Dupont', role: 'Président de SAS', kind: 'person' },
    { name: 'HOLDING DUPONT', role: 'Commissaire aux comptes', kind: 'company' },
  ])
  expect(JSON.stringify(c)).not.toContain('1980')
  expect(c.finances.map(f => f.year)).toEqual(['2023', '2022'])
})

test('registre : SIREN absent de la réponse ou réponse invalide → null', () => {
  expect(parseRegistry(registryJson(), '999999999')).toBeNull()
  expect(parseRegistry({ results: 'x' }, '123456789')).toBeNull()
  expect(parseRegistry(null, '123456789')).toBeNull()
  expect(isSiren('123456789')).toBe(true)
  expect(isSiren('12345678')).toBe(false)
  expect(isSiren('123 456 789')).toBe(false)
})

test('alerte : société cessée → bandeau avec la date ; active → rien', () => {
  const closed = parseRegistry(registryJson({ etat_administratif: 'C', date_fermeture: '2024-06-30' }), '123456789')
  expect(companyAlert(closed)).toContain('cessée')
  expect(companyAlert(closed)).toContain('30/06/2024')
  expect(companyAlert(parseRegistry(registryJson(), '123456789'))).toBeNull()
  expect(companyAlert(null)).toBeNull()
})

test('identité : écart signalé seulement si les deux sources diffèrent (casse et ponctuation ignorées)', () => {
  const registry = parseRegistry(registryJson(), '123456789')
  const rows = compareIdentity(
    { company_name: 'Atelier Dupont', siren: '123456789', legal_form: 'SARL', naf_code: '62.01Z', date_creation: 2020, supplier_address: null },
    registry,
  )
  const byLabel = Object.fromEntries(rows.map(r => [r.label, r]))
  expect(byLabel['Raison sociale'].mismatch).toBe(false)
  expect(byLabel['Forme juridique'].mismatch).toBe(true)
  expect(byLabel['Code NAF'].mismatch).toBe(false)
  expect(byLabel['Année de création']).toMatchObject({ declared: '2020', registry: '2019', mismatch: true })
  expect(byLabel['Adresse du siège'].mismatch).toBe(false)
  expect(compareIdentity({ company_name: 'X', siren: null, legal_form: null, naf_code: null, date_creation: null, supplier_address: null }, null).every(r => !r.mismatch)).toBe(true)
})

const profileRow = (patch: Partial<CompanyProfileRow> = {}): CompanyProfileRow => ({
  id: 'p1',
  company_name: ' Atelier Dupont ',
  siren: '123456789',
  first_name: 'Jean',
  last_name: 'Dupont',
  email: 'jean@dupont.fr',
  seela_score: 72,
  seela_score_grade: 'B+',
  onboarding_completed: true,
  created_at: '2026-10-01T10:00:00Z',
  financing_requests: [
    { id: 'r1', status: 'draft', total_amount: null, created_at: '2026-10-20T10:00:00Z' },
    { id: 'r2', status: 'submitted', total_amount: 5000, created_at: '2026-10-10T10:00:00Z' },
    { id: 'r3', status: 'offers_available', total_amount: 2500.5, created_at: '2026-10-05T10:00:00Z' },
  ],
  ...patch,
})

test('liste : brouillons exclus du compte, montant cumulé, dernier dossier', () => {
  const c = toAdminCompany(profileRow())
  expect(c).toMatchObject({ name: 'Atelier Dupont', contact: 'Jean Dupont', requestCount: 2, requestedAmount: 7500.5, lastRequestAt: '2026-10-20T10:00:00Z' })
  expect(toAdminCompany(profileRow({ financing_requests: null }))).toMatchObject({ requestCount: 0, lastRequestAt: null })
})

test('liste : recherche (nom sans accent, SIREN partiel, contact, email) et tri par activité', () => {
  const a = toAdminCompany(profileRow())
  expect(matchesCompanySearch(a, 'atélier')).toBe(true)
  expect(matchesCompanySearch(a, '456 78')).toBe(true)
  expect(matchesCompanySearch(a, 'jean dup')).toBe(true)
  expect(matchesCompanySearch(a, 'DUPONT.FR')).toBe(true)
  expect(matchesCompanySearch(a, 'zzz')).toBe(false)

  const old = toAdminCompany(profileRow({ id: 'p2', company_name: 'Ancienne', financing_requests: [], created_at: '2026-01-01T00:00:00Z' }))
  const fresh = toAdminCompany(profileRow({ id: 'p3', company_name: 'Nouvelle', financing_requests: [], created_at: '2026-10-25T00:00:00Z' }))
  expect(listCompanies([old, a, fresh], parseCompanyListParams({})).items.map(c => c.id)).toEqual(['p3', 'p1', 'p2'])
  expect(parseCompanyListParams({ q: 'x', page: '0' })).toEqual({ query: 'x', page: 1 })
})

test('documents : bilans, devis/facture rattachés à leur dossier, autres ; plus récent d’abord', () => {
  const docs = classifyDocuments(
    [
      { path: 'u1/bilans/1-bilan-2023.pdf', size: 1000, createdAt: '2026-10-01T00:00:00Z', mimetype: 'application/pdf' },
      { path: 'u1/111.pdf', size: 2_500_000, createdAt: '2026-10-03T00:00:00Z', mimetype: 'application/pdf' },
      { path: 'u1/222.png', size: 10, createdAt: '2026-10-02T00:00:00Z', mimetype: 'image/png' },
      { path: 'u1/333.pdf', size: null, createdAt: '2026-09-01T00:00:00Z', mimetype: null },
    ],
    [
      { id: '2cfabc4e-1234-4abc-8def-0123456789ab', document_path: 'u1/111.pdf', document_type: 'devis' },
      { id: '9f00aa11-1234-4abc-8def-0123456789ab', document_path: 'u1/222.png', document_type: 'facture' },
      { id: '00000000-1234-4abc-8def-0123456789ab', document_path: null, document_type: 'devis' },
    ],
  )
  expect(docs.map(d => [d.name, d.kind])).toEqual([
    ['111.pdf', 'devis'],
    ['222.png', 'facture'],
    ['1-bilan-2023.pdf', 'bilan'],
    ['333.pdf', 'autre'],
  ])
  expect(docs[0].request).toEqual({ id: '2cfabc4e-1234-4abc-8def-0123456789ab', ref: 'C-2CFA-BC4E' })
  expect([formatBytes(10), formatBytes(2048), formatBytes(2_500_000), formatBytes(null)]).toEqual(['10 o', '2 Ko', '2,4 Mo', '—'])
})

test('score : points par critère et score partiel', () => {
  const s = scoreBreakdown({ anciennete: 15, forme_juridique: 20, chiffre_affaires: 0, resultat: 0, effectif: 0, naf: 10, score_partial: true })!
  expect(s.partial).toBe(true)
  expect(s.rows.find(r => r.label === 'Ancienneté')).toEqual({ label: 'Ancienneté', points: 15, max: 25 })
  expect(scoreBreakdown(null)).toBeNull()
})
