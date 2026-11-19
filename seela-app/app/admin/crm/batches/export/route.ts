import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { batchExportResponse } from '@/lib/crm-batches-load'

// Export des batches en téléchargement depuis le back-office (même contenu que /api/crm/batches-export, lu par /batch et /revue)
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireCapability('crm')
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 })
  return batchExportResponse(createAdminClient())
}
