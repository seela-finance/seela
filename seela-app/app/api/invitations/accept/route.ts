import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { ClientActionError } from '@/lib/client-workflow'
import { supabasePartnerStore } from '@/lib/partner-store'
import { acceptInvitation } from '@/lib/partner-workflow'

// Le client rejoint le dossier préparé par son distributeur : session ouverte avec l'email invité.
export async function POST(req: Request) {
  const body = ((await req.json().catch(() => null)) ?? {}) as { token?: unknown }
  const token = typeof body.token === 'string' ? body.token : ''
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 })

  const db = createAdminClient()
  try {
    const requestId = await acceptInvitation(supabasePartnerStore(db), user.id, user.email ?? null, token)
    // Directement sur ses offres : l'onboarding viendra après, avec la société du dossier déjà fixée
    return NextResponse.json({ requestId, next: `/app/offres/${requestId}` })
  } catch (err) {
    if (err instanceof ClientActionError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[invitation] accept', err)
    return NextResponse.json({ error: 'Erreur serveur, réessayez.' }, { status: 500 })
  }
}
