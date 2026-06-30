import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import LandingPage from '@/components/landing/LandingPage'
import './landing.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Everlease — The new way of financing your equipment',
}

// The nav (MarketingNav) fetches the session client-side, so the landing needs
// no server-side cookie read and can stay static.
export default function Home() {
  return <LandingPage className={jetbrainsMono.variable} />
}
