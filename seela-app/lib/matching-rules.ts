// Règles du matching : pourquoi un leaser est écarté d'un dossier, et quel taux lui appliquer.
// Fonctions pures, sans dépendance serveur : testables. La lecture en base est dans lib/matching.ts.

export type MatchingRate = {
  duration_months: number
  equipment_category: string | null
  financing_type: string | null
  coefficient: number
  taux_nominal: number | null
}

export type MatchingLeaser = {
  id: string
  name: string
  min_amount: number | null
  max_amount: number | null
  anciennete_min_mois: number | null
  periodicites: string[] | null
  score_seela_min: number | null
  leaser_equipment_categories: { category: string }[]
  leaser_financing_types: { financing_type: string }[]
  leaser_advantages: { advantage: string }[]
  leaser_rates: MatchingRate[]
}

export type MatchingCriteria = {
  amount: number
  ageMonths: number
  score: number
  categories: string[]
  financingType: string
  periodicite: string
  duration: number
  /** Leasers ayant déjà une offre sur ce dossier, refusée ou non : on ne la repropose pas. */
  alreadyOffered: string[]
}

const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/**
 * Taux du leaser pour la durée demandée. On préfère le type de financement du dossier, puis, à type
 * égal : la catégorie principale, le taux générique, et enfin n'importe quelle catégorie.
 */
export function pickRate(rates: MatchingRate[], criteria: Pick<MatchingCriteria, 'categories' | 'financingType' | 'duration'>): MatchingRate | null {
  const main = criteria.categories[0] ?? null
  const rank = (r: MatchingRate) =>
    (r.financing_type === criteria.financingType ? 0 : 3) +
    (main && r.equipment_category === main ? 0 : r.equipment_category === null ? 1 : 2)
  return rates
    .filter(r => r.duration_months === criteria.duration)
    .sort((a, b) => rank(a) - rank(b))[0] ?? null
}

/** Raisons qui écartent ce leaser du dossier ; liste vide = il propose une offre. */
export function leaserExclusions(leaser: MatchingLeaser, c: MatchingCriteria): string[] {
  const reasons: string[] = []
  if (c.alreadyOffered.includes(leaser.name)) reasons.push('Offre déjà faite sur ce dossier')
  // Un seuil vide écarte le leaser : sa fiche est incomplète
  if (leaser.min_amount == null || leaser.max_amount == null) reasons.push('Montants min. et max. à renseigner sur la fiche')
  else if (c.amount < leaser.min_amount) reasons.push(`Montant ${eur(c.amount)} sous le minimum de ${eur(leaser.min_amount)}`)
  else if (c.amount > leaser.max_amount) reasons.push(`Montant ${eur(c.amount)} au-dessus du maximum de ${eur(leaser.max_amount)}`)
  if (leaser.anciennete_min_mois == null) reasons.push('Ancienneté minimale à renseigner sur la fiche')
  else if (c.ageMonths < leaser.anciennete_min_mois) reasons.push(`Ancienneté ${c.ageMonths} mois, minimum ${leaser.anciennete_min_mois} mois`)
  if (leaser.score_seela_min != null && c.score < leaser.score_seela_min) reasons.push(`Score ${c.score}, minimum ${leaser.score_seela_min}`)

  const covered = leaser.leaser_equipment_categories.map(x => x.category)
  if (c.categories.length > 0 && !c.categories.some(x => covered.includes(x))) reasons.push(`Catégorie non couverte : ${c.categories.join(', ')}`)
  if (!leaser.leaser_financing_types.some(x => x.financing_type === c.financingType)) {
    reasons.push(`Financement non couvert : ${c.financingType === 'lease_back' ? 'lease-back' : 'leasing'}`)
  }
  if (!(leaser.periodicites ?? ['mensuelle']).includes(c.periodicite)) reasons.push(`Périodicité non couverte : ${c.periodicite}`)
  if (!pickRate(leaser.leaser_rates, c)) reasons.push(`Aucun taux pour ${c.duration} mois`)
  return reasons
}
