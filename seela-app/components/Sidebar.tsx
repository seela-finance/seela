import { createClient } from '@/lib/supabase/server'
import SidebarClient from './SidebarClient'
import { requestStatusesIn } from '@/lib/status'
import { loadAccount } from '@/lib/account'

export default async function Sidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [account, { count: offresCount }, { count: contratsCount }] = await Promise.all([
    loadAccount(supabase, user.id),
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
      companyName={account?.company?.name ?? ''}
      offresCount={offresCount ?? 0}
      contratsCount={contratsCount ?? 0}
    />
  )
}
