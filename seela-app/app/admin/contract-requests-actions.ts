'use server'

import { revalidatePath } from 'next/cache'
import { logAdminEvent, requireAdmin } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { isUuid } from '@/lib/admin-request-detail'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { canTransition, isContractRequestStatus, kindLabel, STATUS_INFO } from '@/lib/contract-requests'
import { updateContractRequest } from '@/lib/contract-requests-store'
import { emailClientContractRequestAnswered, sendEmail } from '@/lib/email'
import { requestLabel } from '@/lib/request-label'

export type ContractRequestAdminState = { ok: boolean; message: string } | null

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim().slice(0, 4000)

/**
 * L'équipe fait avancer une demande du client (docs/contrat-client.md) : prise en charge, réponse (envoyée au client
 * par email), clôture. Ouvert aux deux rôles : c'est de la relation client, pas une décision de financement.
 */
export async function updateContractRequestAction(_: ContractRequestAdminState, form: FormData): Promise<ContractRequestAdminState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'add_notes')) return { ok: false, message: 'Votre rôle ne permet pas cette action.' }
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  const id = field(form, 'id'), status = field(form, 'status'), answer = field(form, 'answer')
  if (!isUuid(id)) return { ok: false, message: 'Demande introuvable.' }
  if (!isContractRequestStatus(status)) return { ok: false, message: 'État inconnu.' }
  if (status === 'repondue' && answer.length < 3) return { ok: false, message: 'Écrivez la réponse envoyée au client.' }

  try {
    const db = createAdminClient()
    const { data: current } = await db.from('contract_requests').select('status, request_id, kind').eq('id', id).maybeSingle()
    if (!current) return { ok: false, message: 'Demande introuvable.' }
    if (!canTransition(current.status as string, status)) return { ok: false, message: `Passage « ${STATUS_INFO[status].label} » impossible depuis cet état.` }

    const updated = await updateContractRequest(db, id, { status, answer: status === 'repondue' ? answer : null, adminId: admin.userId })
    if (!updated) return { ok: false, message: 'Demande introuvable.' }
    const requestId = current.request_id as string
    const label = kindLabel(current.kind as string)
    await logAdminEvent(admin, {
      action: status === 'repondue' ? 'Réponse à une demande client' : status === 'close' ? 'Demande client close' : 'Demande client prise en charge',
      requestId, after: { demande: id, nature: current.kind, statut: status }, note: status === 'repondue' ? answer : null,
    })

    if (status === 'repondue') {
      // Le client du dossier (compte rattaché), sinon le premier contact de la société
      const { data: req } = await db.from('financing_requests').select('user_id, companies ( name )').eq('id', requestId).maybeSingle()
      const r = req as unknown as { user_id: string | null; companies: { name: string | null } | null } | null
      let email: string | null = null
      if (r?.user_id) {
        const { data: auth } = await db.auth.admin.getUserById(r.user_id)
        email = auth.user?.email ?? null
      }
      if (email) {
        await sendEmail(emailClientContractRequestAnswered({
          userEmail: email, companyName: r?.companies?.name ?? 'Votre société', requestRef: requestLabel({ id: requestId }), requestId, kindLabel: label, answer,
        })).catch(() => null)
      }
    }

    revalidatePath(`/admin/dossiers/${requestId}`)
    revalidatePath('/admin/demandes')
    revalidatePath(`/app/contrats/${requestId}`)
    return { ok: true, message: status === 'repondue' ? 'Réponse enregistrée, le client est prévenu.' : status === 'close' ? 'Demande close.' : 'Demande prise en charge.' }
  } catch (err) {
    console.error('[demandes contrat]', err)
    return { ok: false, message: 'Enregistrement impossible, réessayez.' }
  }
}
