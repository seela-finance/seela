'use server'

import { revalidatePath } from 'next/cache'
import { logAdminEvent, requireAdmin } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { isUuid } from '@/lib/admin-request-detail'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'

export type PartnerState = { ok: boolean; message: string } | null

// Activer ou retirer l'espace partenaire d'une société (parcours distributeur). Réservé aux membres qui décident des dossiers.
export async function setPartnerAction(_: PartnerState, form: FormData): Promise<PartnerState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'decide_requests')) return { ok: false, message: 'Votre rôle ne permet pas cette action.' }
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  const companyId = String(form.get('companyId') ?? '')
  const enabled = form.get('enabled') === 'true'
  if (!isUuid(companyId)) return { ok: false, message: 'Société introuvable.' }

  const db = createAdminClient()
  const { data, error } = await db.from('companies')
    .update({ partner_enabled: enabled, ...(enabled ? { lifecycle_stage: 'partenaire' } : {}), updated_at: new Date().toISOString() })
    .eq('id', companyId).select('id')
  if (error || !data?.length) return { ok: false, message: 'Enregistrement impossible, réessayez.' }
  await logAdminEvent(admin, { action: enabled ? 'partner_enabled' : 'partner_disabled', after: { company_id: companyId } })
  revalidatePath('/admin/crm', 'layout')
  return { ok: true, message: enabled ? 'Espace partenaire activé : ses comptes voient « Mes clients ».' : 'Espace partenaire retiré.' }
}
