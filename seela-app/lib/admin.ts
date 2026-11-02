import 'server-only'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminEventRow, type AdminEvent } from '@/lib/admin-events'

export type Admin = { userId: string; name: string; email: string }

// Back-office réservé à l'équipe. Non admin → 404 (un 403 révélerait l'existence de la page).
// La RLS de `admins` ne laisse lire que sa propre ligne : un client n'y trouve rien.
// En cas d'erreur (table absente, réseau), on refuse aussi.
export const requireAdmin = cache(async (): Promise<Admin> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data, error } = await supabase.from('admins').select('name').eq('user_id', user.id).maybeSingle()
  if (error || !data) notFound()

  return { userId: user.id, name: data.name, email: user.email ?? '' }
})

// À appeler dans chaque Server Action admin, après requireAdmin(), pour toute écriture.
// Service role : admin_events n'est accessible à aucun compte.
export async function logAdminEvent(admin: Admin, event: AdminEvent): Promise<void> {
  const { error } = await createAdminClient().from('admin_events').insert(adminEventRow(admin.userId, event))
  if (error) throw new Error(`Journal admin : ${error.message}`)
}
