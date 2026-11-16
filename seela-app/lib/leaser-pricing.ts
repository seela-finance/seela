// Calcul d'un financement à partir du barème d'un leaser : tranche, loyer, coût, taux implicite,
// commission et frais everlease. Fonctions pures, sans dépendance serveur : testées unitairement,
// utilisées par le simulateur du back-office et par le matching.
import { familyOf, typeOf } from '@/lib/equipment'

export type GridRow = {
  amount_min: number
  amount_max: number | null
  duration_months: number
  /** Coefficient mensuel en % du montant financé HT (3,23 = 3,23 % par mois). */
  coefficient_pct: number
  equipment_family: string | null
  financing_type: string | null
}

export type EligibilityRow = {
  equipment_family: string
  equipment_type: string | null
  status: 'yes' | 'no' | 'conditional'
  conditions: string | null
}

/** Paliers évalués dans l'ordre : le premier dont `up_to` couvre le montant s'applique (null = sans plafond). */
export type ClientFeeRules = {
  tiers: { up_to: number | null; fixed?: number | null; rate?: number | null }[]
  min?: number | null
  max?: number | null
}

export type PricingLeaser = {
  id: string
  name: string
  is_active: boolean
  min_amount: number | null
  max_amount: number | null
  rent_timing: 'echoir' | 'echu' | null
  residual_value_pct: number | null
  commission_included_pct: number | null
  markup_pct: number | null
  client_fee_rules: ClientFeeRules | null
  financing_types: string[]
  grid: GridRow[]
  eligibility: EligibilityRow[]
}

export type SimulationInput = {
  amount: number
  duration: number
  /** Famille ou type de matériel (slug de lib/equipment.ts) ; null = non précisé. */
  equipment: string | null
  financingType: 'leasing' | 'lease_back' | 'credit_bail'
  /** Remplacent les valeurs du leaser ; null = celles du leaser. */
  rentTiming?: 'echoir' | 'echu' | null
  residualValuePct?: number | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Ligne du barème pour un montant et une durée. Parmi les lignes qui couvrent le montant et la durée,
 * la plus précise l'emporte : famille du matériel, puis type de financement ; une ligne générique (null) sinon.
 */
export function pickGridRow(grid: GridRow[], q: { amount: number; duration: number; family: string | null; financingType: string }): GridRow | null {
  const candidates = grid.filter(r =>
    r.duration_months === q.duration
    && q.amount >= Number(r.amount_min)
    && (r.amount_max == null || q.amount <= Number(r.amount_max))
    && (r.equipment_family == null || r.equipment_family === q.family)
    && (r.financing_type == null || r.financing_type === q.financingType))
  const precision = (r: GridRow) => (r.equipment_family ? 2 : 0) + (r.financing_type ? 1 : 0)
  return candidates.sort((a, b) => precision(b) - precision(a))[0] ?? null
}

/** Durées couvertes par le barème pour ce montant (toutes familles et tous financements confondus). */
export function coveredDurations(grid: GridRow[], amount?: number): number[] {
  return [...new Set(grid
    .filter(r => amount == null || (amount >= Number(r.amount_min) && (r.amount_max == null || amount <= Number(r.amount_max))))
    .map(r => r.duration_months))].sort((a, b) => a - b)
}

/** Tranches distinctes du barème, dans l'ordre (colonnes du tableau du back-office). */
export function amountBands(grid: GridRow[]): { amount_min: number; amount_max: number | null }[] {
  const seen = new Map<string, { amount_min: number; amount_max: number | null }>()
  for (const r of grid) seen.set(`${r.amount_min}|${r.amount_max}`, { amount_min: Number(r.amount_min), amount_max: r.amount_max == null ? null : Number(r.amount_max) })
  return [...seen.values()].sort((a, b) => a.amount_min - b.amount_min)
}

/**
 * Taux annuel implicite (TRI mensuel × 12) d'un financement où le client reçoit 1 et paie `coefficient`
 * chaque mois pendant `months` mois, en début (à échoir) ou en fin de mois (échu), plus une valeur
 * résiduelle en fin de contrat (en fraction du montant). Résolu par dichotomie.
 */
export function implicitAnnualRate(coefficient: number, months: number, timing: 'echoir' | 'echu' = 'echoir', residual = 0): number {
  if (coefficient <= 0 || months <= 0) return Number.NaN
  const presentValue = (r: number) => {
    const v = 1 / (1 + r)
    let pv = 0
    for (let k = timing === 'echoir' ? 0 : 1; k < (timing === 'echoir' ? months : months + 1); k++) pv += coefficient * v ** k
    return pv + residual * v ** months
  }
  // Rendement nul ou négatif : le client paie moins que le montant reçu
  if (presentValue(0) <= 1) return 0
  let lo = 0
  let hi = 1
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (presentValue(mid) > 1) lo = mid
    else hi = mid
  }
  return ((lo + hi) / 2) * 12
}

/** Frais de dossier client everlease selon le barème du leaser ; 0 sans barème. */
export function clientFee(amount: number, rules: ClientFeeRules | null | undefined): number {
  if (!rules?.tiers?.length) return 0
  const tier = rules.tiers.find(t => t.up_to == null || amount <= t.up_to) ?? rules.tiers[rules.tiers.length - 1]
  let fee = tier.fixed != null ? tier.fixed : (tier.rate ?? 0) * amount
  if (rules.min != null) fee = Math.max(fee, rules.min)
  if (rules.max != null) fee = Math.min(fee, rules.max)
  return round2(fee)
}

export type Eligibility = { status: 'yes' | 'no' | 'conditional' | 'unknown'; conditions: string | null }

/** Éligibilité d'un matériel : la ligne du type précis l'emporte sur celle de la famille. Sans matériel : oui. */
export function eligibilityFor(rows: EligibilityRow[], equipment: string | null): Eligibility {
  if (!equipment) return { status: 'yes', conditions: null }
  const typed = typeOf(equipment)
  const family = typed?.family.slug ?? familyOf(equipment)?.slug ?? null
  if (!family) return { status: 'unknown', conditions: null }
  const byType = typed ? rows.find(r => r.equipment_family === family && r.equipment_type === typed.type.slug) : undefined
  const byFamily = rows.find(r => r.equipment_family === family && r.equipment_type == null)
  const row = byType ?? byFamily
  return row ? { status: row.status, conditions: row.conditions } : { status: 'unknown', conditions: null }
}

const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export type Simulation = {
  leaser: PricingLeaser
  exclusions: string[]
  warnings: string[]
  row: GridRow | null
  /** Coefficient du barème (commission everlease incluse), en % par mois. */
  coefficientPct: number | null
  /** Coefficient affiché au client, après majoration éventuelle, arrondi au centième. */
  clientCoefficientPct: number | null
  monthly: number | null
  total: number | null
  totalPct: number | null
  financingCost: number | null
  annualRate: number | null
  annualRateExCommission: number | null
  commission: number | null
  markupRevenue: number | null
  clientFee: number | null
  everleaseRevenue: number | null
  takeRatePct: number | null
  rentTiming: 'echoir' | 'echu'
  residualValuePct: number
}

/** Simule un dossier chez un leaser ; `exclusions` non vide = le leaser ne peut pas le financer. */
export function simulate(leaser: PricingLeaser, input: SimulationInput): Simulation {
  const family = typeOf(input.equipment)?.family.slug ?? familyOf(input.equipment)?.slug ?? null
  const rentTiming = input.rentTiming ?? leaser.rent_timing ?? 'echoir'
  const residualValuePct = input.residualValuePct ?? leaser.residual_value_pct ?? 0
  const exclusions: string[] = []
  const warnings: string[] = []

  if (!leaser.is_active) exclusions.push('Leaser inactif')
  if (leaser.min_amount != null && input.amount < leaser.min_amount) exclusions.push(`Montant sous le minimum de ${eur(leaser.min_amount)}`)
  if (leaser.max_amount != null && input.amount > leaser.max_amount) exclusions.push(`Montant au-dessus du maximum de ${eur(leaser.max_amount)}`)
  if (!leaser.financing_types.includes(input.financingType)) exclusions.push(`Financement non couvert : ${input.financingType === 'lease_back' ? 'lease-back' : input.financingType === 'credit_bail' ? 'crédit-bail' : 'leasing'}`)

  const eligibility = eligibilityFor(leaser.eligibility, input.equipment)
  if (eligibility.status === 'no') exclusions.push(`Matériel exclu${eligibility.conditions ? ` : ${eligibility.conditions}` : ''}`)
  if (eligibility.status === 'unknown') exclusions.push('Éligibilité du matériel non renseignée')
  if (eligibility.status === 'conditional') warnings.push(`Sous conditions${eligibility.conditions ? ` : ${eligibility.conditions}` : ''}`)

  const row = pickGridRow(leaser.grid, { amount: input.amount, duration: input.duration, family, financingType: input.financingType })
  if (!row) {
    exclusions.push(coveredDurations(leaser.grid).includes(input.duration)
      ? 'Aucune tranche du barème pour ce montant'
      : `Durée de ${input.duration} mois absente du barème`)
  }

  const empty = { coefficientPct: null, clientCoefficientPct: null, monthly: null, total: null, totalPct: null, financingCost: null, annualRate: null, annualRateExCommission: null, commission: null, markupRevenue: null, clientFee: null, everleaseRevenue: null, takeRatePct: null }
  if (!row || input.amount <= 0) return { leaser, exclusions, warnings, row, rentTiming, residualValuePct, ...empty }

  const coefficientPct = Number(row.coefficient_pct)
  const markup = leaser.markup_pct ?? 0
  const clientCoefficientPct = round2(coefficientPct * (1 + markup / 100))
  const monthly = round2(input.amount * clientCoefficientPct / 100)
  const total = round2(monthly * input.duration)
  const commissionPct = leaser.commission_included_pct ?? 0
  const commission = round2(input.amount * commissionPct / 100)
  // Approximation (classeur du 16/11) : la majoration rapporte son taux appliqué au montant financé
  const markupRevenue = round2(input.amount * markup / 100)
  const fee = clientFee(input.amount, leaser.client_fee_rules)
  const everleaseRevenue = round2(commission + markupRevenue + fee)

  return {
    leaser, exclusions, warnings, row, rentTiming, residualValuePct,
    coefficientPct,
    clientCoefficientPct,
    monthly,
    total,
    totalPct: round2(total / input.amount * 100),
    financingCost: round2(total - input.amount),
    annualRate: implicitAnnualRate(clientCoefficientPct / 100, input.duration, rentTiming, residualValuePct / 100),
    annualRateExCommission: implicitAnnualRate(clientCoefficientPct / 100 / (1 + commissionPct / 100), input.duration, rentTiming, residualValuePct / 100),
    commission,
    markupRevenue,
    clientFee: fee,
    everleaseRevenue,
    takeRatePct: round2(everleaseRevenue / input.amount * 100),
  }
}

/** « 20 000 », « 1 234,50 € » ou « 3,5 % » → nombre ; vide ou illisible → null. */
export function parseSimulationAmount(raw: string): number | null {
  const s = raw.replace(/[\s  €%]/g, '').replace(',', '.')
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null
}

/** Vue comparative : leasers qui financent le dossier, loyer croissant ; puis ceux exclus, avec leurs raisons. */
export function compareLeasers(leasers: PricingLeaser[], input: SimulationInput): { eligible: Simulation[]; excluded: Simulation[] } {
  const all = leasers.map(l => simulate(l, input))
  return {
    eligible: all.filter(s => s.exclusions.length === 0).sort((a, b) => (a.monthly ?? 0) - (b.monthly ?? 0)),
    excluded: all.filter(s => s.exclusions.length > 0),
  }
}
