import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { supabaseClientStore } from '@/lib/client-store'
import { ClientActionError, type ClientStore } from '@/lib/client-workflow'
import { TransitionError } from '@/lib/transitions'
import type { SupabaseClient } from '@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Cadre commun des routes client : session obligatoire, id valide, écritures en service role
 * (propriétaire vérifié par la logique métier), erreurs traduites en JSON lisible.
 */
export async function clientRoute(
  id: string,
  handler: (ctx: { userId: string; store: ClientStore; db: SupabaseClient }) => Promise<Record<string, unknown>>,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!UUID.test(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: SERVICE_ROLE_MISSING_MESSAGE }, { status: 503 })

  const db = createAdminClient()
  try {
    return NextResponse.json(await handler({ userId: user.id, store: supabaseClientStore(db), db }))
  } catch (err) {
    if (err instanceof ClientActionError) return NextResponse.json({ error: err.message }, { status: err.status })
    if (err instanceof TransitionError && err.status === 409) {
      return NextResponse.json({ error: 'Le dossier a changé entre-temps. Rechargez la page.' }, { status: 409 })
    }
    console.error('[client route]', err)
    return NextResponse.json({ error: 'Erreur serveur, réessayez.' }, { status: 500 })
  }
}
