// Fiche société du back-office (/admin/societes) : liste, recherche, documents, comparaison
// déclaré / registre et alertes. Fonctions pures : les pages chargent, tout se décide ici.
import { ADMIN_PAGE_SIZE } from '@/lib/admin-requests'
import { requestLabel } from '@/lib/request-label'
import type { RegistryCompany } from '@/lib/company-registry'

// ─── Liste ────────────────────────────────────────────────────────────────────

export type CompanyProfileRow = {
  id: string
  company_name: string | null
  siren: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  seela_score: number | null
  seela_score_grade: string | null
  onboarding_completed: boolean | null
  created_at: string
  financing_requests: { id: string; status: string | null; total_amount: number | null; created_at: string }[] | null
}

export type AdminCompany = {
  id: string
  name: string | null
  siren: string | null
  contact: string | null
  email: string | null
  grade: string | null
  score: number | null
  onboarded: boolean
  requestCount: number
  /** Dossiers soumis (hors brouillons) : montant total demandé */
  requestedAmount: number
  lastRequestAt: string | null
  createdAt: string
}

export function toAdminCompany(row: CompanyProfileRow): AdminCompany {
  const requests = row.financing_requests ?? []
  const submitted = requests.filter(r => r.status && r.status !== 'draft')
  const last = requests.map(r => r.created_at).filter(d => !Number.isNaN(Date.parse(d))).sort().at(-1) ?? null
  return {
    id: row.id,
    name: row.company_name?.trim() || null,
    siren: row.siren?.trim() || null,
    contact: [row.first_name, row.last_name].filter(Boolean).join(' ') || null,
    email: row.email,
    grade: row.seela_score_grade,
    score: row.seela_score,
    onboarded: !!row.onboarding_completed,
    requestCount: submitted.length,
    requestedAmount: submitted.reduce((s, r) => s + (r.total_amount ?? 0), 0),
    lastRequestAt: last,
    createdAt: row.created_at,
  }
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Recherche par raison sociale, SIREN, contact ou email. */
export function matchesCompanySearch(c: AdminCompany, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  return (
    (!!c.name && normalize(c.name).includes(q)) ||
    (!!c.contact && normalize(c.contact).includes(q)) ||
    (!!c.email && c.email.toLowerCase().includes(q)) ||
    (digits.length >= 3 && !!c.siren && c.siren.replace(/\D/g, '').includes(digits))
  )
}

export type CompanyListParams = { query: string; page: number }

export function parseCompanyListParams(sp: Record<string, string | string[] | undefined>): CompanyListParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? ''
  const page = Number.parseInt(one('page'), 10)
  return { query: one('q').slice(0, 100), page: Number.isFinite(page) && page > 1 ? page : 1 }
}

/** Sociétés avec un dossier récent en tête, puis par inscription la plus récente. */
export function listCompanies(companies: AdminCompany[], params: CompanyListParams) {
  const sorted = companies
    .filter(c => matchesCompanySearch(c, params.query))
    .sort((a, b) =>
      Date.parse(b.lastRequestAt ?? b.createdAt) - Date.parse(a.lastRequestAt ?? a.createdAt),
    )
  const pageCount = Math.max(1, Math.ceil(sorted.length / ADMIN_PAGE_SIZE))
  const page = Math.min(params.page, pageCount)
  return { total: sorted.length, page, pageCount, items: sorted.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE) }
}

// ─── Documents ───────────────────────────────────────────────────────────────

export type StoredFile = { path: string; size: number | null; createdAt: string | null; mimetype: string | null }

export type CompanyDocument = StoredFile & {
  name: string
  kind: 'bilan' | 'devis' | 'facture' | 'autre'
  /** Dossier d'origine pour un devis / une facture */
  request: { id: string; ref: string } | null
}

export const DOCUMENT_KIND_LABEL: Record<CompanyDocument['kind'], string> = {
  bilan: 'Bilans et liasses',
  devis: 'Devis',
  facture: 'Factures',
  autre: 'Autres documents',
}

/**
 * Classe les fichiers du dossier storage du client : `bilans/` = bilans, un fichier rattaché
 * à un dossier = devis ou facture (selon le type déclaré), le reste = autre. Plus récent d'abord.
 */
export function classifyDocuments(
  files: StoredFile[],
  requests: { id: string; document_path: string | null; document_type: string | null }[],
): CompanyDocument[] {
  const byPath = new Map(requests.filter(r => r.document_path).map(r => [r.document_path as string, r]))
  return files
    .map(f => {
      const request = byPath.get(f.path)
      const name = f.path.split('/').pop() ?? f.path
      const kind: CompanyDocument['kind'] = f.path.split('/')[1] === 'bilans'
        ? 'bilan'
        : request?.document_type === 'facture'
          ? 'facture'
          : request
            ? 'devis'
            : 'autre'
      return { ...f, name, kind, request: request ? { id: request.id, ref: requestLabel(request) } : null }
    })
    .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '') || a.name.localeCompare(b.name))
}

export function formatBytes(n: number | null): string {
  if (n == null) return '—'
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

// ─── Identité : déclaré par le client vs registre public ─────────────────────

export type DeclaredIdentity = {
  company_name: string | null
  siren: string | null
  legal_form: string | null
  naf_code: string | null
  date_creation: number | null
  supplier_address: string | null
}

export type IdentityRow = { label: string; declared: string | null; registry: string | null; mismatch: boolean }

const compact = (s: string | null) => (s ? normalize(s).replace(/[^a-z0-9]/g, '') : '')

/** Une ligne par champ ; écart signalé seulement quand les deux sources sont renseignées. */
export function compareIdentity(declared: DeclaredIdentity, registry: RegistryCompany | null): IdentityRow[] {
  const registryYear = registry?.createdOn?.slice(0, 4) ?? null
  const rows: Omit<IdentityRow, 'mismatch'>[] = [
    { label: 'Raison sociale', declared: declared.company_name, registry: registry?.name ?? null },
    { label: 'Forme juridique', declared: declared.legal_form, registry: registry?.legalForm ?? null },
    { label: 'Code NAF', declared: declared.naf_code, registry: registry?.nafCode ?? null },
    { label: 'Année de création', declared: declared.date_creation ? String(declared.date_creation) : null, registry: registryYear },
    { label: 'Adresse du siège', declared: declared.supplier_address, registry: registry?.address ?? null },
  ]
  return rows.map(r => ({
    ...r,
    mismatch: !!r.declared && !!r.registry && compact(r.declared) !== compact(r.registry),
  }))
}

// ─── Alertes ─────────────────────────────────────────────────────────────────

/** Message du bandeau rouge, ou null. Société cessée = alerte en tête de fiche société et dossier. */
export function companyAlert(registry: RegistryCompany | null): string | null {
  if (!registry || registry.active) return null
  const since = registry.closedOn ? ` depuis le ${new Date(registry.closedOn).toLocaleDateString('fr-FR')}` : ''
  return `Société cessée au registre${since} : ne pas transmettre de dossier sans vérification.`
}

// ─── Score ───────────────────────────────────────────────────────────────────

// Barème de /api/score-seela : points obtenus / maximum par critère
const SCORE_CRITERIA: { key: string; label: string; max: number }[] = [
  { key: 'anciennete', label: 'Ancienneté', max: 25 },
  { key: 'forme_juridique', label: 'Forme juridique', max: 20 },
  { key: 'chiffre_affaires', label: "Chiffre d'affaires", max: 15 },
  { key: 'resultat', label: 'Résultat positif', max: 10 },
  { key: 'effectif', label: 'Effectif', max: 10 },
  { key: 'naf', label: 'Secteur (NAF)', max: 10 },
]

export function scoreBreakdown(details: unknown): { rows: { label: string; points: number | null; max: number }[]; partial: boolean } | null {
  if (!details || typeof details !== 'object') return null
  const d = details as Record<string, unknown>
  return {
    rows: SCORE_CRITERIA.map(c => ({ label: c.label, max: c.max, points: typeof d[c.key] === 'number' ? (d[c.key] as number) : null })),
    partial: d.score_partial === true,
  }
}
