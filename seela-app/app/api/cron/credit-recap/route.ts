import { NextResponse } from 'next/server'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { buildRecap, CreditAnalysisError, sendRecap } from '@/lib/credit-analyst'

// Récapitulatif des demandes reçues, envoyé à l'équipe : appelé par le cron Vercel (vercel.json) chaque matin
// de semaine, ou à la main. Auth : `Authorization: Bearer <CRON_SECRET>` (Vercel l'ajoute lui-même).
// Paramètres : ?days=N (fenêtre ; défaut 1 jour, 3 le lundi pour couvrir le week-end), ?limit=N (analyses
// manquantes lancées pendant ce passage, 0 à 5 ; défaut 3), ?send=0 (ne pas envoyer l'email, renvoyer le JSON).
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET non configurée' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const daysParam = Number.parseInt(searchParams.get('days') ?? '', 10)
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : now.getUTCDay() === 1 ? 3 : 1
  const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(limitParam) && limitParam >= 0 ? Math.min(limitParam, 5) : 3
  const send = searchParams.get('send') !== '0'
  const since = new Date(now.getTime() - days * 86_400_000)

  try {
    const recap = await buildRecap(createAdminClient(), since, limit, now)
    const sent = send ? await sendRecap(recap) : null
    return NextResponse.json({
      since: recap.since,
      until: recap.until,
      count: recap.items.length,
      analyzedNow: recap.analyzedNow,
      missing: recap.missing,
      sent: sent?.success ?? false,
      items: recap.items.map(i => ({ id: i.id, ref: i.ref, company: i.companyName, amount: i.amount, status: i.status, avis: i.avis })),
    })
  } catch (err) {
    console.error('[cron credit-recap]', err)
    const message = err instanceof CreditAnalysisError ? err.message : 'Récapitulatif impossible'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
