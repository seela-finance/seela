import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return (
    <div className="flex min-h-screen" style={{ background: '#FAFAF9' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: 220 }}>
        {children}
      </main>
    </div>
  )
}
