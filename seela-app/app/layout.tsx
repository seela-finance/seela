import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'
import { JsonLd, organizationSchema } from '@/lib/seo/jsonld'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationSchema()} />
        {children}
      </body>
    </html>
  )
}
