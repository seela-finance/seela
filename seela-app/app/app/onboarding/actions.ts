'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decideCompany } from '@/lib/account'
import { isSiren } from '@/lib/company-registry'

type Result = { ok: true } | { ok: false; message: string }
const FAIL: Result = { ok: false, message: 'Enregistrement impossible. Réessayez dans un instant.' }

const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null

/** Le contact du compte connecté (créé s'il manque). Les écritures passent par le serveur. */
async function currentContact() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('contacts').select('id, company_id').eq('user_id', user.id).maybeSingle()
  if (data) return { db, user, contact: data as { id: string; company_id: string | null } }
  const { data: created, error } = await db.from('contacts').insert({ user_id: user.id, email: user.email ?? null }).select('id, company_id').single()
  if (error) throw error
  return { db, user, contact: created as { id: string; company_id: string | null } }
}

export async function saveOnboardingCompany(input: {
  country: string; name: string; siren: string; legal_form: string | null; naf_code: string | null; year_created: number | null; address: string | null
}): Promise<Result> {
  try {
    const ctx = await currentContact()
    if (!ctx) return { ok: false, message: 'Session expirée, reconnectez-vous.' }
    const { db, user, contact } = ctx
    const name = text(input.name)
    const siren = isSiren(input.siren) ? input.siren : null
    if (!name) return { ok: false, message: 'Choisissez votre entreprise.' }

    let match = null
    if (siren) {
      const { data } = await db.from('companies').select('id, contacts ( user_id )').eq('siren', siren).maybeSingle()
      if (data) {
        const users = ((data as { contacts: { user_id: string | null }[] | null }).contacts ?? []).map(c => c.user_id)
        match = { id: (data as { id: string }).id, hasOtherUser: users.some(u => u && u !== user.id) }
      }
    }
    const decision = decideCompany(contact.company_id, match)
    const year = Number.isInteger(input.year_created) ? input.year_created : null
    const fields: Record<string, unknown> = {
      name, legal_form: text(input.legal_form), naf_code: text(input.naf_code, 10), creation_year: year,
      address: text(input.address, 300), country: text(input.country, 2) ?? 'FR', updated_at: new Date().toISOString(),
    }
    if (decision.setSiren) fields.siren = siren
    if (decision.flagged) fields.signal = `SIREN ${siren} déjà utilisé par une autre société cliente : à vérifier`

    let companyId: string
    if (decision.kind === 'update') {
      const { error } = await db.from('companies').update(fields).eq('id', decision.companyId)
      if (error) throw error
      companyId = decision.companyId
    } else {
      const { data, error } = await db.from('companies').insert({ ...fields, source: 'Inscription app' }).select('id').single()
      if (error) throw error
      companyId = data.id
    }

    const { error: cErr } = await db.from('contacts').update({ company_id: companyId, updated_at: new Date().toISOString() }).eq('id', contact.id)
    if (cErr) throw cErr
    // Dossiers créés avant que la société soit connue
    await db.from('financing_requests').update({ company_id: companyId, created_by: contact.id }).eq('user_id', user.id).is('company_id', null)
    return { ok: true }
  } catch (err) {
    console.error('[onboarding société]', err)
    return FAIL
  }
}

export async function saveOnboardingContact(input: { first_name: string; last_name: string; phone: string; role: string }): Promise<Result> {
  try {
    const ctx = await currentContact()
    if (!ctx) return { ok: false, message: 'Session expirée, reconnectez-vous.' }
    const { error } = await ctx.db.from('contacts').update({
      first_name: text(input.first_name, 100), last_name: text(input.last_name, 100), phone: text(input.phone, 30),
      job_title: text(input.role, 100), updated_at: new Date().toISOString(),
    }).eq('id', ctx.contact.id)
    if (error) throw error
    return { ok: true }
  } catch (err) {
    console.error('[onboarding contact]', err)
    return FAIL
  }
}

async function setCompanyFlag(flag: 'onboarding_completed' | 'financial_docs_uploaded'): Promise<Result> {
  try {
    const ctx = await currentContact()
    if (!ctx) return { ok: false, message: 'Session expirée, reconnectez-vous.' }
    if (!ctx.contact.company_id) return { ok: false, message: 'Indiquez d’abord votre entreprise.' }
    const { error } = await ctx.db.from('companies').update({ [flag]: true, updated_at: new Date().toISOString() }).eq('id', ctx.contact.company_id)
    if (error) throw error
    return { ok: true }
  } catch (err) {
    console.error('[onboarding]', err)
    return FAIL
  }
}

export async function completeOnboarding(): Promise<Result> {
  return setCompanyFlag('onboarding_completed')
}

export async function markFinancialDocsUploaded(): Promise<Result> {
  return setCompanyFlag('financial_docs_uploaded')
}
