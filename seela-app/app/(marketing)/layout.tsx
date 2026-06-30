import { JetBrains_Mono } from 'next/font/google'
import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import '../landing.css'

// Shared shell for the public marketing/SEO pages (Solutions, Secteurs).
// Reuses the landing's `.lp` design system; everything stays scoped under `.lp`.
// Kept free of server-side cookie reads so the pages prerender as static — the
// nav fetches the session client-side instead (better TTFB for SEO).
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
})

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lp ${jetbrainsMono.variable}`}>
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  )
}
