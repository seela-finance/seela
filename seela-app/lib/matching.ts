// Matching leasers d'un dossier soumis : offres indicatives calculées à partir des grilles en base.
// Appelé côté serveur à la soumission (POST /api/requests/[id]/submit), avec le client service role.
import type { SupabaseClient } from '@supabase/supabase-js'
import { OS, RS } from '@/lib/status'
import { transitionRequest } from '@/lib/transitions'
import { companyAgeMonths } from '@/lib/company-age'

type LineItemRow = { category: string | null; selected: boolean }
type LeaserRaw = {
  id: string
  name: string
  anciennete_min_mois: number
  periodicites: string[] | null
  score_seela_min: number | null
  // Leaser de test : réservé à ce compte (undefined si la colonne n'existe pas encore)
  test_user_id?: string | null
  leaser_equipment_categories: { category: string }[]
  leaser_financing_types: { financing_type: string }[]
  leaser_advantages: { advantage: string }[]
}
type RateRow = { coefficient: number; taux_nominal: number | null }

type Offer = {
  request_id: string
  leaser_name: string
  monthly_payment: number
  duration_months: number
  rate: number | null
  total_cost: number
  status: string
  selected: boolean
  notes: string
}

/**
 * Calcule et enregistre les offres d'un dossier `submitted`, puis le passe en `offers_available`
 * (au moins une offre) ou `no_match` (aucune : un conseiller prend le relais). Sans effet sur un autre statut.
 */
export async function runMatching(supabase: SupabaseClient, requestId: string): Promise<{ offers: number }> {
  // 1. Get financing request + line items
  const { data: finReq } = await supabase
    .from('financing_requests')
    .select('id, status, total_amount, duration_months, document_type, periodicite, user_id, line_items(category, selected)')
    .eq('id', requestId)
    .maybeSingle()
  if (!finReq || finReq.status !== RS.submitted) return { offers: 0 }

  async function finish(offers: Offer[]) {
    if (offers.length > 0) {
      // Sort cheapest first (lowest monthly = most recommended)
      offers.sort((a, b) => a.monthly_payment - b.monthly_payment)
      const { error } = await supabase.from('offers').insert(offers)
      if (error) throw new Error(`Matching : insertion des offres impossible (${error.message})`)
    }
    await transitionRequest(supabase, requestId, RS.submitted, offers.length > 0 ? RS.offers_available : RS.no_match, {}, 'system')
    return { offers: offers.length }
  }

  const totalAmount: number = finReq.total_amount ?? 0
  const duration: number = finReq.duration_months ?? 36
  const periodicite: string = finReq.periodicite ?? 'mensuelle'

  // 2. Extract categories from selected line items
  const categories: string[] = [
    ...new Set(
      ((finReq.line_items ?? []) as LineItemRow[])
        .filter(l => l.selected && l.category)
        .map(l => l.category as string)
    ),
  ]
  const mainCategory = categories[0] ?? null

  // 3. Get user profile for ancienneté
  const { data: profile } = await supabase
    .from('profiles')
    .select('date_creation, age_bracket, seela_score')
    .eq('id', finReq.user_id)
    .single()

  // Ancienneté réelle (année de création), jamais supposée : inconnue = 0 mois
  const ancienneteMois = companyAgeMonths(profile)

  const userScore: number = (profile as { seela_score?: number | null })?.seela_score ?? 50

  // 4. Financing type
  const financingType = finReq.document_type === 'facture' ? 'lease_back' : 'leasing'

  // 5. Query all active leasers matching amount + ancienneté
  const { data: leasersRaw } = await supabase
    .from('leasers')
    .select(`
      *,
      leaser_equipment_categories ( category ),
      leaser_financing_types ( financing_type ),
      leaser_advantages ( advantage )
    `)
    .eq('is_active', true)
    .lte('min_amount', totalAmount)
    .gte('max_amount', totalAmount)
    .lte('anciennete_min_mois', ancienneteMois)
    .or(`score_seela_min.is.null,score_seela_min.lte.${userScore}`)

  if (!leasersRaw || leasersRaw.length === 0) return finish([])

  // 6. Filter by test leaser, equipment categories + financing type
  const matched = (leasersRaw as LeaserRaw[]).filter(l => {
    // Un leaser de test n'est jamais proposé aux autres clients
    if (l.test_user_id && l.test_user_id !== finReq.user_id) return false
    const lCats = l.leaser_equipment_categories.map(c => c.category)
    const lTypes = l.leaser_financing_types.map(t => t.financing_type)
    const lPeriods = l.periodicites ?? ['mensuelle']
    const hasCategory = categories.length === 0 || categories.some(c => lCats.includes(c))
    const hasType = lTypes.includes(financingType)
    const hasPeriod = lPeriods.includes(periodicite)
    return hasCategory && hasType && hasPeriod
  })

  if (matched.length === 0) return finish([])

  // 7. For each matched leaser, resolve rate and build offer
  const computed: Offer[] = []

  for (const leaser of matched) {
    // Try category-specific rate first, then generic (null category)
    let rateRow: RateRow | null = null

    if (mainCategory) {
      const { data: r1 } = await supabase
        .from('leaser_rates')
        .select('coefficient, taux_nominal')
        .eq('leaser_id', leaser.id)
        .eq('duration_months', duration)
        .eq('equipment_category', mainCategory)
        .maybeSingle()
      rateRow = r1 ?? null
    }

    if (!rateRow) {
      const { data: r2 } = await supabase
        .from('leaser_rates')
        .select('coefficient, taux_nominal')
        .eq('leaser_id', leaser.id)
        .eq('duration_months', duration)
        .is('equipment_category', null)
        .maybeSingle()
      rateRow = r2 ?? null
    }

    // Last resort: any rate for this duration
    if (!rateRow) {
      const { data: r3 } = await supabase
        .from('leaser_rates')
        .select('coefficient, taux_nominal')
        .eq('leaser_id', leaser.id)
        .eq('duration_months', duration)
        .limit(1)
        .maybeSingle()
      rateRow = r3 ?? null
    }

    if (!rateRow) continue

    const monthly = Math.round(totalAmount * rateRow.coefficient * 100) / 100
    const totalCost = Math.round(monthly * duration * 100) / 100
    const advantages = leaser.leaser_advantages.map(a => a.advantage)

    computed.push({
      request_id: requestId,
      leaser_name: leaser.name,
      monthly_payment: monthly,
      duration_months: duration,
      rate: rateRow.taux_nominal ?? null,
      total_cost: totalCost,
      status: OS.indicative,
      selected: false,
      notes: advantages.join(' · '),
    })
  }

  return finish(computed)
}
