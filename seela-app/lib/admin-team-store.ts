import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminRole } from '@/lib/admin-roles'
import type { TeamMember, TeamStore } from '@/lib/admin-team'

type AdminRow = { user_id: string; name: string; role: string; created_at: string }

async function emailOf(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await db.auth.admin.getUserById(userId)
  return data.user?.email ?? null
}

const toMember = (row: AdminRow, email: string | null): TeamMember => ({
  userId: row.user_id,
  name: row.name,
  role: isAdminRole(row.role) ? row.role : 'commercial',
  email,
  createdAt: row.created_at,
})

/** Membres de l'équipe, admins d'abord. Les emails viennent de l'authentification (service role). */
export async function listMembers(db: SupabaseClient): Promise<TeamMember[]> {
  const { data, error } = await db.from('admins').select('user_id, name, role, created_at').order('created_at')
  if (error) throw new Error(`Équipe : lecture impossible (${error.message})`)
  const rows = (data ?? []) as AdminRow[]
  const members = await Promise.all(rows.map(async r => toMember(r, await emailOf(db, r.user_id))))
  return members.sort((a, b) => Number(b.role === 'admin') - Number(a.role === 'admin'))
}

/** Écritures en service role : l'appelant (Server Action) a vérifié le droit `manage_team`. */
export function supabaseTeamStore(db: SupabaseClient): TeamStore {
  return {
    async findAccount(email) {
      // Le profil porte l'email du compte (écrit à l'inscription) ; l'authentification dit s'il est confirmé
      // ilike sans jokers : `_` et `%` de l'adresse sont échappés (égalité insensible à la casse)
      const exact = email.replace(/[\\%_]/g, c => `\\${c}`)
      const { data: profile, error } = await db.from('profiles').select('id').ilike('email', exact).limit(2)
      if (error) throw new Error(`Comptes : lecture impossible (${error.message})`)
      if (!profile?.length) return null
      if (profile.length > 1) throw new Error('Plusieurs comptes pour cet email')
      const { data } = await db.auth.admin.getUserById(profile[0].id)
      const user = data.user
      if (!user?.email || user.email.toLowerCase() !== email) return null
      return { userId: user.id, email: user.email, confirmed: !!user.email_confirmed_at }
    },

    async loadMember(userId) {
      const { data, error } = await db.from('admins').select('user_id, name, role, created_at').eq('user_id', userId).maybeSingle()
      if (error) throw new Error(`Équipe : lecture impossible (${error.message})`)
      return data ? toMember(data as AdminRow, null) : null
    },

    async countAdmins() {
      const { count, error } = await db.from('admins').select('user_id', { count: 'exact', head: true }).eq('role', 'admin')
      if (error) throw new Error(`Équipe : lecture impossible (${error.message})`)
      return count ?? 0
    },

    async insertMember(userId, name, role) {
      const { error } = await db.from('admins').insert({ user_id: userId, name, role })
      if (error) throw new Error(`Équipe : ajout impossible (${error.message})`)
    },

    async updateRole(userId, role) {
      const { error } = await db.from('admins').update({ role }).eq('user_id', userId)
      if (error) throw new Error(`Équipe : écriture impossible (${error.message})`)
    },

    async deleteMember(userId) {
      const { error } = await db.from('admins').delete().eq('user_id', userId)
      if (error) throw new Error(`Équipe : retrait impossible (${error.message})`)
    },
  }
}
