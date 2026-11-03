// Registre public des entreprises (API Recherche d'entreprises, data.gouv, gratuite, sans clé) :
// identité, état administratif, siège, dirigeants et effectif d'une société à partir de son SIREN.
// `parseRegistry` est pure (testée sur une réponse réelle) ; `fetchRegistry` est appelée côté serveur.
import { legalFormLabel } from '@/lib/legal-forms'

const API = 'https://recherche-entreprises.api.gouv.fr/search'
// Le registre bouge peu : une journée de cache suffit et évite de solliciter l'API à chaque ouverture
const REVALIDATE_SECONDS = 24 * 3600

export type RegistryDirector = { name: string; role: string | null; kind: 'person' | 'company' }

export type RegistryCompany = {
  siren: string
  name: string | null
  /** A = active, C = cessée (radiée) */
  active: boolean
  closedOn: string | null
  createdOn: string | null
  legalForm: string | null
  nafCode: string | null
  headcount: string | null
  category: string | null
  siret: string | null
  address: string | null
  establishments: { total: number; open: number } | null
  directors: RegistryDirector[]
  /** Derniers chiffres publiés, par année (souvent absents pour les petites sociétés) */
  finances: { year: string; revenue: number | null; netResult: number | null }[]
}

export type RegistryResult =
  | { status: 'ok'; company: RegistryCompany }
  | { status: 'not_found' }
  | { status: 'error' }

// Tranches d'effectif salarié INSEE
const HEADCOUNT: Record<string, string> = {
  NN: 'Non employeuse',
  '00': '0 salarié',
  '01': '1 à 2 salariés',
  '02': '3 à 5 salariés',
  '03': '6 à 9 salariés',
  '11': '10 à 19 salariés',
  '12': '20 à 49 salariés',
  '21': '50 à 99 salariés',
  '22': '100 à 199 salariés',
  '31': '200 à 249 salariés',
  '32': '250 à 499 salariés',
  '41': '500 à 999 salariés',
  '42': '1 000 à 1 999 salariés',
  '51': '2 000 à 4 999 salariés',
  '52': '5 000 à 9 999 salariés',
  '53': '10 000 salariés et plus',
}

export function isSiren(s: unknown): s is string {
  return typeof s === 'string' && /^\d{9}$/.test(s)
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase())
}

/** Extrait la société `siren` d'une réponse de l'API ; null si elle n'y figure pas. */
export function parseRegistry(json: unknown, siren: string): RegistryCompany | null {
  const results = (json as { results?: unknown[] } | null)?.results
  if (!Array.isArray(results)) return null
  const r = results.find(x => (x as { siren?: unknown })?.siren === siren) as Record<string, unknown> | undefined
  if (!r) return null

  const siege = (r.siege ?? {}) as Record<string, unknown>
  const headcountCode = str(r.tranche_effectif_salarie) ?? str(siege.tranche_effectif_salarie)

  const directors: RegistryDirector[] = (Array.isArray(r.dirigeants) ? r.dirigeants : []).flatMap((d): RegistryDirector[] => {
    const x = (d ?? {}) as Record<string, unknown>
    if (x.type_dirigeant === 'personne morale') {
      const name = str(x.denomination)
      return name ? [{ name, role: str(x.qualite), kind: 'company' }] : []
    }
    const name = [str(x.prenoms), str(x.nom)].filter(Boolean).join(' ')
    // Ni date de naissance ni nationalité : inutiles pour qualifier un dossier
    return name ? [{ name: titleCase(name), role: str(x.qualite), kind: 'person' }] : []
  })

  const rawFinances = (r.finances ?? {}) as Record<string, unknown>
  const finances = Object.entries(rawFinances)
    .filter(([year]) => /^\d{4}$/.test(year))
    .map(([year, v]) => {
      const f = (v ?? {}) as Record<string, unknown>
      return { year, revenue: num(f.ca), netResult: num(f.resultat_net) }
    })
    .sort((a, b) => b.year.localeCompare(a.year))

  const total = num(r.nombre_etablissements)
  const open = num(r.nombre_etablissements_ouverts)
  const natureCode = str(r.nature_juridique)

  return {
    siren,
    name: str(r.nom_raison_sociale) ?? str(r.nom_complet),
    active: r.etat_administratif !== 'C',
    closedOn: str(r.date_fermeture),
    createdOn: str(r.date_creation),
    // Même libellé que celui enregistré à l'onboarding (profiles.legal_form) : comparaison directe
    legalForm: legalFormLabel(natureCode),
    nafCode: str(r.activite_principale),
    headcount: headcountCode ? HEADCOUNT[headcountCode] ?? null : null,
    category: str(r.categorie_entreprise),
    siret: str(siege.siret),
    address: str(siege.adresse),
    establishments: total != null ? { total, open: open ?? total } : null,
    directors,
    finances,
  }
}

/** Lecture du registre pour un SIREN, mise en cache 24 h par Next. Ne lève jamais. */
export async function fetchRegistry(siren: string | null | undefined): Promise<RegistryResult> {
  if (!isSiren(siren)) return { status: 'not_found' }
  try {
    const res = await fetch(`${API}?q=${siren}&per_page=1`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { status: 'error' }
    const company = parseRegistry(await res.json(), siren)
    return company ? { status: 'ok', company } : { status: 'not_found' }
  } catch {
    return { status: 'error' }
  }
}
