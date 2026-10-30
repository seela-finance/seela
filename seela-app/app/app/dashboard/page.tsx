import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RequestsTable, { REQUESTS_TABLE_HEADERS } from '@/components/RequestsTable'
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
      .select('first_name, onboarding_completed, financial_docs_uploaded, seela_score_grade')
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
      <div className="h-12 flex items-center px-6 border-b shrink-0" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <span className="text-sm font-medium" style={{ color: '#0E0E0C' }}>Tableau de bord</span>
        <TopActions />
      </div>

      {showProfileBanner && (
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ background: '#F5F5F4', borderLeft: '3px solid #4F46E5', borderBottom: '1px solid #E5E5E3' }}
        >
          <p className="text-sm" style={{ color: '#0E0E0C' }}>
            <span className="font-medium">
              Score Everlease{profile?.seela_score_grade ? ` : ${profile.seela_score_grade}` : ''}
            </span>
            {' '}· Uploadez vos bilans pour accéder à plus d&apos;offres
          </p>
          <a
            href="/app/onboarding"
            className="shrink-0 ml-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: '#4F46E5', color: '#fff', borderRadius: 8 }}
          >
            Compléter mon profil
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}

      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-semibold mb-0.5" style={{ fontSize: 24, color: '#0E0E0C', letterSpacing: '-0.4px' }}>
              {greeting}
            </h1>
            <p className="text-sm" style={{ color: '#9A9A93' }}>
              Voici l&apos;état de vos financements
            </p>
          </div>
          <Link
            href="/app/nouveau"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#4F46E5', color: '#fff', borderRadius: 8 }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Nouveau financement
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-xl border" style={{ background: '#fff', borderColor: '#E5E5E3', borderRadius: 12 }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#9A9A93', letterSpacing: '0.02em' }}>Encours total</p>
            <p className="font-semibold mb-1" style={{ fontSize: 28, color: '#0E0E0C', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {fmt(totalEncours)}
            </p>
            <p className="text-xs" style={{ color: '#9A9A93' }}>
              {activeRequests.length} contrat{activeRequests.length !== 1 ? 's' : ''} actif{activeRequests.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="p-5 rounded-xl border" style={{ background: '#fff', borderColor: '#E5E5E3', borderRadius: 12 }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#9A9A93', letterSpacing: '0.02em' }}>Loyers du mois</p>
            <p className="font-semibold mb-1" style={{ fontSize: 28, color: '#0E0E0C', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {fmt(totalMonthly)}
            </p>
            <p className="text-xs" style={{ color: '#9A9A93' }}>Mensualité totale</p>
          </div>

          <div className="p-5 rounded-xl border" style={{ background: '#fff', borderColor: '#E5E5E3', borderRadius: 12 }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#9A9A93', letterSpacing: '0.02em' }}>Dossiers en cours</p>
            <p className="font-semibold mb-1" style={{ fontSize: 28, color: '#0E0E0C', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {inProgress.length}
            </p>
            <p className="text-xs" style={{ color: '#9A9A93' }}>En étude ou en attente de démarrage</p>
          </div>
        </div>

        {/* Table */}
        {allRequests.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border border-dashed"
            style={{ borderColor: '#E5E5E3' }}
          >
            <p className="text-sm mb-4" style={{ color: '#9A9A93' }}>
              Aucune demande de financement pour l&apos;instant.
            </p>
            <Link
              href="/app/nouveau"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#0E0E0C', color: '#FAFAF9', borderRadius: 8 }}
            >
              Créer ma première demande
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm" style={{ color: '#0E0E0C' }}>Mes financements</h2>
              <span className="text-xs" style={{ color: '#9A9A93' }}>
                {allRequests.length} dossier{allRequests.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3', borderRadius: 12 }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #E5E5E3' }}>
                    {REQUESTS_TABLE_HEADERS.map((h, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left"
                        style={{ fontSize: 11, fontWeight: 500, color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.06em' }}
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
        )}
      </div>
    </div>
  )
}
