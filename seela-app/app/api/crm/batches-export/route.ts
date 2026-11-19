import { NextResponse } from 'next/server'
import { bearerMatches } from '@/lib/bearer'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { batchExportResponse } from '@/lib/crm-batches-load'

// Lecture seule de l'export des batches par les skills /batch et /revue (exception validée par Louis le 19/11/2026) :
// `Authorization: Bearer <CRM_EXPORT_TOKEN>`. Ne donne accès à rien d'autre ; aucune écriture.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const token = process.env.CRM_EXPORT_TOKEN
  if (!token) return NextResponse.json({ error: 'CRM_EXPORT_TOKEN non configurée' }, { status: 503 })
  if (!bearerMatches(req.headers.get('authorization'), token)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 })
  return batchExportResponse(createAdminClient())
}
