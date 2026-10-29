import { OS } from '@/lib/status'

type RankableOffer = { id: string; monthly_payment: number; duration_months: number; status?: string | null }

// Règle de recommandation Everlease (unique, utilisée par la liste et la fiche) :
// mensualité la plus basse ; à égalité, la durée la plus courte. Les offres refusées sont exclues.
export const RECOMMENDATION_REASON = 'Loyer le plus bas'

function compare(a: RankableOffer, b: RankableOffer): number {
  return a.monthly_payment - b.monthly_payment || a.duration_months - b.duration_months
}

export function recommendedOffer<T extends RankableOffer>(offers: T[]): T | null {
  const eligible = offers.filter(o => o.status !== OS.refused)
  if (eligible.length < 2) return null
  return [...eligible].sort(compare)[0]
}

/** Recommandée d'abord, puis par loyer croissant ; offres refusées en dernier. */
export function sortOffers<T extends RankableOffer>(offers: T[]): T[] {
  return [...offers].sort((a, b) => {
    const refused = Number(a.status === OS.refused) - Number(b.status === OS.refused)
    return refused || compare(a, b)
  })
}

/** Taux nominal stocké en pourcentage (ex. 4.85) ; null si inconnu — jamais de valeur par défaut. */
export function formatRate(rate: number | null | undefined): string | null {
  if (rate == null) return null
  return `${rate.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
}

export function leaserInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
