import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'
import { JsonLd, organizationSchema } from '@/lib/seo/jsonld'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Design system v2 : Bricolage Grotesque pour les titres, JetBrains Mono pour
// les montants et kickers. Consommées par `.lp` (app/landing.css) via
// --font-display et --font-mono ; globals.css (app authentifiée) reste sur Inter.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-bricolage',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Everlease — Financement locatif professionnel',
    template: `%s | ${SITE_NAME}`,
  },
  description: 'Financez votre équipement professionnel. Uploadez votre devis, configurez votre financement, recevez des offres sous 48h.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${bricolage.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationSchema()} />
        {children}
      </body>
    </html>
  )
}
