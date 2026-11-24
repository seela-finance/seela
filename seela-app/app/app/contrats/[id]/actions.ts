'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/admin-request-detail'
import { KIND_INFO, parseContractRequest } from '@/lib/contract-requests'
import { createContractRequest } from '@/lib/contract-requests-store'
import { emailTeamContractRequest, sendEmail } from '@/lib/email'
import { requestLabel } from '@/lib/request-label'

export type ContractRequestState = { ok: boolean; message: string } | null

/**
 * Le client fait une demande sur son contrat (docs/contrat-client.md). Le dossier doit être le sien et en phase
 * contrat ; la nature doit être ouverte à ce stade. L'équipe est prévenue par email, la demande est visible
 * aussitôt sur la fiche contrat avec son état.
 */
export async function createContractRequestAction(_: ContractRequestState, form: FormData): Promise<ContractRequestState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Reconnectez-vous pour envoyer votre demande.' }
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }

  const requestId = String(form.get('requestId') ?? '')
  if (!isUuid(requestId)) return { ok: false, message: 'Dossier introuvable.' }

  // Lecture sous RLS : le dossier n'est trouvé que s'il appartient au client (ou à sa société)
  const { data: request } = await supabase.from('financing_requests').select('id, status, company_id, companies ( name )').eq('id', requestId).maybeSingle()
  const row = request as unknown as { id: string; status: string; company_id: string | null; companies: { name: string | null } | null } | null
  if (!row) return { ok: false, message: 'Dossier introuvable.' }

  const parsed = parseContractRequest({ kind: form.get('kind'), message: form.get('message') }, row.status)
  if (!parsed.ok) return { ok: false, message: parsed.error }

  try {
    const db = createAdminClient()
    await createContractRequest(db, { request_id: row.id, company_id: row.company_id, kind: parsed.kind, message: parsed.message, created_by: user.id })
    await sendEmail(emailTeamContractRequest({
      companyName: row.companies?.name ?? 'Client', requestRef: requestLabel(row), requestId: row.id, kindLabel: KIND_INFO[parsed.kind].label, message: parsed.message,
    })).catch(() => null)
    revalidatePath(`/app/contrats/${row.id}`)
    return { ok: true, message: `Demande envoyée. Un conseiller vous rappelle sous 24 h ouvrées.` }
  } catch (err) {
    console.error('[demandes contrat]', err)
    return { ok: false, message: 'Envoi impossible, réessayez.' }
  }
}
