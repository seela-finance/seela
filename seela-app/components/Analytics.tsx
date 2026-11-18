'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { identify, startAnalytics } from '@/lib/track'

// Monté dans le layout racine. Le back-office (/admin) n'est jamais mesuré.
export default function Analytics() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (!startAnalytics()) return
    // Compte connecté : l'entonnoir suit la même personne d'une page à l'autre
    createClient().auth.getUser().then(({ data: { user } }) => { if (user) identify(user.id) }).catch(() => {})
  }, [pathname])
  return null
}
