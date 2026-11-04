// Matching leasers d'un dossier soumis : offres indicatives calculées à partir des grilles en base.
// Appelé côté serveur avec le client service role : à la soumission (POST /api/requests/[id]/submit)
// et à la relance depuis le back-office.
import type { SupabaseClient } from '@supabase/supabase-js'
import { OS, RS } from '@/lib/status'
import { transitionRequest } from '@/lib/transitions'
import { companyAgeMonths } from '@/lib/company-age'
import { leaserExclusions, pickRate, type MatchingCriteria, type MatchingLeaser } from '@/lib/matching-rules'

type LeaserRow = MatchingLeaser & {
  // Leaser de test : réservé à ce compte (undefined si la colonne n'existe pas encore)
  test_user_id?: string | null
}

// Lit le dossier, les critères et les leasers actifs. Une erreur de lecture est levée :
// elle ne doit pas se confondre avec « aucun leaser ne correspond ».
async function loadMatching(db: SupabaseClient, requestId: string) {
  const { data: request, error } = await db
    .from('financing_requests')
    .select('id, status, total_amount, duration_months, document_type, periodicite, user_id, line_items(category, selected), offers(leaser_name, status)')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw new Error(`Matching : lecture du dossier impossible (${error.message})`)
  if (!request) return null

  const { data: profile } = await db
    .from('profiles')
    .select('date_creation, age_bracket, seela_score')
    .eq('id', request.user_id)
    .single()

  const { data: leasers, error: leasersError } = await db
    .from('leasers')
    .select('*, leaser_equipment_categories(category), leaser_financing_types(financing_type), leaser_advantages(advantage), leaser_rates(duration_months, equipment_category, financing_type, coefficient, taux_nominal)')
    .eq('is_active', true)
  if (leasersError) throw new Error(`Matching : lecture des leasers impossible (${leasersError.message})`)

  const lines = (request.line_items ?? []) as { category: string | null; selected: boolean }[]
  const existing = (request.offers ?? []) as { leaser_name: string | null; status: string | null }[]
  const criteria: MatchingCriteria = {
    amount: request.total_amount ?? 0,
    // Ancienneté réelle (année de création), jamais supposée : inconnue = 0 mois
    ageMonths: companyAgeMonths(profile),
    score: (profile as { seela_score?: number | null } | null)?.seela_score ?? 50,
    categories: [...new Set(lines.filter(l => l.selected && l.category).map(l => l.category as string))],
    financingType: request.document_type === 'facture' ? 'lease_back' : 'leasing',
    periodicite: request.periodicite ?? 'mensuelle',
    duration: request.duration_months ?? 36,
    alreadyOffered: existing.map(o => o.leaser_name ?? ''),
  }

  return {
    request,
    criteria,
    activeOffers: existing.filter(o => o.status !== OS.refused).length,
    // Un leaser de test n'est jamais proposé aux autres clients
    leasers: ((leasers ?? []) as LeaserRow[]).filter(l => !l.test_user_id || l.test_user_id === request.user_id),
  }
}

/**
 * Calcule et enregistre les offres d'un dossier `submitted`, puis le passe en `offers_available`
 * (au moins une offre) ou `no_match` (aucune : un conseiller prend le relais). Sans effet sur un autre statut.
 * Rejouable : un leaser qui a déjà une offre sur le dossier n'en reçoit pas une seconde.
 */
export async function runMatching(db: SupabaseClient, requestId: string): Promise<{ offers: number }> {
  const loaded = await loadMatching(db, requestId)
  if (!loaded || loaded.request.status !== RS.submitted) return { offers: 0 }
  const { criteria, leasers, activeOffers } = loaded

  const offers = leasers
    .filter(l => leaserExclusions(l, criteria).length === 0)
    .map(leaser => {
      const rate = pickRate(leaser.leaser_rates, criteria)!
      const monthly = Math.round(criteria.amount * rate.coefficient * 100) / 100
      return {
        request_id: requestId,
        leaser_name: leaser.name,
        monthly_payment: monthly,
        duration_months: criteria.duration,
        rate: rate.taux_nominal ?? null,
        total_cost: Math.round(monthly * criteria.duration * 100) / 100,
        status: OS.indicative,
        selected: false,
        notes: leaser.leaser_advantages.map(a => a.advantage).join(' · '),
      }
    })
    // Le loyer le plus bas en tête
    .sort((a, b) => a.monthly_payment - b.monthly_payment)

  if (offers.length > 0) {
    const { error } = await db.from('offers').insert(offers)
    if (error) throw new Error(`Matching : insertion des offres impossible (${error.message})`)
  }
  const to = offers.length + activeOffers > 0 ? RS.offers_available : RS.no_match
  await transitionRequest(db, requestId, RS.submitted, to, {}, 'system')
  return { offers: offers.length }
}

export type LeaserDiagnostic = { name: string; reasons: string[] }

/** Pour le back-office : ce que chaque leaser actif répondrait à ce dossier avec la grille actuelle. */
export async function diagnoseMatching(db: SupabaseClient, requestId: string): Promise<LeaserDiagnostic[]> {
  const loaded = await loadMatching(db, requestId)
  if (!loaded) return []
  return loaded.leasers
    .map(l => ({ name: l.name, reasons: leaserExclusions(l, loaded.criteria) }))
    .sort((a, b) => a.reasons.length - b.reasons.length || a.name.localeCompare(b.name, 'fr'))
}
