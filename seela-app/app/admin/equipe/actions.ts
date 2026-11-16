'use server'

import { revalidatePath } from 'next/cache'
import { logAdminEvent, requireAdmin } from '@/lib/admin'
import { ROLE_LABEL, can, isAdminRole } from '@/lib/admin-roles'
import { TeamError, addMember, changeRole, removeMember } from '@/lib/admin-team'
import { supabaseTeamStore } from '@/lib/admin-team-store'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/admin-request-detail'

export type TeamActionState = { ok: boolean; message: string } | null

const DENIED: TeamActionState = { ok: false, message: 'Votre rôle ne permet pas de gérer l’équipe.' }

// Droit `manage_team`, exécution, message ; la page Équipe est rafraîchie.
async function run(action: (admin: Awaited<ReturnType<typeof requireAdmin>>) => Promise<string>): Promise<TeamActionState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'manage_team')) return DENIED
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  try {
    return { ok: true, message: await action(admin) }
  } catch (err) {
    if (err instanceof TeamError) return { ok: false, message: err.message }
    console.error('[admin équipe]', err)
    return { ok: false, message: 'Écriture impossible, rien n’a été modifié. Réessayez.' }
  } finally {
    revalidatePath('/admin/equipe')
  }
}

export async function addMemberAction(_: TeamActionState, form: FormData): Promise<TeamActionState> {
  return run(async admin => {
    const member = await addMember(supabaseTeamStore(createAdminClient()), {
      email: form.get('email'), name: form.get('name'), role: form.get('role'),
    })
    await logAdminEvent(admin, { action: 'Membre ajouté à l’équipe', profileId: member.userId, after: { name: member.name, role: member.role, email: member.email } })
    return `${member.name} a rejoint l’équipe (${ROLE_LABEL[member.role].toLowerCase()}). Son accès est actif dès sa prochaine page.`
  })
}

export async function changeRoleAction(_: TeamActionState, form: FormData): Promise<TeamActionState> {
  return run(async admin => {
    const userId = String(form.get('userId') ?? '')
    if (!isUuid(userId)) throw new TeamError('Membre introuvable.')
    const role = form.get('role')
    const change = await changeRole(supabaseTeamStore(createAdminClient()), admin.userId, userId, role)
    await logAdminEvent(admin, { action: 'Rôle modifié', profileId: userId, before: { role: change.before }, after: { role: change.after } })
    return `Rôle modifié : ${isAdminRole(role) ? ROLE_LABEL[role].toLowerCase() : ''}.`
  })
}

export async function removeMemberAction(_: TeamActionState, form: FormData): Promise<TeamActionState> {
  return run(async admin => {
    const userId = String(form.get('userId') ?? '')
    if (!isUuid(userId)) throw new TeamError('Membre introuvable.')
    const member = await removeMember(supabaseTeamStore(createAdminClient()), admin.userId, userId)
    await logAdminEvent(admin, { action: 'Membre retiré de l’équipe', profileId: userId, before: { name: member.name, role: member.role } })
    return `${member.name} n’a plus accès au back-office. Son compte et son historique restent.`
  })
}
