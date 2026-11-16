// Loyer estimé montré au client avant la soumission (étape « Configuration ») et sur un dossier sans offre.
// Le meilleur loyer parmi les leasers qui financent ce montant et ce matériel, par durée couverte :
// jamais de nom de leaser, seulement des durées et des montants. Fonction pure, testée.
import { coveredDurations, simulate, type PricingLeaser, type SimulationInput } from '@/lib/leaser-pricing'

export type EstimateOption = { months: number; monthly: number }

/** Durées proposées au client quand aucun barème ne couvre le dossier (un conseiller l'étudiera). */
export const FALLBACK_DURATIONS = [24, 36, 48, 60]

export function estimateOptions(
  leasers: PricingLeaser[],
  q: Pick<SimulationInput, 'amount' | 'equipment' | 'financingType'>,
): EstimateOption[] {
  if (!(q.amount > 0)) return []
  const durations = [...new Set(leasers.flatMap(l => coveredDurations(l.grid, q.amount)))].sort((a, b) => a - b)
  const options: EstimateOption[] = []
  for (const months of durations) {
    const monthly = leasers
      .map(l => simulate(l, { ...q, duration: months }))
      .filter(s => s.exclusions.length === 0 && s.monthly != null)
      .map(s => s.monthly!)
    if (monthly.length) options.push({ months, monthly: Math.min(...monthly) })
  }
  return options
}
