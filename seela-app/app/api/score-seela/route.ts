import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface FinancialData {
  chiffre_affaires: number | null
  resultat_net: number | null
  effectif: number | null
}

function scoreAnciennete(dateCreation: number | null): number {
  if (!dateCreation) return 0
  const currentYear = new Date().getFullYear()
  const years = currentYear - dateCreation
  if (years < 1) return 0
  if (years < 2) return 5
  if (years <= 5) return 15
  return 25
}

function scoreLegalForm(legalForm: string | null): number {
  if (!legalForm) return 0
  const lf = legalForm.toLowerCase()
  if (lf.includes('auto') || lf.includes('entrepreneur individuel')) return 0
  if (lf.includes('responsabilité limitée') || lf.includes('eurl')) return 10
  if (lf.includes('actions simplifiée')) return 15
  return 20
}

function scoreCA(ca: number | null): number {
  if (!ca || ca <= 0) return 0
  if (ca > 2000000) return 15
  if (ca > 500000) return 10
  return 5
}

function scoreEffectif(effectif: number | null): number {
  if (!effectif || effectif <= 0) return 0
  if (effectif > 50) return 10
  if (effectif > 10) return 5
  return 0
}

function scoreNaf(nafCode: string | null): number {
  if (!nafCode) return 5
  const prefix = parseInt(nafCode.slice(0, 2), 10)
  if (isNaN(prefix)) return 5
  if ([62, 63, 72, 85, 86, 87, 88, 58, 61].includes(prefix)) return 10
  if ([45, 46, 47].includes(prefix)) return 5
  if (prefix >= 10 && prefix <= 33) return 5
  if ([56, 41, 42, 43].includes(prefix)) return 0
  return 5
}

function computeGrade(score: number): string {
  if (score >= 80) return 'A'
  if (score >= 65) return 'B+'
  if (score >= 50) return 'B'
  if (score >= 35) return 'C+'
  return 'C'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const financialOverride: FinancialData | undefined = body.financialOverride

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('siren, legal_form, naf_code, date_creation, revenue_declared, result_declared')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let financials: FinancialData = { chiffre_affaires: null, resultat_net: null, effectif: null }
    let score_partial = true

    if (financialOverride) {
      financials = financialOverride
      score_partial = false
    } else if (process.env.PAPPERS_API_KEY && profile.siren) {
      try {
        const pappersUrl = `https://api.pappers.fr/v2/entreprise?siren=${profile.siren}&api_token=${process.env.PAPPERS_API_KEY}&extrait_kbis=false&publications=false&representants=false`
        const pRes = await fetch(pappersUrl)
        if (pRes.ok) {
          const pData = await pRes.json()
          const fin = pData.finances?.[0]
          const effectifMin = pData.effectif_min ?? null
          const effectifMax = pData.effectif_max ?? null
          const effectif = effectifMin !== null || effectifMax !== null
            ? Math.max(effectifMin ?? 0, effectifMax ?? 0)
            : null
          financials = {
            chiffre_affaires: fin?.chiffre_affaires ?? null,
            resultat_net: fin?.resultat ?? null,
            effectif,
          }
          if (financials.chiffre_affaires !== null || financials.resultat_net !== null) {
            score_partial = false
          }
        }
      } catch {
        // Pappers unavailable — fall through to partial score
      }
    }

    const anciennete = scoreAnciennete(profile.date_creation)
    const forme_juridique = scoreLegalForm(profile.legal_form)
    const chiffre_affaires = scoreCA(financials.chiffre_affaires)
    const resultat = financials.resultat_net !== null && financials.resultat_net > 0 ? 10 : 0
    const effectif = scoreEffectif(financials.effectif)
    const naf = scoreNaf(profile.naf_code)

    const raw = anciennete + forme_juridique + chiffre_affaires + resultat + effectif + naf
    const score = Math.min(100, Math.round((raw / 90) * 100))
    const grade = computeGrade(score)

    const details = {
      anciennete,
      forme_juridique,
      chiffre_affaires,
      resultat,
      effectif,
      naf,
      score_partial,
    }

    const updatePayload: Record<string, unknown> = {
      seela_score: score,
      seela_score_grade: grade,
      seela_score_details: details,
    }
    if (financials.chiffre_affaires !== null) {
      updatePayload.revenue_declared = financials.chiffre_affaires
    }
    if (financials.resultat_net !== null) {
      updatePayload.result_declared = financials.resultat_net
    }

    await supabase.from('profiles').update(updatePayload).eq('id', user.id)

    return NextResponse.json({ score, grade, details })
  } catch (err: unknown) {
    console.error('score-seela error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scoring failed' },
      { status: 500 }
    )
  }
}
