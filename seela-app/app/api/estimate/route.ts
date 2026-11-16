import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { loadActiveLeasers } from '@/lib/matching'
import { estimateOptions } from '@/lib/estimates'
import { familyOf, typeOf } from '@/lib/equipment'

// Loyers estimés par durée pour un montant et un matériel : jamais de nom ni de barème de leaser,
// seulement les durées couvertes et le meilleur loyer de chacune. Réservé aux clients connectés.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!isServiceRoleConfigured()) return NextResponse.json({ options: [] })

  const body = ((await req.json().catch(() => null)) ?? {}) as { amount?: unknown; documentType?: unknown; equipment?: unknown }
  const amount = typeof body.amount === 'number' && Number.isFinite(body.amount) ? body.amount : 0
  if (amount <= 0 || amount > 10_000_000) return NextResponse.json({ options: [] })
  const equipment = typeof body.equipment === 'string' && (typeOf(body.equipment) || familyOf(body.equipment)) ? body.equipment : null

  try {
    const leasers = await loadActiveLeasers(createAdminClient(), user.id)
    const options = estimateOptions(leasers, {
      amount,
      equipment,
      financingType: body.documentType === 'facture' ? 'lease_back' : 'leasing',
    })
    return NextResponse.json({ options })
  } catch (err) {
    console.error('[estimate]', err)
    return NextResponse.json({ options: [] })
  }
}
