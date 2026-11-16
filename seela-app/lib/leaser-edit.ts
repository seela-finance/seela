// Fiche leaser éditable (/admin/leasers/[id]) : contrôle de chaque saisie avant écriture.
// Fonctions pures, testées unitairement ; l'écriture est dans app/admin/leasers/[id]/actions.ts.
import { FINANCING_TYPES, isFamily, typeOf } from '@/lib/equipment'
import type { ClientFeeRules, EligibilityRow, GridRow } from '@/lib/leaser-pricing'

/** Erreur à afficher telle quelle à l'admin ; rien n'a été écrit. */
export class LeaserEditError extends Error {}

const PERIODICITES = ['mensuelle', 'trimestrielle', 'annuelle']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Form = Record<string, string | string[] | undefined>

const one = (form: Form, key: string) => {
  const v = form[key]
  return (Array.isArray(v) ? v[0] : v ?? '').trim()
}
const all = (form: Form, key: string) => {
  const v = form[key]
  return (Array.isArray(v) ? v : v ? [v] : []).map(s => s.trim()).filter(Boolean)
}
const text = (form: Form, key: string, max = 2000) => one(form, key).slice(0, max) || null

/** « 1 234,50 », « 2 % » → 1234.5 / 2 ; vide → null ; illisible → erreur nommant le champ. */
export function decimal(raw: string, label: string, { min = 0, max = Number.POSITIVE_INFINITY, integer = false } = {}): number | null {
  const s = raw.replace(/[\s  €%]/g, '').replace(',', '.')
  if (!s) return null
  if (!/^\d+(\.\d+)?$/.test(s)) throw new LeaserEditError(`${label} : nombre illisible.`)
  const n = Number(s)
  if (n < min || n > max || (integer && !Number.isInteger(n))) throw new LeaserEditError(`${label} : valeur hors bornes.`)
  return n
}

/** Barème des frais client : paliers dans l'ordre, chacun fixe (€) ou en % ; plancher et plafond facultatifs. */
export function parseFeeRules(raw: unknown): ClientFeeRules | null {
  if (raw == null || raw === '') return null
  let value: unknown = raw
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) } catch { throw new LeaserEditError('Frais client : format invalide.') }
  }
  const v = value as { tiers?: unknown; min?: unknown; max?: unknown }
  if (!Array.isArray(v?.tiers)) throw new LeaserEditError('Frais client : format invalide.')
  if (v.tiers.length === 0) return null
  const tiers = v.tiers.map((t, i) => {
    const tier = t as { up_to?: unknown; fixed?: unknown; rate?: unknown }
    const upTo = tier.up_to == null || tier.up_to === '' ? null : Number(tier.up_to)
    const fixed = tier.fixed == null || tier.fixed === '' ? null : Number(tier.fixed)
    const rate = tier.rate == null || tier.rate === '' ? null : Number(tier.rate)
    if ((fixed == null) === (rate == null)) throw new LeaserEditError(`Frais client, palier ${i + 1} : indiquez un montant fixe ou un pourcentage.`)
    for (const n of [upTo, fixed, rate]) if (n != null && (!Number.isFinite(n) || n < 0)) throw new LeaserEditError(`Frais client, palier ${i + 1} : valeur invalide.`)
    if (rate != null && rate > 0.2) throw new LeaserEditError(`Frais client, palier ${i + 1} : pourcentage au-dessus de 20 %.`)
    return { up_to: upTo, ...(fixed != null ? { fixed } : { rate }) }
  })
  tiers.forEach((t, i) => {
    if (t.up_to == null && i < tiers.length - 1) throw new LeaserEditError('Frais client : seul le dernier palier peut être sans plafond.')
    if (i > 0 && t.up_to != null && tiers[i - 1].up_to != null && t.up_to <= tiers[i - 1].up_to!) throw new LeaserEditError('Frais client : plafonds des paliers dans l’ordre croissant.')
  })
  const min = v.min == null || v.min === '' ? null : Number(v.min)
  const max = v.max == null || v.max === '' ? null : Number(v.max)
  if ((min != null && (!Number.isFinite(min) || min < 0)) || (max != null && (!Number.isFinite(max) || max < 0))) throw new LeaserEditError('Frais client : plancher ou plafond invalide.')
  if (min != null && max != null && min > max) throw new LeaserEditError('Frais client : plancher au-dessus du plafond.')
  return { tiers, min, max }
}

export type ConditionsPatch = Record<string, unknown>

/** Formulaire des conditions → colonnes de `leasers` et types de financement. Vide = inconnu (null), jamais 0. */
export function parseConditions(form: Form): { patch: ConditionsPatch; financingTypes: string[] } {
  const name = one(form, 'name')
  if (!name) throw new LeaserEditError('Nom : obligatoire.')
  const minAmount = decimal(one(form, 'min_amount'), 'Montant minimum')
  const maxAmount = decimal(one(form, 'max_amount'), 'Montant maximum')
  if (minAmount != null && maxAmount != null && minAmount >= maxAmount) throw new LeaserEditError('Montant minimum au-dessus du maximum.')
  const email = one(form, 'referent_email')
  if (email && !EMAIL.test(email)) throw new LeaserEditError('Email du référent : format invalide.')
  const rentTiming = one(form, 'rent_timing')
  if (rentTiming && rentTiming !== 'echoir' && rentTiming !== 'echu') throw new LeaserEditError('Loyers : à échoir ou échus.')
  const insurance = one(form, 'insurance_required')
  const validUntil = one(form, 'rates_valid_until')
  if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) throw new LeaserEditError('Validité du barème : date invalide.')
  const periodicites = all(form, 'periodicites').filter(p => PERIODICITES.includes(p))
  const financingTypes = all(form, 'financing_types').filter(f => FINANCING_TYPES.some(t => t.slug === f))
  const commissionIncluded = decimal(one(form, 'commission_included_pct'), 'Commission incluse', { max: 20 })
  const commissionMax = decimal(one(form, 'commission_max_pct'), 'Commission maximale', { max: 20 })
  if (commissionIncluded != null && commissionMax != null && commissionIncluded > commissionMax) {
    throw new LeaserEditError('La commission incluse dépasse la commission maximale autorisée.')
  }

  return {
    financingTypes,
    patch: {
      name: name.slice(0, 120),
      public_kind: text(form, 'public_kind', 60) ?? 'Établissement financier',
      is_active: one(form, 'is_active') === 'on',
      min_amount: minAmount,
      max_amount: maxAmount,
      frais_dossier: decimal(one(form, 'frais_dossier'), 'Frais de dossier du leaser'),
      depot_garantie: decimal(one(form, 'depot_garantie'), 'Dépôt de garantie'),
      deposit_terms: text(form, 'deposit_terms'),
      purchase_option: text(form, 'purchase_option'),
      residual_value_pct: decimal(one(form, 'residual_value_pct'), 'Valeur résiduelle', { max: 100 }),
      rent_timing: rentTiming || null,
      periodicites: periodicites.length ? periodicites : null,
      insurance_required: insurance === 'yes' ? true : insurance === 'no' ? false : null,
      insurance_cost: text(form, 'insurance_cost'),
      commission_included_pct: commissionIncluded,
      commission_max_pct: commissionMax,
      markup_pct: decimal(one(form, 'markup_pct'), 'Majoration', { max: 20 }) ?? 0,
      client_fee_rules: parseFeeRules(one(form, 'client_fee_rules')),
      rates_valid_until: validUntil || null,
      delai_reponse_heures: decimal(one(form, 'delai_reponse_heures'), 'Délai de réponse', { max: 720, integer: true }),
      penalite_resiliation: text(form, 'penalite_resiliation'),
      anciennete_min_mois: decimal(one(form, 'anciennete_min_mois'), 'Ancienneté minimale', { max: 600, integer: true }),
      referent_name: text(form, 'referent_name', 120),
      referent_email: email || null,
      referent_phone: text(form, 'referent_phone', 40),
      supplier_conditions: text(form, 'supplier_conditions'),
      internal_notes: text(form, 'internal_notes', 5000),
    },
  }
}

export type GridPayload = {
  bands: { amount_min: number | string; amount_max: number | string | null }[]
  rows: { duration_months: number | string; coefficients: (number | string | null)[] }[]
}

/**
 * Tableau du barème (tranches en colonnes, durées en lignes) → lignes génériques de `leaser_rate_grid`.
 * Une case vide = pas de coefficient pour cette tranche et cette durée.
 */
export function parseGrid(payload: unknown): Omit<GridRow, 'equipment_family' | 'financing_type'>[] {
  const p = payload as GridPayload
  if (!p || !Array.isArray(p.bands) || !Array.isArray(p.rows)) throw new LeaserEditError('Barème : format invalide.')
  const bands = p.bands.map((b, i) => {
    const min = decimal(String(b.amount_min ?? ''), `Tranche ${i + 1}, minimum`)
    const max = decimal(String(b.amount_max ?? ''), `Tranche ${i + 1}, maximum`)
    if (min == null) throw new LeaserEditError(`Tranche ${i + 1} : minimum obligatoire.`)
    if (max != null && max <= min) throw new LeaserEditError(`Tranche ${i + 1} : le maximum doit dépasser le minimum.`)
    return { amount_min: min, amount_max: max }
  })
  bands.forEach((b, i) => {
    if (i === 0) return
    const prev = bands[i - 1]
    if (prev.amount_max == null || b.amount_min <= prev.amount_max) throw new LeaserEditError(`Tranches ${i} et ${i + 1} : elles se chevauchent ou ne sont pas dans l’ordre.`)
  })
  const durations = new Set<number>()
  const out: Omit<GridRow, 'equipment_family' | 'financing_type'>[] = []
  for (const row of p.rows) {
    const d = decimal(String(row.duration_months ?? ''), 'Durée', { min: 6, max: 120, integer: true })
    if (d == null) throw new LeaserEditError('Durée : obligatoire sur chaque ligne.')
    if (durations.has(d)) throw new LeaserEditError(`Durée de ${d} mois en double.`)
    durations.add(d)
    if (!Array.isArray(row.coefficients) || row.coefficients.length !== bands.length) throw new LeaserEditError('Barème : nombre de cases incohérent.')
    row.coefficients.forEach((c, i) => {
      const coef = decimal(String(c ?? ''), `Coefficient ${d} mois, tranche ${i + 1}`, { max: 19.99 })
      if (coef == null) return
      if (coef <= 0) throw new LeaserEditError(`Coefficient ${d} mois, tranche ${i + 1} : doit être positif.`)
      out.push({ ...bands[i], duration_months: d, coefficient_pct: coef })
    })
  }
  return out.sort((a, b) => a.duration_months - b.duration_months || a.amount_min - b.amount_min)
}

/** Matrice d'éligibilité → lignes de `leaser_eligibility`. Statut vide = non renseigné (pas de ligne). */
export function parseEligibility(payload: unknown): EligibilityRow[] {
  if (!Array.isArray(payload)) throw new LeaserEditError('Éligibilité : format invalide.')
  const seen = new Set<string>()
  const rows: EligibilityRow[] = []
  for (const raw of payload as { equipment_family?: unknown; equipment_type?: unknown; status?: unknown; conditions?: unknown }[]) {
    if (!raw?.status) continue
    if (!isFamily(raw.equipment_family)) throw new LeaserEditError('Éligibilité : famille inconnue.')
    const type = raw.equipment_type ? String(raw.equipment_type) : null
    if (type && typeOf(type)?.family.slug !== raw.equipment_family) throw new LeaserEditError('Éligibilité : type inconnu pour cette famille.')
    if (raw.status !== 'yes' && raw.status !== 'no' && raw.status !== 'conditional') throw new LeaserEditError('Éligibilité : statut inconnu.')
    const key = `${raw.equipment_family}|${type ?? ''}`
    if (seen.has(key)) throw new LeaserEditError('Éligibilité : ligne en double.')
    seen.add(key)
    const conditions = typeof raw.conditions === 'string' ? raw.conditions.trim().slice(0, 1000) || null : null
    rows.push({ equipment_family: raw.equipment_family, equipment_type: type, status: raw.status, conditions })
  }
  return rows
}

/** Champs modifiés, pour le journal (avant / après). */
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const b: Record<string, unknown> = {}
  const a: Record<string, unknown> = {}
  // Les numeric arrivent de la base en texte (« 500 ») : comparés comme nombres
  const norm = (v: unknown) => JSON.stringify(typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v ?? null)
  for (const key of Object.keys(after)) {
    if (norm(before[key]) !== norm(after[key])) {
      b[key] = before[key] ?? null
      a[key] = after[key] ?? null
    }
  }
  return { before: b, after: a }
}
