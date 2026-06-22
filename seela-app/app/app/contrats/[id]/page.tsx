import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import TopActions from '@/components/TopActions'
import CounterOfferActions from './CounterOfferActions'


const LEASERMETA: Record<string, { rate: number }> = {
  'BNP Lease':                    { rate: 4.85 },
  'Société Générale Équipement':  { rate: 5.10 },
  'Crédit Agricole Leasing':      { rate: 4.62 },
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtShort(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type LineItemRow = { id: string; description: string | null; quantity: number | null; unit_price: number | null; total_price: number | null; selected: boolean }
type OfferRow = { id: string; leaser_name: string; monthly_payment: number; duration_months: number; selected: boolean; status: string }

export default async function ContratPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: request } = await supabase
    .from('financing_requests')
    .select('*, line_items(*), offers(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!request) notFound()

  const selectedOffer: OfferRow | undefined = request.offers?.find((o: OfferRow) => o.selected)
  const counterOffer: OfferRow | undefined = request.offers?.find((o: OfferRow) => o.status === 'counter_offer')
  const allOfferIds: string[] = (request.offers ?? []).map((o: OfferRow) => o.id)
  const selectedLines: LineItemRow[] = request.line_items?.filter((l: LineItemRow) => l.selected) ?? []

  const firstItem = selectedLines[0]
  const assetTitle = firstItem
    ? firstItem.quantity && firstItem.quantity > 1
      ? `${firstItem.description} × ${firstItem.quantity}`
      : firstItem.description ?? 'Équipements'
    : 'Équipements'
  const assetSuffix = selectedLines.length > 1
    ? ` et ${selectedLines.length - 1} autre${selectedLines.length - 1 > 1 ? 's' : ''}`
    : ''

  const ref = `C-${id.slice(0, 4).toUpperCase()}-${id.slice(4, 8).toUpperCase()}`
  const leaserName = selectedOffer?.leaser_name ?? '—'
  const monthly = selectedOffer?.monthly_payment ?? null
  const duration = selectedOffer?.duration_months ?? request.duration_months ?? 36
  const startDate = new Date(request.created_at)

  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + duration)

  // Compute payments paid / total (simple: use created_at as start, today as reference)
  const today = new Date()
  const monthsElapsed = Math.max(0,
    (today.getFullYear() - startDate.getFullYear()) * 12 +
    (today.getMonth() - startDate.getMonth())
  )
  const paymentsDone = Math.min(monthsElapsed, duration)
  const paymentsLeft = duration - paymentsDone

  const capitalTotal = request.total_amount ?? 0
  const capitalRestant = monthly != null ? Math.max(0, capitalTotal - (paymentsDone / duration) * capitalTotal) : null

  // Next payment date
  const nextPayment = new Date(startDate)
  nextPayment.setMonth(startDate.getMonth() + paymentsDone + 1)

  // Generate upcoming payments (next 3)
  const upcoming: { n: number; date: string; montant: number | null }[] = []
  for (let i = 1; i <= Math.min(3, paymentsLeft); i++) {
    const d = new Date(startDate)
    d.setMonth(startDate.getMonth() + paymentsDone + i)
    upcoming.push({
      n: paymentsDone + i,
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      montant: monthly,
    })
  }

  // Generate recently paid (last 3 done before today, exclude month 1 offert)
  const recentlyPaid: { n: number; date: string; montant: number | null; ref: string }[] = []
  for (let i = Math.max(2, paymentsDone - 2); i <= paymentsDone; i++) {
    const d = new Date(startDate)
    d.setMonth(startDate.getMonth() + i)
    recentlyPaid.unshift({
      n: i,
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      montant: monthly,
      ref: `ref. ${today.getFullYear()}${String(i).padStart(4, '0')}${Math.floor(Math.random() * 100)}`,
    })
  }

  const rate = LEASERMETA[leaserName]?.rate ?? 4.85
  const totalCost = monthly != null ? monthly * duration : null

  const sepaIban = '•••• 6742'

  return (
    <div className="flex min-h-screen" style={{ background: '#FAFAF9' }}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto" style={{ marginLeft: 220 }}>
        {/* Breadcrumb */}
        <div className="h-12 flex items-center px-6 border-b gap-2" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
          <Link href="/app/contrats" className="text-sm transition-colors hover:text-[#0E0E0C]" style={{ color: '#9A9A93' }}>
            Contrats
          </Link>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="#D1D1CE" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-sm font-medium" style={{ color: '#0E0E0C' }}>{ref}</span>
          <TopActions />
        </div>

        <div className="px-8 py-8">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-1">
            <Link href="/app/contrats" className="flex items-center transition-opacity hover:opacity-70" style={{ color: '#9A9A93' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <span className="text-sm font-medium" style={{ color: '#9A9A93' }}>{ref}</span>
            {request.status === 'leaser_confirmed' ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: '#FFF7ED', color: '#92400E' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D97706' }} />
                En attente de démarrage
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: '#F0FDF4', color: '#166534' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }} />
                Actif
              </span>
            )}
            <div className="flex-1" />
            {request.document_url && (
              <a
                href={request.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: '#fff', color: '#0E0E0C', borderColor: '#E5E5E3', borderRadius: 8 }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1v7M4 5.5l2.5 2.5 2.5-2.5M1 11h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Contrat PDF
              </a>
            )}
            {selectedOffer && (
              <a
                href={`mailto:leasing@${leaserName.toLowerCase().replace(/\s+/g, '')}.fr`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: '#fff', color: '#0E0E0C', borderColor: '#E5E5E3', borderRadius: 8 }}
              >
                Contacter le leaser
              </a>
            )}
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center border transition-opacity hover:opacity-70"
              style={{ background: '#fff', borderColor: '#E5E5E3', color: '#9A9A93' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1.05 1.05M10.05 10.05l1.05 1.05M2.9 11.1l1.05-1.05M10.05 3.95l1.05-1.05" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <h1 className="font-semibold mt-3 mb-0.5" style={{ fontSize: 26, color: '#0E0E0C', letterSpacing: '-0.5px' }}>
            {assetTitle}{assetSuffix}
          </h1>
          <p className="text-sm mb-6" style={{ color: '#9A9A93' }}>
            Financé par <strong style={{ color: '#0E0E0C' }}>{leaserName}</strong>
            {' · '}Crédit-bail mobilier · Option d&apos;achat 1 €
          </p>

          {/* Counter-offer */}
          {counterOffer && (
            <section className="p-5 rounded-xl border mb-6" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
              <div className="flex items-start gap-3 mb-5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                  <path d="M8 1l7 13H1L8 1Z" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M8 6v4M8 12h.01" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
                    Le leaser a proposé des conditions modifiées
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                    Examinez les nouveaux termes et acceptez ou refusez avant de continuer.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div className="p-3.5 rounded-xl border" style={{ background: '#fff', borderColor: '#FED7AA' }}>
                  <p className="text-xs mb-1" style={{ color: '#9A9A93' }}>Nouvelle mensualité</p>
                  <p className="font-semibold text-sm" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(counterOffer.monthly_payment)}
                    <span className="font-normal text-xs ml-1" style={{ color: '#9A9A93' }}>HT</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border" style={{ background: '#fff', borderColor: '#FED7AA' }}>
                  <p className="text-xs mb-1" style={{ color: '#9A9A93' }}>Durée proposée</p>
                  <p className="font-semibold text-sm" style={{ color: '#0E0E0C' }}>{counterOffer.duration_months} mois</p>
                </div>
              </div>
              <CounterOfferActions offerId={counterOffer.id} requestId={id} allOfferIds={allOfferIds} />
            </section>
          )}

          {/* 5 KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {[
              { label: 'Mensualité', value: fmt(monthly), sub: '/mois' },
              { label: 'Échéances', value: `${paymentsDone} / ${duration}`, sub: `${paymentsLeft} restantes` },
              { label: 'Capital restant', value: fmt(capitalRestant), sub: `sur ${fmt(capitalTotal)}` },
              { label: 'Prochaine échéance', value: fmtShort(nextPayment.toISOString()), sub: '' },
              { label: 'Fin du contrat', value: fmtShort(endDate.toISOString()), sub: '' },
            ].map((kpi) => (
              <div key={kpi.label} className="p-4 rounded-xl border" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                <p className="text-xs mb-1.5" style={{ color: '#9A9A93' }}>{kpi.label}</p>
                <p className="font-semibold text-sm leading-tight" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                  {kpi.value}
                </p>
                {kpi.sub && <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>{kpi.sub}</p>}
              </div>
            ))}
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6 items-start">
            {/* LEFT — Échéancier */}
            <div className="flex-1 min-w-0">
              <section className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3' }}>
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: '#0E0E0C' }}>Échéancier</h2>
                    <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                      Prélèvement SEPA le {startDate.getDate()} de chaque mois
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#0E0E0C', color: '#fff', borderRadius: 6 }}>Liste</button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ background: '#fff', color: '#9A9A93', borderColor: '#E5E5E3', borderRadius: 6 }}>Calendrier</button>
                  </div>
                </div>

                {/* À VENIR */}
                <div className="px-5 py-3 border-b" style={{ borderColor: '#E5E5E3', background: '#FAFAF9' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>À venir</span>
                </div>
                {upcoming.length > 0 ? (
                  <div>
                    {upcoming.map((payment, i) => (
                      <div
                        key={payment.n}
                        className="px-5 py-3.5 flex items-center gap-4 border-b"
                        style={{ borderColor: '#E5E5E3', background: '#fff' }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                          style={{ background: '#EEF2FF', color: '#3730A3' }}
                        >
                          #{payment.n}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm" style={{ color: '#0E0E0C' }}>{payment.date}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                            Prélèvement SEPA · IBAN •••• {sepaIban}
                          </p>
                        </div>
                        <p className="font-medium text-sm" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(payment.montant)}
                        </p>
                        <span
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: '#F5F5F4', color: '#9A9A93' }}
                        >
                          À venir
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <p className="text-sm" style={{ color: '#9A9A93' }}>Aucune échéance à venir.</p>
                  </div>
                )}

                {/* PAYÉES RÉCEMMENT */}
                {recentlyPaid.length > 0 && (
                  <>
                    <div className="px-5 py-3 border-t border-b" style={{ borderColor: '#E5E5E3', background: '#FAFAF9' }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>Payées récemment</span>
                    </div>
                    {recentlyPaid.map((payment) => (
                      <div
                        key={payment.n}
                        className="px-5 py-3.5 flex items-center gap-4 border-b"
                        style={{ borderColor: '#E5E5E3', background: '#fff' }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                          style={{ background: '#F0FDF4', color: '#166534' }}
                        >
                          #{payment.n}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm" style={{ color: '#0E0E0C' }}>{payment.date}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                            Prélèvement effectué · {payment.ref}
                          </p>
                        </div>
                        <p className="font-medium text-sm" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(payment.montant)}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                          style={{ background: '#F0FDF4', color: '#166534' }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ background: '#16A34A' }} />
                          Payé
                        </span>
                      </div>
                    ))}
                  </>
                )}

                <div className="px-5 py-3.5 flex justify-center border-t" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
                  <button className="text-sm transition-opacity hover:opacity-70" style={{ color: '#4F46E5' }}>
                    Voir les {duration} échéances
                  </button>
                </div>
              </section>
            </div>

            {/* RIGHT — Documents, Détails, Actions */}
            <div className="shrink-0 w-72 space-y-4">

              {/* Documents */}
              <section className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3' }}>
                <div className="px-4 py-3.5 border-b" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>Documents</h2>
                </div>
                <div className="divide-y" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                  {request.document_url ? (
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 1h6l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="#4F46E5" strokeWidth="1.2" />
                          <path d="M9 1v3h3" stroke="#4F46E5" strokeWidth="1.2" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate capitalize" style={{ color: '#0E0E0C' }}>
                          {request.document_type ?? 'Document'} original
                        </p>
                        <p className="text-xs" style={{ color: '#9A9A93' }}>
                          {fmtShort(request.created_at)}
                        </p>
                      </div>
                      <a
                        href={request.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 transition-opacity hover:opacity-70"
                        style={{ color: '#9A9A93' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M6.5 1v7M4 5.5l2.5 2.5 2.5-2.5M1 11h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    </div>
                  ) : null}
                  {/* Contrat de location — placeholder */}
                  <div className="px-4 py-3 flex items-center gap-3 opacity-40">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F5F5F4' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 1h6l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="#9A9A93" strokeWidth="1.2" />
                        <path d="M9 1v3h3" stroke="#9A9A93" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: '#0E0E0C' }}>Contrat de location</p>
                      <p className="text-xs" style={{ color: '#9A9A93' }}>À venir</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Détails du contrat */}
              <section className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3' }}>
                <div className="px-4 py-3.5 border-b" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>Détails du contrat</h2>
                </div>
                <div className="divide-y" style={{ background: '#fff' }}>
                  {[
                    { label: 'Type', value: 'Crédit-bail mobilier' },
                    { label: "Option d'achat finale", value: '1 €' },
                    { label: 'Taux nominal', value: `${rate.toFixed(2)} %` },
                    { label: 'Coût total', value: fmt(totalCost) },
                    { label: 'Fournisseur', value: firstItem?.description?.split(' ')[0] ?? '—' },
                    { label: 'Référent leaser', value: '—' },
                  ].map(row => (
                    <div key={row.label} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#9A9A93' }}>{row.label}</span>
                      <span className="text-xs font-medium" style={{ color: '#0E0E0C' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Actions */}
              <section className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3' }}>
                <div className="px-4 py-3.5 border-b" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>Actions</h2>
                </div>
                <div className="divide-y" style={{ background: '#fff' }}>
                  {[
                    {
                      label: 'Contacter Everlease',
                      href: 'mailto:contact@everlease.fr',
                      icon: (
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M1 4l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      ),
                    },
                    {
                      label: "Demander un report d'échéance",
                      href: `mailto:contact@everlease.fr?subject=Report%20d%27%C3%A9ch%C3%A9ance%20${ref}`,
                      icon: (
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      ),
                    },
                    {
                      label: 'Demander une résiliation anticipée',
                      href: `mailto:contact@everlease.fr?subject=R%C3%A9siliation%20anticip%C3%A9e%20${ref}`,
                      icon: (
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      ),
                      danger: true,
                    },
                  ].map(action => (
                    <a
                      key={action.label}
                      href={action.href}
                      className="px-4 py-3 flex items-center gap-2.5 text-sm transition-colors hover:bg-[#FAFAF9]"
                      style={{ color: action.danger ? '#DC2626' : '#0E0E0C' }}
                    >
                      <span style={{ color: action.danger ? '#DC2626' : '#9A9A93' }}>{action.icon}</span>
                      {action.label}
                    </a>
                  ))}
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
