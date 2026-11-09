import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RequestsTable from '@/components/RequestsTable'
import { REQUESTS_TABLE_HEADERS } from '@/components/requests-table-headers'
import TopActions from '@/components/TopActions'
import { RS } from '@/lib/status'

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: requests }, { data: profile }] = await Promise.all([
    supabase
      .from('financing_requests')
      .select('*, supplier_name, document_number, offers(monthly_payment, selected, leaser_name, duration_months), line_items(description, selected, quantity)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('first_name, onboarding_completed, financial_docs_uploaded')
      .eq('id', user.id)
      .single(),
  ])

  const allRequests = requests ?? []
  const firstName = (profile?.first_name as string | null | undefined)?.trim() || null
  const showProfileBanner = profile?.onboarding_completed === true && !profile?.financial_docs_uploaded

  const activeRequests = allRequests.filter(r => r.status === RS.active)
  const totalEncours = activeRequests.reduce((s: number, r: { total_amount: number | null }) => s + (r.total_amount ?? 0), 0)
  const totalMonthly = activeRequests.reduce((s: number, r: { offers?: { monthly_payment: number; selected: boolean }[] }) => {
    const sel = r.offers?.find((o: { selected: boolean }) => o.selected)
    return s + (sel?.monthly_payment ?? 0)
  }, 0)

  // Dossiers en cours = ni brouillon, ni contrat actif, ni dossier clos
  const inProgress = allRequests.filter(r => r.status !== RS.draft && r.status !== RS.active && r.status !== RS.refused)

  const greeting = firstName ? `Bonjour ${firstName}` : 'Bonjour'

  return (
    <div>
      {/* Top nav */}
      <div className="h-12 flex items-center px-4 sm:px-6 border-b whitespace-nowrap overflow-hidden shrink-0" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Tableau de bord</span>
        <TopActions />
      </div>

      {showProfileBanner && (
        <div
          className="flex items-center justify-between px-6 py-3 bg-surface border-b border-line"
        >
          <p className="text-sm" style={{ color: 'var(--ink)' }}>
            <span className="font-medium">
              Complétez votre dossier
            </span>
            {' '}· Ajoutez vos bilans pour que votre conseiller le présente aux financeurs
          </p>
          <a
            href="/app/onboarding"
            className="ev-btn ev-btn--sm ev-btn--primary shrink-0 ml-4"
          >
            Compléter mon profil
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}

      <div className="px-4 sm:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="ev-display mb-0.5" style={{ fontSize: 24, color: 'var(--ink)' }}>
              {greeting}
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              Voici l&apos;état de vos financements
            </p>
          </div>
          <Link
            href="/app/nouveau"
            className="ev-btn ev-btn--primary"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Nouveau financement
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="ev-card p-5">
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--ink-3)' }}>Encours total</p>
            <p className="ev-mono mb-1" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>
              {fmt(totalEncours)}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              {activeRequests.length} contrat{activeRequests.length !== 1 ? 's' : ''} actif{activeRequests.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="ev-card p-5">
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--ink-3)' }}>Loyers du mois</p>
            <p className="ev-mono mb-1" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>
              {fmt(totalMonthly)}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Mensualité totale</p>
          </div>

          <div className="ev-card p-5">
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--ink-3)' }}>Dossiers en cours</p>
            <p className="ev-mono mb-1" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>
              {inProgress.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>En étude ou en attente de démarrage</p>
          </div>
        </div>

        {/* Table */}
        {allRequests.length === 0 ? (
          <div className="ev-card ev-card--dashed text-center py-16">
            <p className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>
              Aucune demande de financement pour l&apos;instant.
            </p>
            <Link
              href="/app/nouveau"
              className="ev-btn ev-btn--primary"
            >
              Créer ma première demande
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Mes financements</h2>
              <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {allRequests.length} dossier{allRequests.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="ev-card overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
                    {REQUESTS_TABLE_HEADERS.map((h, i) => (
                      <th
                        key={i}
                        className="ev-kicker px-4 py-3 text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <RequestsTable requests={allRequests} />
              </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
