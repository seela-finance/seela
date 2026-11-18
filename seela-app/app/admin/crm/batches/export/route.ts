import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { batchExport } from '@/lib/crm-batches'
import { loadBatchReports } from '@/lib/crm-batches-load'

// Export de la performance des batches, lu par la skill /analyse-batch (Claude n'accède jamais à la base de prod)
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireCapability('crm')
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 })
  const now = new Date()
  const body = batchExport(await loadBatchReports(createAdminClient()), now)
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="batches-${now.toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  })
}
