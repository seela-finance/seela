'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { logAdminEvent, requireAdmin, type Admin } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { isUuid } from '@/lib/admin-request-detail'
import { CrmError } from '@/lib/crm-companies'
import { parseContactInput } from '@/lib/crm-activities'
import { isDealStage, parseContactPatch, parseDealInput, DEAL_STAGE_LABEL } from '@/lib/crm-deals'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { syncLemlist } from '@/lib/lemlist-sync'
import { syncMailbox, testImapLogin, type Mailbox } from '@/lib/mailbox-sync'
import { isSecretBoxConfigured, seal } from '@/lib/secret-box'

export type CrmFormState = { ok: boolean; message: string; id?: string } | null
type Db = ReturnType<typeof createAdminClient>

async function guard(action: (ctx: { admin: Admin; db: Db; teamIds: string[] }) => Promise<{ message: string; id?: string }>): Promise<CrmFormState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'crm')) return { ok: false, message: 'Votre rôle ne donne pas accès au CRM.' }
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  try {
    const db = createAdminClient()
    const { data: team } = await db.from('admins').select('user_id')
    const teamIds = ((team ?? []) as { user_id: string }[]).map(t => t.user_id)
    return { ok: true, ...(await action({ admin, db, teamIds })) }
  } catch (err) {
    if (err instanceof CrmError) return { ok: false, message: err.message }
    console.error('[crm]', err)
    return { ok: false, message: 'Enregistrement impossible, rien n’a été modifié. Réessayez.' }
  } finally {
    revalidatePath('/admin/crm', 'layout')
  }
}

const fields = (form: FormData) => Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']))

async function companyIds(db: Db, id: string) {
  if (!isUuid(id)) return []
  const { data } = await db.from('companies').select('id').eq('id', id).maybeSingle()
  return data ? [id] : []
}

async function assertEmailFree(db: Db, email: string | null, exceptId?: string) {
  if (!email) return
  let q = db.from('contacts').select('id').ilike('email', email)
  if (exceptId) q = q.neq('id', exceptId)
  const { data } = await q.limit(1)
  if (data?.length) throw new CrmError('Un contact existe déjà avec cet email.')
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function createContactAction(_: CrmFormState, form: FormData): Promise<CrmFormState> {
  return guard(async ({ admin, db }) => {
    const input = parseContactInput(fields(form))
    const [companyId] = await companyIds(db, String(form.get('company_id') ?? ''))
    await assertEmailFree(db, input.email)
    const { data, error } = await db.from('contacts').insert({ ...input, company_id: companyId ?? null, owner_id: admin.userId }).select('id').single()
    if (error) throw error
    await logAdminEvent(admin, { action: 'CRM : contact ajouté', after: { company_id: companyId ?? null, contact_id: data.id, ...input } })
    return { message: 'Contact créé.', id: data.id }
  })
}

export async function updateContactAction(_: CrmFormState, form: FormData): Promise<CrmFormState> {
  return guard(async ({ admin, db, teamIds }) => {
    const id = String(form.get('contactId') ?? '')
    if (!isUuid(id)) throw new CrmError('Contact introuvable.')
    const patch = parseContactPatch(fields(form), teamIds, await companyIds(db, String(form.get('company_id') ?? '')))
    await assertEmailFree(db, patch.email, id)
    const { data: before } = await db.from('contacts').select('user_id, email').eq('id', id).maybeSingle()
    if (!before) throw new CrmError('Contact introuvable.')
    // L'email d'un contact qui a un accès app est son identifiant de connexion : il ne se change pas ici
    if (before.user_id && patch.email !== before.email) throw new CrmError('Ce contact se connecte avec son email : il ne peut pas être modifié depuis le CRM.')
    const { error } = await db.from('contacts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    await logAdminEvent(admin, { action: 'CRM : contact modifié', after: { contact_id: id, ...patch } })
    return { message: 'Contact enregistré.' }
  })
}

// ─── Deals ───────────────────────────────────────────────────────────────────

export async function createDealAction(_: CrmFormState, form: FormData): Promise<CrmFormState> {
  return guard(async ({ admin, db, teamIds }) => {
    const input = parseDealInput(fields(form), teamIds, await companyIds(db, String(form.get('company_id') ?? '')))
    const { data, error } = await db.from('crm_deals').insert({ ...input, owner_id: input.owner_id ?? admin.userId }).select('id').single()
    if (error) throw error
    await logAdminEvent(admin, { action: 'CRM : deal créé', after: { company_id: input.company_id, deal_id: data.id, name: input.name, stage: input.stage } })
    return { message: 'Deal créé.', id: data.id }
  })
}

export async function moveDealAction(_: CrmFormState, form: FormData): Promise<CrmFormState> {
  return guard(async ({ admin, db }) => {
    const id = String(form.get('dealId') ?? '')
    const stage = form.get('stage')
    if (!isUuid(id) || !isDealStage(stage)) throw new CrmError('Deal introuvable.')
    const lost = String(form.get('lost_reason') ?? '').trim()
    const { data, error } = await db.from('crm_deals')
      .update({ stage, lost_reason: stage === 'lost' ? lost || null : null, updated_at: new Date().toISOString() })
      .eq('id', id).select('company_id, name').single()
    if (error) throw error
    await logAdminEvent(admin, { action: `CRM : deal « ${data.name} » → ${DEAL_STAGE_LABEL[stage]}`, after: { company_id: data.company_id, deal_id: id, stage } })
    return { message: 'Étape mise à jour.' }
  })
}

// ─── Lemlist ─────────────────────────────────────────────────────────────────

export async function syncLemlistAction(_: CrmFormState, form: FormData): Promise<CrmFormState> {
  return guard(async ({ admin, db }) => {
    const result = await syncLemlist(db, { full: form.get('full') === 'on' })
    if ('skipped' in result) {
      if (result.skipped.includes('en cours')) return { message: 'Un import est déjà en cours : rafraîchissez la page dans une minute.' }
      throw new CrmError(result.skipped)
    }
    await logAdminEvent(admin, { action: 'CRM : synchronisation Lemlist', after: result })
    return { message: `${result.imported} événement(s) importé(s), ${result.emailsWithContent} email(s) complet(s), ${result.leadsEntered} société(s) entrée(s) ou avancée(s) dans le pré-pipe, ${result.contactsCreated} contact(s) et ${result.companiesCreated} société(s) créés.` }
  })
}

// ─── Boîte mail (IMAP, lecture seule) ────────────────────────────────────────

export async function connectMailboxAction(_: CrmFormState, form: FormData): Promise<CrmFormState> {
  return guard(async ({ admin, db }) => {
    if (!isSecretBoxConfigured()) throw new CrmError('Clé de chiffrement absente sur le serveur (EMAIL_ENCRYPTION_KEY).')
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const password = String(form.get('password') ?? '')
    const host = String(form.get('imap_host') ?? '').trim().toLowerCase() || 'imap.hostinger.com'
    const port = Number(form.get('imap_port') ?? 993) || 993
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) throw new CrmError('Indiquez votre email et votre mot de passe.')
    if (!/^[a-z0-9.-]+$/.test(host) || port < 1 || port > 65535) throw new CrmError('Serveur ou port invalide.')
    const refused = await testImapLogin({ email, imap_host: host, imap_port: port }, password)
    if (refused) throw new CrmError(refused)
    const { data, error } = await db.from('crm_mailboxes')
      .upsert({ user_id: admin.userId, email, imap_host: host, imap_port: port, password_enc: seal(password), folders: {}, last_error: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('*').single()
    if (error) throw error
    await logAdminEvent(admin, { action: 'CRM : boîte mail connectée', after: { email, imap_host: host } })
    after(() => syncMailbox(createAdminClient(), data as Mailbox).catch(err => console.error('[mailbox initial]', err)))
    return { message: 'Boîte connectée. Import des 90 derniers jours en cours : rafraîchissez dans une minute.' }
  })
}

export async function syncMailboxAction(): Promise<CrmFormState> {
  return guard(async ({ admin, db }) => {
    const { data } = await db.from('crm_mailboxes').select('*').eq('user_id', admin.userId).maybeSingle()
    if (!data) throw new CrmError('Aucune boîte connectée.')
    const result = await syncMailbox(db, data as Mailbox)
    if ('skipped' in result) throw new CrmError(result.skipped)
    return { message: `${result.scanned} email(s) parcouru(s), ${result.imported} échange(s) avec des contacts enregistré(s).` }
  })
}

export async function disconnectMailboxAction(): Promise<CrmFormState> {
  return guard(async ({ admin, db }) => {
    const { error } = await db.from('crm_mailboxes').delete().eq('user_id', admin.userId)
    if (error) throw error
    await logAdminEvent(admin, { action: 'CRM : boîte mail déconnectée' })
    return { message: 'Boîte déconnectée, mot de passe effacé. Les emails déjà enregistrés restent sur les fiches.' }
  })
}

// ─── Réglages du pré-pipe ────────────────────────────────────────────────────

export async function saveCrmSettingsAction(_: CrmFormState, form: FormData): Promise<CrmFormState> {
  return guard(async ({ admin, db, teamIds }) => {
    const owner = String(form.get('prepipe_owner') ?? '')
    const threshold = Number(form.get('sequence_threshold'))
    if (owner && !teamIds.includes(owner)) throw new CrmError('Propriétaire inconnu.')
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new CrmError('Seuil invalide.')
    const now = new Date().toISOString()
    const { error } = await db.from('crm_settings').upsert([
      { key: 'prepipe_owner', value: owner || null, updated_at: now },
      { key: 'sequence_threshold', value: threshold, updated_at: now },
    ])
    if (error) throw error
    await logAdminEvent(admin, { action: 'CRM : réglages du pré-pipe', after: { prepipe_owner: owner || null, sequence_threshold: threshold } })
    return { message: 'Réglages enregistrés. Ils s’appliquent aux prochains leads.' }
  })
}
