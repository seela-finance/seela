import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type LineItemRow = { category: string | null; selected: boolean }
type LeaserRaw = {
  id: string
  name: string
  anciennete_min_mois: number
  periodicites: string[] | null
  score_seela_min: number | null
  leaser_equipment_categories: { category: string }[]
  leaser_financing_types: { financing_type: string }[]
  leaser_advantages: { advantage: string }[]
}
type RateRow = { coefficient: number; taux_nominal: number | null }

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json()
    if (!requestId) {
      return NextResponse.json({ error: 'requestId required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Get financing request + line items
    const { data: finReq, error: reqErr } = await supabase
      .from('financing_requests')
      .select('id, total_amount, duration_months, document_type, user_id, line_items(category, selected)')
      .eq('id', requestId)
      .single()

    if (reqErr || !finReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const totalAmount: number = finReq.total_amount ?? 0
    const duration: number = finReq.duration_months ?? 36
    const periodicite: string = (finReq as { periodicite?: string }).periodicite ?? 'mensuelle'

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
      .select('age_bracket, seela_score')
      .eq('id', finReq.user_id)
      .single()

    // Map age_bracket → months (default 60 = most permissive if unknown)
    let ancienneteMois = 60
    if (profile?.age_bracket === '< 2 ans') ancienneteMois = 0
    else if (profile?.age_bracket === '2 – 5 ans') ancienneteMois = 24
    else if (profile?.age_bracket === '> 5 ans') ancienneteMois = 60

    const userScore: number = (profile as { seela_score?: number | null })?.seela_score ?? 50

    // 4. Financing type
    const financingType = finReq.document_type === 'facture' ? 'lease_back' : 'leasing'

    // 5. Query all active leasers matching amount + ancienneté
    const { data: leasersRaw } = await supabase
      .from('leasers')
      .select(`
        id, name, anciennete_min_mois, periodicites, score_seela_min,
        leaser_equipment_categories ( category ),
        leaser_financing_types ( financing_type ),
        leaser_advantages ( advantage )
      `)
      .eq('is_active', true)
      .lte('min_amount', totalAmount)
      .gte('max_amount', totalAmount)
      .lte('anciennete_min_mois', ancienneteMois)
      .or(`score_seela_min.is.null,score_seela_min.lte.${userScore}`)

    if (!leasersRaw || leasersRaw.length === 0) {
      return NextResponse.json({ matched: false })
    }

    // 6. Filter by equipment categories + financing type
    const matched = (leasersRaw as LeaserRaw[]).filter(l => {
      const lCats = l.leaser_equipment_categories.map(c => c.category)
      const lTypes = l.leaser_financing_types.map(t => t.financing_type)
      const lPeriods = l.periodicites ?? ['mensuelle']
      const hasCategory = categories.length === 0 || categories.some(c => lCats.includes(c))
      const hasType = lTypes.includes(financingType)
      const hasPeriod = lPeriods.includes(periodicite)
      return hasCategory && hasType && hasPeriod
    })

    if (matched.length === 0) {
      return NextResponse.json({ matched: false })
    }

    // 7. For each matched leaser, resolve rate and build offer
    const computed: {
      request_id: string
      leaser_name: string
      monthly_payment: number
      duration_months: number
      rate: number | null
      total_cost: number
      status: string
      selected: boolean
      notes: string
    }[] = []

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
        status: 'indicative',
        selected: false,
        notes: advantages.join(' · '),
      })
    }

    if (computed.length === 0) {
      return NextResponse.json({ matched: false })
    }

    // Sort cheapest first (lowest monthly = most recommended)
    computed.sort((a, b) => a.monthly_payment - b.monthly_payment)

    // 8. Insert offers + update request status
    const { error: insertErr } = await supabase.from('offers').insert(computed)
    if (insertErr) throw insertErr

    await supabase
      .from('financing_requests')
      .update({ status: 'offers_available' })
      .eq('id', requestId)

    return NextResponse.json({ matched: true, offers_count: computed.length })
  } catch (err) {
    console.error('[match-leasers]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
