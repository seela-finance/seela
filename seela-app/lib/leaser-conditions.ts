// Fiche d'un leaser côté back-office : conversion vers le modèle de calcul et champs « À compléter ».
// Fonctions pures, testées unitairement.
import type { ClientFeeRules, EligibilityRow, GridRow, PricingLeaser } from '@/lib/leaser-pricing'

export type LeaserRecord = {
  id: string
  name: string
  slug: string | null
  public_kind: string | null
  is_active: boolean | null
  min_amount: number | null
  max_amount: number | null
  frais_dossier: number | null
  depot_garantie: number | null
  deposit_terms: string | null
  purchase_option: string | null
  residual_value_pct: number | null
  rent_timing: 'echoir' | 'echu' | null
  periodicites: string[] | null
  insurance_required: boolean | null
  insurance_cost: string | null
  commission_included_pct: number | null
  commission_max_pct: number | null
  markup_pct: number | null
  client_fee_rules: ClientFeeRules | null
  rates_valid_until: string | null
  delai_reponse_heures: number | null
  penalite_resiliation: string | null
  anciennete_min_mois: number | null
  referent_name: string | null
  referent_email: string | null
  referent_phone: string | null
  supplier_conditions: string | null
  internal_notes: string | null
  test_user_id?: string | null
  leaser_rate_grid: GridRow[] | null
  leaser_eligibility: EligibilityRow[] | null
  leaser_financing_types: { financing_type: string }[] | null
}

const num = (v: unknown) => (v == null ? null : Number(v))

export function toPricingLeaser(l: LeaserRecord): PricingLeaser {
  return {
    id: l.id,
    name: l.name,
    is_active: !!l.is_active,
    min_amount: num(l.min_amount),
    max_amount: num(l.max_amount),
    rent_timing: l.rent_timing,
    residual_value_pct: num(l.residual_value_pct),
    commission_included_pct: num(l.commission_included_pct),
    markup_pct: num(l.markup_pct),
    client_fee_rules: l.client_fee_rules,
    financing_types: (l.leaser_financing_types ?? []).map(f => f.financing_type),
    grid: (l.leaser_rate_grid ?? []).map(r => ({
      ...r,
      amount_min: Number(r.amount_min),
      amount_max: num(r.amount_max),
      coefficient_pct: Number(r.coefficient_pct),
    })),
    eligibility: l.leaser_eligibility ?? [],
  }
}

/** Conditions encore inconnues : affichées avec le tag « À compléter » et comptées dans la liste. */
export const CONDITION_FIELDS: { key: keyof LeaserRecord; label: string }[] = [
  { key: 'frais_dossier', label: 'Frais de dossier du leaser' },
  { key: 'purchase_option', label: "Option d'achat ou valeur résiduelle" },
  { key: 'rent_timing', label: 'Loyers à échoir ou échus' },
  { key: 'deposit_terms', label: 'Dépôt de garantie ou premier loyer majoré' },
  { key: 'periodicites', label: 'Périodicités' },
  { key: 'insurance_required', label: 'Assurance obligatoire' },
  { key: 'commission_max_pct', label: 'Commission maximale autorisée' },
  { key: 'rates_valid_until', label: 'Validité du barème' },
  { key: 'delai_reponse_heures', label: 'Délai de réponse' },
  { key: 'referent_email', label: 'Email du référent' },
  { key: 'referent_phone', label: 'Téléphone du référent' },
]

export function missingConditions(l: LeaserRecord): { key: keyof LeaserRecord; label: string }[] {
  return CONDITION_FIELDS.filter(f => {
    const v = l[f.key]
    return v == null || v === '' || (Array.isArray(v) && v.length === 0)
  })
}

/** Barème expiré : date de validité passée (le jour même reste valable). */
export function ratesExpired(validUntil: string | null, now: Date = new Date()): boolean {
  if (!validUntil) return false
  return new Date(`${validUntil}T23:59:59`).getTime() < now.getTime()
}
