import Link from 'next/link'
import Logo from '@/components/Logo'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF9' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: '#FAFAF9', borderColor: '#E5E5E2' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-6">
            <Link href="/auth" style={{ color: '#9A9A93', fontSize: 14 }} className="hover:text-[#1A1A18] transition-colors">
              Se connecter
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: '#1A1A18', color: '#FAFAF9' }}
            >
              Démarrer un financement
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-28">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-8" style={{ color: '#9A9A93' }}>
            Financement locatif professionnel
          </p>
          <h1
            className="font-semibold tracking-tight mb-6"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 3.8rem)', color: '#1A1A18', lineHeight: 1.1, letterSpacing: '-1.5px' }}
          >
            Financez votre équipement<br />professionnel en quelques clics.
          </h1>
          <p className="text-base mb-10 mx-auto max-w-xl" style={{ color: '#9A9A93', lineHeight: 1.75 }}>
            Uploadez votre devis. Notre IA extrait les équipements automatiquement.
            Configurez la durée et recevez des offres de nos partenaires leasers sous 48h.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium text-base transition-opacity hover:opacity-90"
            style={{ background: '#1A1A18', color: '#FAFAF9' }}
          >
            Démarrer un financement
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="mt-5 text-sm" style={{ color: '#9A9A93' }}>
            Réponse sous 48h ouvrées · Sans engagement · 100% en ligne
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-t" style={{ borderColor: '#E5E5E2' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold tracking-widest uppercase mb-16" style={{ color: '#9A9A93' }}>
            Comment ça marche
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                n: '01',
                title: 'Uploadez votre document',
                desc: "Déposez votre devis ou facture. Notre IA analyse le document et extrait automatiquement toutes les lignes d'équipements.",
              },
              {
                n: '02',
                title: 'Configurez le financement',
                desc: 'Sélectionnez les équipements à financer. Choisissez la durée et visualisez votre loyer mensuel en temps réel.',
              },
              {
                n: '03',
                title: 'Recevez vos offres',
                desc: 'Comparez les propositions indicatives de nos partenaires leasers et choisissez celle qui vous convient.',
              },
            ].map((step) => (
              <div key={step.n}>
                <span className="text-xs font-semibold tracking-widest" style={{ color: '#9A9A93' }}>{step.n}</span>
                <h3 className="mt-3 mb-3 font-semibold text-lg" style={{ color: '#1A1A18', letterSpacing: '-0.3px' }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#9A9A93' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20" style={{ background: '#F0F0EE' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold tracking-widest uppercase mb-16" style={{ color: '#9A9A93' }}>
            Pourquoi Seela
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Rapide',
                desc: "Analyse IA en quelques secondes. Offres indicatives immédiates, confirmation sous 48h ouvrées.",
              },
              {
                title: 'Transparent',
                desc: "Comparez les offres de BNP Lease, Société Générale Équipement et Crédit Agricole côte à côte.",
              },
              {
                title: 'Accompagné',
                desc: "Un conseiller Seela dédié valide votre dossier et vous accompagne jusqu'à la signature.",
              },
            ].map((f) => (
              <div key={f.title} className="p-8 rounded-2xl" style={{ background: '#FAFAF9' }}>
                <h3 className="font-semibold mb-2 text-base" style={{ color: '#1A1A18' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#9A9A93' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-24">
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="font-semibold mb-4 tracking-tight"
            style={{ fontSize: '2rem', color: '#1A1A18', letterSpacing: '-0.5px' }}
          >
            Prêt à financer votre équipement ?
          </h2>
          <p className="mb-8 text-base" style={{ color: '#9A9A93' }}>
            Rejoignez les entreprises qui financent leur croissance avec Seela.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium hover:opacity-90 transition-opacity"
            style={{ background: '#1A1A18', color: '#FAFAF9' }}
          >
            Démarrer maintenant
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8" style={{ borderColor: '#E5E5E2' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm" style={{ color: '#9A9A93' }}>
            © {new Date().getFullYear()} Seela. Tous droits réservés.
          </p>
        </div>
      </footer>

    </div>
  )
}
