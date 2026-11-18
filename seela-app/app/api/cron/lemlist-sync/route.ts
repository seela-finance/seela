import { NextResponse } from 'next/server'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { isLemlistConfigured, syncLemlist } from '@/lib/lemlist-sync'

// Synchro Lemlist → CRM (événements, pré-pipe, batches) sans dépendre de l'ouverture du CRM : appelée par le cron Vercel
// (vercel.json) toutes les heures, ou à la main. Auth : `Authorization: Bearer <CRON_SECRET>` (Vercel l'ajoute lui-même).
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET non configurée' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 })
  if (!isLemlistConfigured()) return NextResponse.json({ skipped: 'Clé Lemlist absente' })

  try {
    return NextResponse.json(await syncLemlist(createAdminClient()))
  } catch (err) {
    console.error('[cron lemlist-sync]', err)
    return NextResponse.json({ error: 'Synchronisation Lemlist impossible' }, { status: 500 })
  }
}
