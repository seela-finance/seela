import { createClient } from '@/lib/supabase/server'
import SidebarClient from './SidebarClient'
import { requestStatusesIn } from '@/lib/status'

export default async function Sidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { count: offresCount }, { count: contratsCount }] = await Promise.all([
    supabase.from('profiles').select('company_name').eq('id', user.id).single(),
    supabase
      .from('financing_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', requestStatusesIn('offres')),
    supabase
      .from('financing_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', requestStatusesIn('contrats')),
  ])

  return (
    <SidebarClient
      email={user.email ?? ''}
      companyName={profile?.company_name ?? ''}
      offresCount={offresCount ?? 0}
      contratsCount={contratsCount ?? 0}
    />
  )
}
