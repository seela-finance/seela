'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function DashboardNav({ companyName }: { companyName: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b" style={{ background: '#FAFAF9', borderColor: '#E5E5E2' }}>
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard"><Logo size="sm" /></Link>
        <div className="flex items-center gap-6">
          <span className="text-sm" style={{ color: '#9A9A93' }}>{companyName}</span>
          <button
            onClick={signOut}
            className="text-sm transition-colors hover:text-[#1A1A18]"
            style={{ color: '#9A9A93' }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </header>
  )
}
