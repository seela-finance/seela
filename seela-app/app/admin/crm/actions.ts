'use server'

import { revalidatePath } from 'next/cache'
import { logAdminEvent, requireAdmin } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { CrmError, findDuplicate, parseCompanyInput, type CrmCompany } from '@/lib/crm-companies'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'

export type CompanyFormValues = { name: string; siren: string; domain: string; sector: string; stage: string }
export type CrmActionState = { ok: boolean; message: string; id?: string; confirmDomain?: boolean; values?: CompanyFormValues } | null

export async function createCompanyAction(_: CrmActionState, form: FormData): Promise<CrmActionState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'crm')) return { ok: false, message: 'Votre rôle ne donne pas accès au CRM.' }
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }

  const str = (k: string) => String(form.get(k) ?? '')
  const values: CompanyFormValues = { name: str('name'), siren: str('siren'), domain: str('domain'), sector: str('sector'), stage: str('stage') }
  try {
    const input = parseCompanyInput(values)
    const db = createAdminClient()

    const filters = [input.siren && `siren.eq.${input.siren}`, input.domain && `domain.ilike.${input.domain}`].filter(Boolean)
    if (filters.length) {
      const { data, error } = await db.from('companies').select('id, name, siren, domain').or(filters.join(','))
      if (error) throw error
      const dup = findDuplicate(input, (data ?? []) as Pick<CrmCompany, 'id' | 'name' | 'siren' | 'domain'>[])
      if (dup?.kind === 'siren') {
        return { ok: false, values, message: `Ce SIREN appartient déjà à « ${dup.company.name} ».`, id: dup.company.id }
      }
      if (dup?.kind === 'domain' && form.get('confirmDomain') !== 'on') {
        return { ok: false, values, confirmDomain: true, id: dup.company.id, message: `« ${dup.company.name} » utilise déjà ce domaine. S’il s’agit d’une autre société du même groupe, confirmez.` }
      }
    }

    const { data, error } = await db
      .from('companies')
      .insert({ name: input.name, siren: input.siren, domain: input.domain, sector: input.sector, lifecycle_stage: input.stage, owner_id: admin.userId })
      .select('id')
      .single()
    if (error) throw error

    await logAdminEvent(admin, { action: 'CRM : société créée', after: { company_id: data.id, ...input } })
    revalidatePath('/admin/crm/societes')
    return { ok: true, message: `« ${input.name} » est créée.`, id: data.id }
  } catch (err) {
    if (err instanceof CrmError) return { ok: false, values, message: err.message }
    console.error('[crm société]', err)
    return { ok: false, values, message: 'Création impossible, rien n’a été enregistré. Réessayez.' }
  }
}
