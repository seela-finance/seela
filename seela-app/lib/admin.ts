import 'server-only'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminEventRow, type AdminEvent } from '@/lib/admin-events'
import { can, isAdminRole, type AdminRole, type Capability } from '@/lib/admin-roles'

export type Admin = { userId: string; name: string; email: string; role: AdminRole }

// Back-office réservé à l'équipe. Non membre → 404 (un 403 révélerait l'existence de la page).
// La RLS de `admins` ne laisse lire que sa propre ligne : un client n'y trouve rien.
// En cas d'erreur (table absente, réseau), on refuse aussi.
export const requireAdmin = cache(async (): Promise<Admin> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // `*` plutôt que `role` : le code reste valable avant comme après la migration des rôles
  const { data, error } = await supabase.from('admins').select('*').eq('user_id', user.id).maybeSingle()
  if (error || !data) notFound()

  // Sans colonne `role` (avant migration), les membres existants sont admins ; une valeur inconnue → commercial
  const role: AdminRole = data.role == null ? 'admin' : isAdminRole(data.role) ? data.role : 'commercial'
  return { userId: user.id, name: data.name, email: user.email ?? '', role }
})

/** Page réservée à un droit : un membre sans ce droit reçoit un 404, comme un inconnu. */
export async function requireCapability(capability: Capability): Promise<Admin> {
  const admin = await requireAdmin()
  if (!can(admin.role, capability)) notFound()
  return admin
}

// À appeler dans chaque Server Action admin, après requireAdmin(), pour toute écriture.
// Service role : admin_events n'est accessible à aucun compte.
export async function logAdminEvent(admin: Admin, event: AdminEvent): Promise<void> {
  const { error } = await createAdminClient().from('admin_events').insert(adminEventRow(admin.userId, event))
  if (error) throw new Error(`Journal admin : ${error.message}`)
}
