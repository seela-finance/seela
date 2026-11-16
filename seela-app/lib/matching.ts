// Matching leasers d'un dossier soumis : offres indicatives calculées à partir des barèmes en base.
// Appelé côté serveur avec le client service role : à la soumission (POST /api/requests/[id]/submit)
// et à la relance depuis le back-office.
import type { SupabaseClient } from '@supabase/supabase-js'
import { OS, RS } from '@/lib/status'
import { transitionRequest } from '@/lib/transitions'
import { companyAgeMonths } from '@/lib/company-age'
import { toPricingLeaser, type LeaserRecord } from '@/lib/leaser-conditions'
import { equipmentOf, matchLeaser, type MatchingCriteria, type MatchingLeaser, type MatchingLine } from '@/lib/matching-rules'

export const MATCHING_LEASER_SELECT = `*, leaser_rate_grid(amount_min, amount_max, duration_months, coefficient_pct, equipment_family, financing_type),
  leaser_eligibility(equipment_family, equipment_type, status, conditions), leaser_financing_types(financing_type), leaser_advantages(advantage)`

type LeaserRow = LeaserRecord & {
  anciennete_min_mois: number | null
  score_seela_min: number | null
  leaser_advantages: { advantage: string }[] | null
}

export function toMatchingLeaser(row: LeaserRow): MatchingLeaser {
  return {
    ...toPricingLeaser(row),
    anciennete_min_mois: row.anciennete_min_mois == null ? null : Number(row.anciennete_min_mois),
    periodicites: row.periodicites,
    score_seela_min: row.score_seela_min == null ? null : Number(row.score_seela_min),
    advantages: (row.leaser_advantages ?? []).map(a => a.advantage),
  }
}

/** Leasers actifs proposables à ce client : un leaser de test n'est proposé qu'à son compte. */
export async function loadActiveLeasers(db: SupabaseClient, userId: string | null): Promise<MatchingLeaser[]> {
  const { data, error } = await db.from('leasers').select(MATCHING_LEASER_SELECT).eq('is_active', true)
  if (error) throw new Error(`Matching : lecture des leasers impossible (${error.message})`)
  return ((data ?? []) as LeaserRow[])
    .filter(l => !l.test_user_id || l.test_user_id === userId)
    .map(toMatchingLeaser)
}

// Lit le dossier, les critères et les leasers actifs. Une erreur de lecture est levée :
// elle ne doit pas se confondre avec « aucun leaser ne correspond ».
async function loadMatching(db: SupabaseClient, requestId: string) {
  const { data: request, error } = await db
    .from('financing_requests')
    .select('id, status, total_amount, duration_months, document_type, periodicite, user_id, line_items(category, equipment_family, equipment_type, total_price, selected), offers(leaser_name, status)')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw new Error(`Matching : lecture du dossier impossible (${error.message})`)
  if (!request) return null

  const { data: profile } = await db
    .from('profiles')
    .select('date_creation, age_bracket, seela_score')
    .eq('id', request.user_id)
    .single()

  const lines = ((request.line_items ?? []) as (MatchingLine & { selected: boolean })[]).filter(l => l.selected)
  const existing = (request.offers ?? []) as { leaser_name: string | null; status: string | null }[]
  const criteria: MatchingCriteria = {
    amount: Number(request.total_amount ?? 0),
    // Ancienneté réelle (année de création), jamais supposée : inconnue = 0 mois
    ageMonths: companyAgeMonths(profile),
    score: (profile as { seela_score?: number | null } | null)?.seela_score ?? 50,
    ...equipmentOf(lines),
    financingType: request.document_type === 'facture' ? 'lease_back' : 'leasing',
    periodicite: request.periodicite ?? 'mensuelle',
    duration: request.duration_months ?? 36,
    alreadyOffered: existing.map(o => o.leaser_name ?? ''),
  }

  return {
    request,
    criteria,
    activeOffers: existing.filter(o => o.status !== OS.refused).length,
    leasers: await loadActiveLeasers(db, request.user_id),
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
    .map(leaser => ({ leaser, ...matchLeaser(leaser, criteria) }))
    .filter(m => m.reasons.length === 0 && m.simulation.monthly != null)
    .map(({ leaser, simulation }) => ({
      request_id: requestId,
      leaser_id: leaser.id,
      leaser_name: leaser.name,
      monthly_payment: simulation.monthly!,
      duration_months: criteria.duration,
      // Taux annuel implicite du loyer proposé (TRI), en %
      rate: simulation.annualRate == null || Number.isNaN(simulation.annualRate) ? null : Math.round(simulation.annualRate * 10000) / 100,
      total_cost: simulation.total,
      status: OS.indicative,
      selected: false,
      notes: leaser.advantages.join(' · '),
    }))
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

/** Pour le back-office : ce que chaque leaser actif répondrait à ce dossier avec le barème actuel. */
export async function diagnoseMatching(db: SupabaseClient, requestId: string): Promise<LeaserDiagnostic[]> {
  const loaded = await loadMatching(db, requestId)
  if (!loaded) return []
  return loaded.leasers
    .map(l => ({ name: l.name, reasons: matchLeaser(l, loaded.criteria).reasons }))
    .sort((a, b) => a.reasons.length - b.reasons.length || a.name.localeCompare(b.name, 'fr'))
}
