// Règles du matching : pourquoi un leaser est écarté d'un dossier, et quel loyer il propose.
// Le prix vient du barème en base (lib/leaser-pricing.ts) : tranche de montant, durée, famille de matériel,
// type de financement. S'y ajoutent les critères du dossier : ancienneté, score, périodicité, offre déjà faite.
// Fonctions pures, sans dépendance serveur : testables. La lecture en base est dans lib/matching.ts.
import { LEGACY_CATEGORY_FAMILY, familyOf, typeOf } from '@/lib/equipment'
import { eligibilityFor, simulate, type PricingLeaser, type Simulation } from '@/lib/leaser-pricing'

export type MatchingLeaser = PricingLeaser & {
  anciennete_min_mois: number | null
  periodicites: string[] | null
  score_seela_min: number | null
  advantages: string[]
}

export type MatchingLine = {
  total_price: number | null
  category: string | null
  equipment_family: string | null
  equipment_type: string | null
}

export type MatchingCriteria = {
  amount: number
  ageMonths: number
  score: number
  /** Type (ou à défaut famille) de la ligne au plus gros montant : il fixe la ligne du barème. */
  mainEquipment: string | null
  /** Familles de toutes les lignes financées : chacune doit être acceptée par le leaser. */
  families: string[]
  financingType: 'leasing' | 'lease_back' | 'credit_bail'
  periodicite: string
  duration: number
  /** Leasers ayant déjà une offre sur ce dossier, refusée ou non : on ne la repropose pas. */
  alreadyOffered: string[]
}

/** Famille d'une ligne : celle donnée par l'analyse, sinon celle de l'ancienne catégorie. */
export function lineFamily(line: MatchingLine): string | null {
  return typeOf(line.equipment_type)?.family.slug ?? familyOf(line.equipment_family)?.slug ?? LEGACY_CATEGORY_FAMILY[line.category ?? ''] ?? null
}

/** Matériel principal et familles des lignes financées. */
export function equipmentOf(lines: MatchingLine[]): { mainEquipment: string | null; families: string[] } {
  const main = [...lines].sort((a, b) => (Number(b.total_price) || 0) - (Number(a.total_price) || 0))[0]
  return {
    mainEquipment: main ? (typeOf(main.equipment_type) ? main.equipment_type : lineFamily(main)) : null,
    families: [...new Set(lines.map(lineFamily).filter((f): f is string => !!f))],
  }
}

/** Raisons qui écartent ce leaser (liste vide = il propose une offre), et le calcul du loyer. */
export function matchLeaser(leaser: MatchingLeaser, c: MatchingCriteria): { reasons: string[]; simulation: Simulation } {
  const reasons: string[] = []
  if (c.alreadyOffered.includes(leaser.name)) reasons.push('Offre déjà faite sur ce dossier')
  if (leaser.min_amount == null || leaser.max_amount == null) reasons.push('Montants min. et max. à renseigner sur la fiche')
  if (leaser.anciennete_min_mois == null) reasons.push('Ancienneté minimale à renseigner sur la fiche')
  else if (c.ageMonths < leaser.anciennete_min_mois) reasons.push(`Ancienneté ${c.ageMonths} mois, minimum ${leaser.anciennete_min_mois} mois`)
  if (leaser.score_seela_min != null && c.score < leaser.score_seela_min) reasons.push(`Score ${c.score}, minimum ${leaser.score_seela_min}`)
  if (!(leaser.periodicites ?? ['mensuelle']).includes(c.periodicite)) reasons.push(`Périodicité non couverte : ${c.periodicite}`)

  const simulation = simulate(leaser, { amount: c.amount, duration: c.duration, equipment: c.mainEquipment, financingType: c.financingType })
  reasons.push(...simulation.exclusions)

  // Les autres familles du devis doivent aussi être acceptées
  const mainFamily = typeOf(c.mainEquipment)?.family.slug ?? c.mainEquipment
  for (const family of c.families.filter(f => f !== mainFamily)) {
    const status = eligibilityFor(leaser.eligibility, family).status
    if (status === 'no') reasons.push(`Matériel exclu : ${familyOf(family)?.label ?? family}`)
    if (status === 'unknown') reasons.push(`Éligibilité non renseignée : ${familyOf(family)?.label ?? family}`)
  }
  return { reasons: [...new Set(reasons)], simulation }
}
