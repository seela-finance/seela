import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isWebmailDomain, nameFromDomain, normalizeDomain } from '@/lib/crm-companies'
import { enterPrepipe, getCrmSettings } from '@/lib/crm-prepipe-store'
import { saveCompanyAttribution } from '@/lib/attribution-store'
import type { Attribution } from '@/lib/attribution'

const like = (s: string) => s.replace(/[\\%_]/g, c => `\\${c}`)

/**
 * Demande entrante (formulaire « parler à un expert ») → contact + société dans le CRM, la demande en note sur la fiche,
 * et pré-pipe inbound « Analyse de qualification » (sauf demandes de partenariat : fournisseurs, financeurs). Retrouve l'existant par email, domaine, puis nom.
 */
export async function recordInboundLead(db: SupabaseClient, lead: {
  entreprise: string; prenom: string; nom: string; role: string; email: string; telephone: string; devis: string; origine?: string | null
  /** Source du visiteur (cookie lu par la route), copiée sur la société si elle n'en a pas */
  attribution?: Attribution | null
}) {
  const email = lead.email.trim().toLowerCase()
  const domain = normalizeDomain(email)
  const companyDomain = domain && !isWebmailDomain(domain) ? domain : null

  const { data: found } = await db.from('contacts').select('id, company_id').ilike('email', like(email)).limit(1)
  let contact = (found?.[0] ?? null) as { id: string; company_id: string | null } | null
  let companyId = contact?.company_id ?? null

  if (!companyId && companyDomain) {
    const { data } = await db.from('companies').select('id').ilike('domain', companyDomain).order('created_at').limit(1)
    companyId = data?.[0]?.id ?? null
  }
  if (!companyId) {
    const { data } = await db.from('companies').select('id').ilike('name', like(lead.entreprise.trim())).order('created_at').limit(1)
    companyId = data?.[0]?.id ?? null
  }
  if (!companyId) {
    const { data, error } = await db.from('companies').insert({ name: lead.entreprise.trim().slice(0, 200), domain: companyDomain, source: 'Formulaire expert' }).select('id').single()
    if (error) throw error
    companyId = data.id as string
  }
  if (!contact) {
    const { data, error } = await db.from('contacts').insert({
      company_id: companyId, email, first_name: lead.prenom.trim().slice(0, 100), last_name: lead.nom.trim().slice(0, 100),
      phone: lead.telephone.trim().slice(0, 30), job_title: lead.role.trim().slice(0, 100),
    }).select('id, company_id').single()
    if (error) throw error
    contact = data as { id: string; company_id: string | null }
  }

  await saveCompanyAttribution(db, companyId, lead.attribution ?? null)
  await db.from('crm_activities').insert({
    type: 'note', source: 'site', company_id: companyId, contact_id: contact.id,
    body: [`Demande « Parler à un expert » depuis le site.`, `Rôle : ${lead.role}`, `Devis en main : ${lead.devis}`, lead.origine ? `Provenance : ${lead.origine}` : null].filter(Boolean).join('\n'),
  })
  // Les demandes de fournisseurs ou de financeurs sont des partenariats, pas des prospects : pas de pré-pipe
  if (/fournisseur|distributeur|financeur/i.test(lead.origine ?? '')) return
  await enterPrepipe(db, companyId, { channel: 'inbound', signal: 'expert', status: 'qualification', strong: true }, await getCrmSettings(db))
}

/**
 * Inscription sur l'app, avant que la personne indique son entreprise : avec une adresse professionnelle, la société
 * est retrouvée ou créée par le domaine et entre dans le pré-pipe inbound. Jamais de rattachement à une société où
 * un autre client a déjà un compte (il verrait ses dossiers). L'onboarding complète ensuite cette société (SIREN, nom).
 */
export async function recordSignupLead(db: SupabaseClient, user: { id: string; email?: string | null }): Promise<'entered' | 'skipped'> {
  const email = (user.email ?? '').trim().toLowerCase()
  const domain = normalizeDomain(email)
  if (!domain || isWebmailDomain(domain)) return 'skipped'

  let { data: contact } = await db.from('contacts').select('id, company_id').eq('user_id', user.id).maybeSingle()
  if (!contact) {
    const { data, error } = await db.from('contacts').insert({ user_id: user.id, email }).select('id, company_id').single()
    if (error) throw error
    contact = data
  }
  if (!contact || contact.company_id) return 'skipped'

  const { data: found } = await db.from('companies').select('id, contacts ( user_id )').ilike('domain', domain).order('created_at').limit(1)
  const existing = found?.[0] as { id: string; contacts: { user_id: string | null }[] | null } | undefined
  if (existing && (existing.contacts ?? []).some(c => c.user_id && c.user_id !== user.id)) return 'skipped'

  let companyId = existing?.id ?? null
  if (!companyId) {
    const { data, error } = await db.from('companies').insert({ name: nameFromDomain(domain), domain, source: 'Inscription app' }).select('id').single()
    if (error) throw error
    companyId = data.id as string
  }
  const { error: cErr } = await db.from('contacts').update({ company_id: companyId, updated_at: new Date().toISOString() }).eq('id', contact.id)
  if (cErr) throw cErr
  await saveCompanyAttribution(db, companyId)
  await enterPrepipe(db, companyId, { channel: 'inbound', signal: 'inscription_partielle', status: 'qualification', strong: true }, await getCrmSettings(db))
  return 'entered'
}
