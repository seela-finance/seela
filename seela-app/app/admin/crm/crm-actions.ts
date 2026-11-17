'use server'

import { revalidatePath } from 'next/cache'
import { logAdminEvent, requireAdmin, type Admin } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { isUuid } from '@/lib/admin-request-detail'
import { CrmError } from '@/lib/crm-companies'
import { parseContactInput } from '@/lib/crm-activities'
import { isDealStage, parseContactPatch, parseDealInput, DEAL_STAGE_LABEL } from '@/lib/crm-deals'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'

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
      .update({ stage, lost_reason: stage === 'perdu' ? lost || null : null, updated_at: new Date().toISOString() })
      .eq('id', id).select('company_id, name').single()
    if (error) throw error
    await logAdminEvent(admin, { action: `CRM : deal « ${data.name} » → ${DEAL_STAGE_LABEL[stage]}`, after: { company_id: data.company_id, deal_id: id, stage } })
    return { message: 'Étape mise à jour.' }
  })
}
