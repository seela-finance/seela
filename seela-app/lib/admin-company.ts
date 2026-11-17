// Fiche compte client du back-office (/admin/societes/[id]) : documents, comparaison
// déclaré / registre et alertes. Fonctions pures : les pages chargent, tout se décide ici.
import { requestLabel } from '@/lib/request-label'
import type { RegistryCompany } from '@/lib/company-registry'

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

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

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
