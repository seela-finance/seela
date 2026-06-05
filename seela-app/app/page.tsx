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
  title: 'Seela — The new way of financing your equipment',
}

export default function Home() {
  return <LandingPage className={jetbrainsMono.variable} />
}
