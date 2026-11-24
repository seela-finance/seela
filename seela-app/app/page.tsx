import type { Metadata } from 'next'
import LandingPage from '@/components/landing/LandingPage'
import { JsonLd, faqSchema } from '@/lib/seo/jsonld'
import { HOME_FAQ } from '@/lib/seo/home'
import './landing.css'

export const metadata: Metadata = {
  title: 'Everlease — Payez vos équipements au rythme de votre activité',
  description:
    'Déposez un devis. Everlease prépare votre dossier de financement locatif et le présente aux financeurs adaptés à votre projet : banques et loueurs spécialisés. Location financière, crédit-bail, LLD, LOA, lease-back.',
}

// The nav (MarketingNav) fetches the session client-side, so the landing needs
// no server-side cookie read and can stay static.
export default function Home() {
  return (
    <>
      <JsonLd data={faqSchema(HOME_FAQ)} />
      <LandingPage />
    </>
  )
}
