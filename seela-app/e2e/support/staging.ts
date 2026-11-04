// Tests de parcours sur le Supabase de STAGING : variables, garde-fous, client service role.
// Ne doit jamais pouvoir viser la prod : la référence du projet est vérifiée dans l'URL ET dans la clé.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const STAGING_REF = 'fmbvvzmoepsyjlhrmbpy'

// Vidées pour le serveur de test : aucun email, appel IA ou appel payant, même si `.env.local` les définit
// (Next ne remplace pas une variable déjà présente dans l'environnement, même vide).
const NEUTRALIZED = ['RESEND_API_KEY', 'ANTHROPIC_API_KEY', 'PAPPERS_API_KEY', 'SLACK_WEBHOOK_URL', 'SEELA_ADMIN_TOKEN']

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq > 0) out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

/** Vrai seulement si l'URL et la clé désignent le projet de staging (la clé n'est jamais affichée). */
export function isStagingConfig(url: string | undefined, serviceKey: string | undefined): boolean {
  if (!url || !serviceKey) return false
  if (new URL(url).hostname !== `${STAGING_REF}.supabase.co`) return false
  try {
    const claims = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64url').toString())
    return claims.ref === STAGING_REF && claims.role === 'service_role'
  } catch {
    return false
  }
}

/** Charge `.env.staging.local` s'il existe (sinon l'environnement, en CI) puis vérifie la cible. */
export function loadStagingEnv(): void {
  const file = resolve(process.cwd(), '.env.staging.local')
  if (existsSync(file)) Object.assign(process.env, parseEnvFile(readFileSync(file, 'utf8')))
  for (const name of NEUTRALIZED) process.env[name] = ''
  process.env.EMAIL_MODE = 'development'

  if (!isStagingConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error(`Tests de parcours refusés : la configuration ne désigne pas le projet de staging ${STAGING_REF}.`)
  }
  if (process.env.PLAYWRIGHT_BASE_URL?.includes('everlease.fr')) {
    throw new Error('Tests de parcours refusés : ils ne tournent jamais sur everlease.fr.')
  }
}

export function stagingAdmin(): SupabaseClient {
  loadStagingEnv()
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ── Comptes éphémères ────────────────────────────────────────────────────────

export const AUTH_DIR = 'e2e/.auth'
export const CONTEXT_FILE = `${AUTH_DIR}/staging-context.json`
export const stateFile = (role: Role) => `${AUTH_DIR}/staging-${role}.json`

export type Role = 'client' | 'admin' | 'intruder'
export type RunContext = {
  runId: string
  companyName: string
  users: Record<Role, { id: string; email: string }>
  leaser: { id: string; name: string; coefficient: number }
}

export const testEmail = (runId: string, role: Role) => `e2e-${runId}-${role}@everlease.test`
// Seuls ces comptes peuvent être supprimés par le nettoyage
export const TEST_EMAIL_PATTERN = /^e2e-[a-z0-9]+-(client|admin|intruder)@everlease\.test$/

export function readContext(): RunContext {
  return JSON.parse(readFileSync(CONTEXT_FILE, 'utf8'))
}
