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

/**
 * Offre mise en avant (carte sombre, bouton principal) : la recommandée, ou l'unique offre éligible.
 * Seule, elle n'est pas « recommandée » (rien à comparer) mais ne doit pas avoir l'air écartée.
 */
export function highlightedOffer<T extends RankableOffer>(offers: T[]): T | null {
  const eligible = offers.filter(o => o.status !== OS.refused)
  return eligible.length === 1 ? eligible[0] : recommendedOffer(offers)
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
  // Nom public « Financeur A · Banque » → « A »
  const anonymous = name.match(/^Financeur (\w+)/)
  if (anonymous) return anonymous[1].toUpperCase()
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

/**
 * Colonnes d'une offre lisibles par le client. Le nom du leaser n'en fait pas partie (droits par colonne en base) :
 * `leaser_name` y est le nom public de l'offre, « Financeur A · Banque ».
 */
export const CLIENT_OFFER_COLUMNS = 'id, leaser_name:public_name, monthly_payment, duration_months, status, selected, rate, total_cost, notes, confirmed_at, seela_validated_at, leaser_confirmed_at, source, previous_terms, conditions, client_message, periodicite, frais_dossier, depot_garantie, created_at'
