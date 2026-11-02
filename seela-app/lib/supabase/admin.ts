import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase « service role » : contourne la RLS.
 * Réservé aux routes admin déjà protégées par isAdminRequest — jamais exposé au navigateur
 * (`server-only` fait échouer le build si un composant client l'importe).
 */
/** false si la clé service role n'est pas configurée (ex. variable absente dans Vercel). */
export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export const SERVICE_ROLE_MISSING_MESSAGE =
  'Configuration serveur incomplète : la variable SUPABASE_SERVICE_ROLE_KEY est absente.'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
