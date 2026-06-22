import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import LandingPage from '@/components/landing/LandingPage'
import { createClient } from '@/lib/supabase/server'
import './landing.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Everlease — The new way of financing your equipment',
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <LandingPage className={jetbrainsMono.variable} userEmail={user?.email ?? null} />
}
