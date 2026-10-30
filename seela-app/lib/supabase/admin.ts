import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase « service role » : contourne la RLS.
 * Réservé aux routes admin déjà protégées par isAdminRequest — jamais exposé au navigateur
 * (`server-only` fait échouer le build si un composant client l'importe).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
