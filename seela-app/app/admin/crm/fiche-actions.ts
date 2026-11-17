'use server'

import { revalidatePath } from 'next/cache'
import { logAdminEvent, requireAdmin, type Admin } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { isUuid } from '@/lib/admin-request-detail'
import { CrmError } from '@/lib/crm-companies'
import { parseActivityInput, parseCompanyPatch, parseContactInput, parseTaskInput } from '@/lib/crm-activities'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'

export type FicheState = { ok: boolean; message: string } | null
type Db = ReturnType<typeof createAdminClient>

// Droit `crm`, société existante, exécution, message ; la fiche est rafraîchie.
async function run(form: FormData, action: (ctx: { admin: Admin; db: Db; companyId: string; teamIds: string[] }) => Promise<string>): Promise<FicheState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'crm')) return { ok: false, message: 'Votre rôle ne donne pas accès au CRM.' }
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  const companyId = String(form.get('companyId') ?? '')
  if (!isUuid(companyId)) return { ok: false, message: 'Société introuvable.' }
  try {
    const db = createAdminClient()
    const [{ data: company }, { data: team }] = await Promise.all([
      db.from('companies').select('id').eq('id', companyId).maybeSingle(),
      db.from('admins').select('user_id'),
    ])
    if (!company) return { ok: false, message: 'Société introuvable.' }
    const teamIds = ((team ?? []) as { user_id: string }[]).map(t => t.user_id)
    return { ok: true, message: await action({ admin, db, companyId, teamIds }) }
  } catch (err) {
    if (err instanceof CrmError) return { ok: false, message: err.message }
    console.error('[crm fiche]', err)
    return { ok: false, message: 'Enregistrement impossible, rien n’a été modifié. Réessayez.' }
  } finally {
    revalidatePath(`/admin/crm/societes/${companyId}`)
  }
}

const fields = (form: FormData) => Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']))

export async function updateCompanyAction(_: FicheState, form: FormData): Promise<FicheState> {
  return run(form, async ({ admin, db, companyId, teamIds }) => {
    const patch = parseCompanyPatch(fields(form), teamIds)
    if (patch.siren) {
      const { data } = await db.from('companies').select('id, name').eq('siren', patch.siren).neq('id', companyId).maybeSingle()
      if (data) throw new CrmError(`Ce SIREN appartient déjà à « ${data.name} ».`)
    }
    const { error } = await db.from('companies').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', companyId)
    if (error) throw error
    await logAdminEvent(admin, { action: 'CRM : société modifiée', after: { company_id: companyId, ...patch } })
    return 'Propriétés enregistrées.'
  })
}

export async function addContactAction(_: FicheState, form: FormData): Promise<FicheState> {
  return run(form, async ({ admin, db, companyId }) => {
    const input = parseContactInput(fields(form))
    if (input.email) {
      const { data } = await db.from('contacts').select('id').ilike('email', input.email).maybeSingle()
      if (data) throw new CrmError('Un contact existe déjà avec cet email.')
    }
    const { data, error } = await db.from('contacts').insert({ ...input, company_id: companyId, owner_id: admin.userId }).select('id').single()
    if (error) throw error
    await logAdminEvent(admin, { action: 'CRM : contact ajouté', after: { company_id: companyId, contact_id: data.id, ...input } })
    return 'Contact ajouté.'
  })
}

export async function addActivityAction(_: FicheState, form: FormData): Promise<FicheState> {
  return run(form, async ({ admin, db, companyId, teamIds }) => {
    const { data: contacts } = await db.from('contacts').select('id').eq('company_id', companyId)
    const input = parseActivityInput(
      { type: form.get('type'), call_outcome: form.get('call_outcome'), body: form.get('body'), contact_id: form.get('contact_id'), mentions: form.getAll('mentions') },
      teamIds.filter(id => id !== admin.userId),
      ((contacts ?? []) as { id: string }[]).map(c => c.id),
    )
    const { data, error } = await db.from('crm_activities').insert({
      type: input.type, call_outcome: input.call_outcome, body: input.body || null, contact_id: input.contact_id,
      company_id: companyId, author_id: admin.userId,
    }).select('id').single()
    if (error) throw error
    if (input.mentions.length) {
      const { error: mErr } = await db.from('crm_mentions').insert(input.mentions.map(user_id => ({ activity_id: data.id, user_id })))
      if (mErr) throw mErr
    }
    return 'Activité enregistrée.'
  })
}

export async function addTaskAction(_: FicheState, form: FormData): Promise<FicheState> {
  return run(form, async ({ admin, db, companyId, teamIds }) => {
    const input = parseTaskInput(fields(form), teamIds)
    const { error } = await db.from('crm_tasks').insert({ ...input, assignee_id: input.assignee_id ?? admin.userId, company_id: companyId })
    if (error) throw error
    return 'Tâche ajoutée.'
  })
}

export async function completeTaskAction(_: FicheState, form: FormData): Promise<FicheState> {
  return run(form, async ({ db, companyId }) => {
    const taskId = String(form.get('taskId') ?? '')
    if (!isUuid(taskId)) throw new CrmError('Tâche introuvable.')
    const { error } = await db.from('crm_tasks').update({ done_at: new Date().toISOString() }).eq('id', taskId).eq('company_id', companyId)
    if (error) throw error
    return 'Tâche terminée.'
  })
}
