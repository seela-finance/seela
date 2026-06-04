import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type LineItemRow = { category: string | null; selected: boolean; description: string | null }
type LeaserRaw = {
  id: string
  name: string
  min_amount: number
  max_amount: number
  anciennete_min_mois: number
  leaser_equipment_categories: { category: string }[]
  leaser_financing_types: { financing_type: string }[]
  leaser_advantages: { advantage: string }[]
}

export async function POST(req: Request) {
  const body = await req.json()
  const { requestId, trigger = false } = body
  const supabase = await createClient()
  const logs: string[] = []

  function log(msg: string) { logs.push(msg) }

  // 1. Request
  const { data: finReq, error: reqErr } = await supabase
    .from('financing_requests')
    .select('id, total_amount, duration_months, document_type, user_id, status, line_items(category, selected, description)')
    .eq('id', requestId)
    .single()

  if (reqErr || !finReq) {
    return NextResponse.json({ error: 'Request not found', detail: reqErr?.message }, { status: 404 })
  }

  const totalAmount: number = finReq.total_amount ?? 0
  const duration: number = finReq.duration_months ?? 36

  log(`━━ DEMANDE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  log(`ID           : ${finReq.id}`)
  log(`Statut       : ${finReq.status}`)
  log(`Montant HT   : ${totalAmount} €`)
  log(`Durée        : ${duration} mois`)
  log(`Type doc     : ${finReq.document_type}`)

  // 2. Categories
  const lineItems = (finReq.line_items ?? []) as LineItemRow[]
  const categories: string[] = [
    ...new Set(
      lineItems.filter(l => l.selected && l.category).map(l => l.category as string)
    ),
  ]
  const mainCategory = categories[0] ?? null

  log(``)
  log(`━━ LINE ITEMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  if (lineItems.length === 0) {
    log(`  ⚠ Aucun line item trouvé pour cette demande`)
  } else {
    lineItems.forEach(l => {
      log(`  ${l.selected ? '✓' : '○'} ${l.description ?? '(sans description)'} → catégorie: ${l.category ?? 'NULL'}`)
    })
  }
  log(`Catégories extraites : [${categories.join(', ') || 'aucune'}]`)
  log(`Catégorie principale : ${mainCategory ?? 'NULL'}`)

  // 3. Profile / ancienneté
  const { data: profile } = await supabase
    .from('profiles')
    .select('age_bracket, company_name')
    .eq('id', finReq.user_id)
    .single()

  let ancienneteMois = 60
  if (profile?.age_bracket === '< 2 ans') ancienneteMois = 0
  else if (profile?.age_bracket === '2 – 5 ans') ancienneteMois = 24
  else if (profile?.age_bracket === '> 5 ans') ancienneteMois = 60

  log(``)
  log(`━━ PROFIL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  log(`Entreprise       : ${profile?.company_name ?? '(inconnu)'}`)
  log(`Tranche ancienneté: ${profile?.age_bracket ?? 'NULL (défaut: 60 mois)'}`)
  log(`Ancienneté (mois): ${ancienneteMois}`)

  // 4. Financing type
  const financingType = finReq.document_type === 'facture' ? 'lease_back' : 'leasing'
  log(`Type financement : ${financingType}`)

  // 5. All leasers
  const { data: allLeasers, error: leaserErr } = await supabase
    .from('leasers')
    .select(`
      id, name, min_amount, max_amount, anciennete_min_mois, is_active,
      leaser_equipment_categories ( category ),
      leaser_financing_types ( financing_type ),
      leaser_advantages ( advantage )
    `)
    .order('name')

  log(``)
  log(`━━ LEASERS EN BASE ━━━━━━━━━━━━━━━━━━━━━━`)
  if (leaserErr) log(`  ERREUR lecture leasers: ${leaserErr.message}`)
  log(`  ${allLeasers?.length ?? 0} leaser(s) trouvé(s) en base`)

  if (!allLeasers || allLeasers.length === 0) {
    log(`  ⚠ Aucun leaser en base — avez-vous exécuté supabase/leasers.sql ?`)
    return NextResponse.json({ logs, matched: false })
  }

  // 6. Trace each leaser
  log(``)
  log(`━━ ANALYSE DÉTAILLÉE ━━━━━━━━━━━━━━━━━━━━`)

  const matchedIds: string[] = []

  for (const leaser of allLeasers as LeaserRaw[]) {
    log(``)
    log(`  ▶ ${leaser.name}`)

    const checks: { label: string; pass: boolean; detail: string }[] = []

    // is_active
    const activeRaw = (leaser as unknown as Record<string, unknown>).is_active
    const isActive = activeRaw !== false
    checks.push({
      label: 'is_active',
      pass: isActive,
      detail: `${isActive}`,
    })

    // Amount
    const amountOk = leaser.min_amount <= totalAmount && leaser.max_amount >= totalAmount
    checks.push({
      label: 'Montant',
      pass: amountOk,
      detail: `demande ${totalAmount}€ — fourchette leaser [${leaser.min_amount}€, ${leaser.max_amount}€]`,
    })

    // Ancienneté
    const ancOk = leaser.anciennete_min_mois <= ancienneteMois
    checks.push({
      label: 'Ancienneté',
      pass: ancOk,
      detail: `demande ${ancienneteMois} mois — leaser exige ≥ ${leaser.anciennete_min_mois} mois`,
    })

    // Categories
    const lCats = leaser.leaser_equipment_categories.map(c => c.category)
    const catOk = categories.length === 0 || categories.some(c => lCats.includes(c))
    checks.push({
      label: 'Catégorie',
      pass: catOk,
      detail: `demande [${categories.join(', ') || 'aucune'}] — leaser accepte [${lCats.join(', ')}]`,
    })

    // Financing type
    const lTypes = leaser.leaser_financing_types.map(t => t.financing_type)
    const typeOk = lTypes.includes(financingType)
    checks.push({
      label: 'Type financement',
      pass: typeOk,
      detail: `demande "${financingType}" — leaser accepte [${lTypes.join(', ')}]`,
    })

    for (const c of checks) {
      log(`    ${c.pass ? '✓' : '✗'} ${c.label.padEnd(18)} ${c.detail}`)
    }

    const allPass = checks.every(c => c.pass)

    if (allPass) {
      // Check rate
      let rateRow: { coefficient: number; taux_nominal: number | null } | null = null

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
      if (!rateRow) {
        const { data: r3 } = await supabase
          .from('leaser_rates')
          .select('coefficient, taux_nominal, duration_months')
          .eq('leaser_id', leaser.id)
          .order('duration_months')
          .limit(5)

        log(`    ✗ Taux             aucun taux pour durée ${duration} mois`)
        if (r3 && r3.length > 0) {
          log(`      Durées disponibles : ${r3.map((r: {duration_months: number}) => r.duration_months + ' mois').join(', ')}`)
        } else {
          log(`      ⚠ Aucun taux en base pour ce leaser`)
        }
        continue
      }

      const monthly = Math.round(totalAmount * rateRow.coefficient * 100) / 100
      log(`    ✓ Taux             coeff ${rateRow.coefficient} → mensualité ${monthly}€ (taux ${rateRow.taux_nominal ?? '?'}%)`)
      log(`    → MATCHÉ ✅`)
      matchedIds.push(leaser.id)
    } else {
      const blockers = checks.filter(c => !c.pass).map(c => c.label)
      log(`    → ÉLIMINÉ ❌ (${blockers.join(', ')})`)
    }
  }

  log(``)
  log(`━━ RÉSULTAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  log(`${matchedIds.length} leaser(s) matchés sur ${allLeasers.length}`)

  // Optional: trigger actual matching
  if (trigger && matchedIds.length > 0) {
    log(``)
    log(`━━ DÉCLENCHEMENT MATCHING ━━━━━━━━━━━━━━`)
    const { error: delErr } = await supabase
      .from('offers')
      .delete()
      .eq('request_id', requestId)
    if (delErr) {
      log(`  ⚠ Impossible de supprimer les anciennes offres: ${delErr.message}`)
    } else {
      log(`  ✓ Anciennes offres supprimées`)
    }

    const matchRes = await fetch(new URL('/api/match-leasers', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
      body: JSON.stringify({ requestId }),
    })
    const matchData = await matchRes.json()
    if (matchData.matched) {
      log(`  ✓ Matching exécuté — ${matchData.offers_count} offre(s) insérée(s)`)
      log(`  ✓ Statut demande → offers_available`)
    } else {
      log(`  ✗ Matching échoué: ${JSON.stringify(matchData)}`)
    }
  }

  return NextResponse.json({ logs, matched: matchedIds.length > 0, matched_count: matchedIds.length })
}
