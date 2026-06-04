import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function NouveauLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return (
    <div className="flex min-h-screen" style={{ background: '#FAFAF9' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: 220 }}>
        {children}
      </div>
    </div>
  )
}
