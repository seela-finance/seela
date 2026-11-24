import { NextResponse } from 'next/server'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { sensitiveDocsToPurge, type PieceDoc } from '@/lib/pieces'
import { purgePiece } from '@/lib/pieces-store'

// Efface les pièces sensibles (pièce d'identité, RIB) 30 jours après la décision du financeur
// (docs/pieces-et-compte.md). Cron Vercel quotidien ; auth : `Authorization: Bearer <CRON_SECRET>`.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

type Row = PieceDoc & { company_id: string }

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET non configurée' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 })

  const db = createAdminClient()
  const { data: docs, error } = await db.from('company_documents')
    .select('id, company_id, kind, status, path, file_name, review_note, created_at, reviewed_at, deleted_at')
    .in('kind', ['identite', 'rib']).is('deleted_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (docs ?? []) as Row[]
  if (rows.length === 0) return NextResponse.json({ purged: 0 })

  const companyIds = [...new Set(rows.map(r => r.company_id))]
  const { data: requests } = await db.from('financing_requests').select('company_id, status, updated_at').in('company_id', companyIds)
  const due = sensitiveDocsToPurge(rows, d => (d as Row).company_id, (requests ?? []) as { company_id: string | null; status: string; updated_at: string }[])

  const failures: string[] = []
  for (const doc of due) {
    try {
      await purgePiece(db, doc)
    } catch (err) {
      failures.push(`${doc.id}: ${err instanceof Error ? err.message : 'erreur'}`)
    }
  }
  if (failures.length) console.error('[cron purge-pieces]', failures)
  return NextResponse.json({ purged: due.length - failures.length, failures })
}
