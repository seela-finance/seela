import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TopActions from '@/components/TopActions'
import SouscrireCard from './SouscrireCard'


type OfferRow = {
  id: string
  leaser_name: string
  monthly_payment: number
  duration_months: number
  selected: boolean
  status: string
  rate: number | null
  total_cost: number | null
  notes: string | null
}

type LeaserRow = {
  id: string
  name: string
  brand_color: string | null
  description: string | null
  referent_name: string | null
  delai_reponse_heures: number | null
  depot_garantie: number | null
  frais_dossier: number | null
  penalite_resiliation: string | null
  periodicite: string | null
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ requestId: string; offerId: string }>
}) {
  const { requestId, offerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // 1. Get request + all its offers
  const { data: request } = await supabase
    .from('financing_requests')
    .select('id, total_amount, duration_months, created_at, status, supplier_name, document_number, line_items(description, selected, quantity), offers(*)')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()

  if (!request) notFound()

  const offer: OfferRow | undefined = (request.offers ?? []).find((o: OfferRow) => o.id === offerId)
  if (!offer) notFound()

  const allOffers: OfferRow[] = request.offers ?? []
  const allOfferIds: string[] = allOffers.map(o => o.id)

  // 2. Fetch leaser metadata from DB
  const { data: leaserData } = await supabase
    .from('leasers')
    .select('id, name, brand_color, description, referent_name, delai_reponse_heures, depot_garantie, frais_dossier, penalite_resiliation, periodicite')
    .eq('name', offer.leaser_name)
    .maybeSingle()

  const leaser: LeaserRow | null = leaserData ?? null

  // 3. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, siren')
    .eq('id', user.id)
    .single()

  // Derived display values
  const leaserColor = leaser?.brand_color ?? '#9A9A93'
  const leaserInitials = initials(offer.leaser_name)
  const duration = offer.duration_months
  const monthly = offer.monthly_payment
  const totalCost = offer.total_cost ?? monthly * duration
  const rate = offer.rate

  // Recommended = cheapest monthly among all offers for this request
  const minMonthly = Math.min(...allOffers.map(o => o.monthly_payment))
  const isRecommended = monthly === minMonthly && allOffers.length > 1

  const reqRef = `C-${requestId.slice(0, 4).toUpperCase()}-${requestId.slice(4, 8).toUpperCase()}`
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 7)
  const validUntilStr = validUntil.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Advantages from notes field
  const advantages = offer.notes ? offer.notes.split(' · ') : []

  // Contract conditions built from leaser DB data
  const contractConditions = [
    { label: 'Type de contrat', value: 'Crédit-bail mobilier (location avec option d\'achat)' },
    { label: 'Option d\'achat finale', value: `1 € symbolique au mois ${duration}` },
    {
      label: 'Périodicité',
      value: leaser?.periodicite ?? 'Mensuelle, par prélèvement SEPA',
    },
    { label: 'Premier loyer', value: 'Offert (campagne mai–juin 2026)' },
    {
      label: 'Caution / dépôt',
      value: leaser?.depot_garantie ? fmt(leaser.depot_garantie) : 'Aucun',
    },
    {
      label: 'Frais de dossier',
      value: leaser?.frais_dossier ? fmt(leaser.frais_dossier) : 'Offerts',
    },
    {
      label: 'Pénalités de résiliation anticipée',
      value: leaser?.penalite_resiliation ?? 'Capital restant dû + 3%',
    },
    {
      label: 'Délai de disposition des fonds',
      value: `Dans les ${leaser?.delai_reponse_heures ?? 48}h après signature et réception du matériel`,
    },
  ]

  // Échéancier prévisionnel: first month offert (0€)
  const schedule: {
    n: number; date: string; loyer: number; tva: number; total: number; capitalRestant: number; offert: boolean
  }[] = []
  const startDate = new Date(request.created_at)
  const capitalTotal = request.total_amount ?? 0
  for (let i = 1; i <= Math.min(6, duration); i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i)
    const offert = i === 1
    const loyer = offert ? 0 : monthly
    const tva = offert ? 0 : Math.round(monthly * 0.2)
    const total = offert ? 0 : monthly + tva
    const capitalRestant = capitalTotal > 0 ? Math.round(capitalTotal * (1 - i / duration)) : 0
    schedule.push({ n: i, date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }), loyer, tva, total, capitalRestant, offert })
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="h-12 flex items-center px-6 border-b gap-2" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <Link href="/app/offres" className="text-sm transition-colors hover:text-[#0E0E0C]" style={{ color: '#9A9A93' }}>Offres</Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="#D1D1CE" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <Link href={`/app/offres/${requestId}`} className="text-sm transition-colors hover:text-[#0E0E0C]" style={{ color: '#9A9A93' }}>{reqRef}</Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="#D1D1CE" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-sm font-medium" style={{ color: '#0E0E0C' }}>{offer.leaser_name}</span>
        <TopActions />
      </div>

      <div className="px-8 py-8">
        {/* Back link */}
        <Link
          href={`/app/offres/${requestId}`}
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: '#9A9A93' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour aux offres
        </Link>

        <div className="flex gap-8 items-start">
          {/* LEFT COLUMN */}
          <div className="flex-1 min-w-0">
            {/* Leaser header */}
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
                style={{ background: leaserColor }}
              >
                {leaserInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold" style={{ fontSize: 22, color: '#0E0E0C', letterSpacing: '-0.4px' }}>
                    {offer.leaser_name}
                  </h1>
                  {isRecommended && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: '#EEF2FF', color: '#3730A3' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1l1.2 3.5H11L8 6.5l1 4-3-2-3 2 1-4-3-2h3.8L6 1Z" fill="#4F46E5" />
                      </svg>
                      Recommandée
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                  Offre {offer.leaser_name} · valable jusqu&apos;au {validUntilStr}
                </p>
              </div>
            </div>

            {leaser?.description && (
              <p className="text-sm mt-3 mb-4" style={{ color: '#9A9A93' }}>{leaser.description}</p>
            )}

            {/* 4 KPIs */}
            <div className="grid grid-cols-4 gap-3 mt-6 mb-8">
              {[
                { label: 'Mensualité', value: fmt(monthly) },
                { label: 'Durée', value: `${duration} mois` },
                { label: 'Taux contrat', value: rate != null ? `${rate.toFixed(2)} %` : '—' },
                { label: 'Coût total', value: fmt(totalCost) },
              ].map(kpi => (
                <div key={kpi.label} className="p-4 rounded-xl border" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                  <p className="text-xs mb-1" style={{ color: '#9A9A93' }}>{kpi.label}</p>
                  <p className="font-bold" style={{ fontSize: 22, color: '#0E0E0C', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Avantages */}
            {advantages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {advantages.map(adv => (
                  <span
                    key={adv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {adv}
                  </span>
                ))}
              </div>
            )}

            {/* Conditions du contrat */}
            <section className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: '#E5E5E3' }}>
              <div className="px-5 py-4 border-b" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>
                  Conditions du contrat
                </h2>
              </div>
              <table className="w-full">
                <tbody>
                  {contractConditions.map((row, i) => (
                    <tr
                      key={row.label}
                      className="border-b last:border-0"
                      style={{ borderColor: '#E5E5E3', background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}
                    >
                      <td className="px-5 py-3 text-sm w-2/5" style={{ color: '#9A9A93' }}>{row.label}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#0E0E0C' }}>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Échéancier prévisionnel */}
            <section className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>
                    Échéancier prévisionnel
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                    Aperçu des 6 premières échéances · les suivantes restent constantes
                  </p>
                </div>
                <span className="text-xs" style={{ color: '#9A9A93' }}>
                  {duration} échéances au total
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #E5E5E3' }}>
                    {['N°', 'Date', 'Loyer HT', 'TVA', 'Total', 'Capital restant'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#9A9A93' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, i) => (
                    <tr
                      key={row.n}
                      className="border-b last:border-0"
                      style={{ borderColor: '#E5E5E3', background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}
                    >
                      <td className="px-4 py-3 text-sm" style={{ color: '#9A9A93' }}>
                        {String(row.n).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#0E0E0C' }}>{row.date}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                        {row.offert ? '0 €' : fmt(row.loyer)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9A9A93', fontVariantNumeric: 'tabular-nums' }}>
                        {row.offert ? '0 €' : fmt(row.tva)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                        {row.offert ? (
                          <span style={{ color: '#16A34A' }}>0 € (offert)</span>
                        ) : fmt(row.total)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9A9A93', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(row.capitalRestant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          {/* RIGHT COLUMN — Souscrire */}
          <div className="shrink-0 w-72">
            <SouscrireCard
              offerId={offerId}
              requestId={requestId}
              allOfferIds={allOfferIds}
              initialStatus={offer.status}
              leaserName={offer.leaser_name}
              leaserDelai={leaser?.delai_reponse_heures ?? 48}
              companyName={profile?.company_name ?? ''}
              siren={profile?.siren ?? ''}
              userEmail={user.email ?? ''}
              referentName={leaser?.referent_name ?? ''}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
