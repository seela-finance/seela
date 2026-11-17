// Compte client = un contact (contacts.user_id) rattaché à une société (companies).
// Remplace la table profiles (docs/crm-modele-donnees.md). Fonctions utilisables côté navigateur et serveur.
import type { SupabaseClient } from '@supabase/supabase-js'

export type AccountCompany = {
  id: string; name: string; siren: string | null; legal_form: string | null; naf_code: string | null; creation_year: number | null
  age_bracket: string | null; revenue_declared: number | null; result_declared: number | null
  onboarding_completed: boolean; financial_docs_uploaded: boolean; seela_score: number | null
}
export type Account = {
  contactId: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null
  company: AccountCompany | null
}

const COMPANY_COLUMNS = 'id, name, siren, legal_form, naf_code, creation_year, age_bracket, revenue_declared, result_declared, onboarding_completed, financial_docs_uploaded, seela_score'

/** Le contact du compte connecté et sa société. null si le contact n'existe pas encore. */
export async function loadAccount(db: SupabaseClient, userId: string): Promise<Account | null> {
  const { data } = await db
    .from('contacts')
    .select(`id, first_name, last_name, email, phone, companies ( ${COMPANY_COLUMNS} )`)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  const row = data as unknown as { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; companies: AccountCompany | null }
  return { contactId: row.id, firstName: row.first_name, lastName: row.last_name, email: row.email, phone: row.phone, company: row.companies }
}

export const onboardingDone = (a: Account | null) => !!a?.company?.onboarding_completed

// ─── Rattachement à une société pendant l'onboarding ────────────────────────

export type SirenMatch = { id: string; hasOtherUser: boolean } | null

export type CompanyDecision =
  | { kind: 'update'; companyId: string; setSiren: boolean; flagged: boolean }
  | { kind: 'create'; setSiren: boolean; flagged: boolean }

/**
 * Le SIREN est public : il ne suffit pas à rejoindre une société où un autre compte travaille déjà
 * (il verrait ses dossiers). Dans ce cas la société est créée sans SIREN et signalée à l'équipe.
 * Une société connue du CRM sans compte client (un prospect) est rejointe : le prospect devient le compte.
 */
export function decideCompany(currentCompanyId: string | null, match: SirenMatch): CompanyDecision {
  if (!match || match.id === currentCompanyId) {
    return currentCompanyId ? { kind: 'update', companyId: currentCompanyId, setSiren: true, flagged: false } : { kind: 'create', setSiren: true, flagged: false }
  }
  if (match.hasOtherUser) {
    return currentCompanyId ? { kind: 'update', companyId: currentCompanyId, setSiren: false, flagged: true } : { kind: 'create', setSiren: false, flagged: true }
  }
  return { kind: 'update', companyId: match.id, setSiren: true, flagged: false }
}
