import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TopActions from '@/components/TopActions'
import SouscrireCard from './SouscrireCard'
import { formatRate, leaserInitials, recommendedOffer } from '@/lib/offers'
import { RS, requestDestination, requestStatusInfo } from '@/lib/status'
import { requestLabel } from '@/lib/request-label'


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
    .select('id, total_amount, duration_months, created_at, status, document_type, periodicite, supplier_name, document_number, line_items(description, selected, quantity), offers(*)')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()

  if (!request) notFound()

  // Brouillon → flow ; dossier en phase contrat → fiche contrat
  const section = requestStatusInfo(request.status).section
  if (section === 'draft' || section === 'contrats') redirect(requestDestination(requestId, request.status))

  const offer: OfferRow | undefined = (request.offers ?? []).find((o: OfferRow) => o.id === offerId)
  if (!offer) notFound()

  const allOffers: OfferRow[] = request.offers ?? []

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
  const leaserColor = leaser?.brand_color ?? 'var(--ink-3)'
  const initials = leaserInitials(offer.leaser_name)
  const duration = offer.duration_months
  const monthly = offer.monthly_payment
  const totalCost = offer.total_cost ?? monthly * duration
  const rate = offer.rate

  // Même règle que la liste des offres (lib/offers.ts)
  const isRecommended = recommendedOffer(allOffers)?.id === offer.id

  const reqRef = requestLabel(request)

  // Advantages from notes field
  const advantages = offer.notes ? offer.notes.split(' · ') : []

  // Conditions : uniquement ce que l'on sait (dossier et fiche leaser), rien d'inventé (#25)
  const isLeaseBack = request.document_type === 'facture'
  const periodicite = request.periodicite ?? 'mensuelle'
  const contractConditions = [
    {
      label: 'Type de financement',
      value: isLeaseBack
        ? 'Lease-back (refinancement de matériel déjà acheté)'
        : 'Location financière / crédit-bail',
    },
    { label: 'Périodicité des loyers', value: periodicite.charAt(0).toUpperCase() + periodicite.slice(1) },
    { label: 'Dépôt de garantie', value: leaser?.depot_garantie ? fmt(leaser.depot_garantie) : 'Aucun' },
    { label: 'Frais de dossier', value: leaser?.frais_dossier ? fmt(leaser.frais_dossier) : 'Aucun' },
    { label: 'Résiliation anticipée', value: leaser?.penalite_resiliation ?? 'Selon le contrat du financeur' },
    { label: 'Assurance et services', value: 'Non inclus dans le loyer' },
  ]

  // Simulation indicative : loyer constant, mois relatifs (pas de date tant que le contrat n'a pas démarré)
  const schedule = Array.from({ length: Math.min(6, duration) }, (_, i) => {
    const tva = Math.round(monthly * 0.2 * 100) / 100
    return { n: i + 1, loyer: monthly, tva, total: monthly + tva }
  })

  return (
    <div>
      {/* Breadcrumb */}
      <div className="h-12 flex items-center px-6 border-b gap-2" style={{ borderColor: 'var(--line)', background: '#fff' }}>
        <Link href="/app/offres" className="text-sm transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-3)' }}>Offres</Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--line-strong)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <Link href={`/app/offres/${requestId}`} className="ev-mono text-sm transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-3)' }}>{reqRef}</Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--line-strong)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{offer.leaser_name}</span>
        <TopActions />
      </div>

      <div className="px-8 py-8">
        {/* Back link */}
        <Link
          href={`/app/offres/${requestId}`}
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: 'var(--ink-3)' }}
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
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                style={{ background: leaserColor }}
              >
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="ev-display" style={{ fontSize: 22, color: 'var(--ink)' }}>
                    {offer.leaser_name}
                  </h1>
                  {isRecommended && (
                    <span className="ev-tag ev-tag--accent">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1l1.2 3.5H11L8 6.5l1 4-3-2-3 2 1-4-3-2h3.8L6 1Z" fill="currentColor" />
                      </svg>
                      Recommandée
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                  Offre indicative, hors assurance et services · sous réserve d&apos;acceptation du dossier par le financeur
                </p>
              </div>
            </div>

            {leaser?.description && (
              <p className="text-sm mt-3 mb-4" style={{ color: 'var(--ink-3)' }}>{leaser.description}</p>
            )}

            {/* 4 KPIs */}
            <div className="grid grid-cols-4 gap-3 mt-6 mb-8">
              {[
                { label: 'Mensualité', value: fmt(monthly) },
                { label: 'Durée', value: `${duration} mois` },
                { label: 'Taux contrat', value: formatRate(rate) ?? '—' },
                { label: 'Coût total', value: fmt(totalCost) },
              ].map(kpi => (
                <div key={kpi.label} className="ev-card p-4">
                  <p className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>{kpi.label}</p>
                  <p className="ev-mono" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Avantages */}
            {advantages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {advantages.map(adv => (
                  <span key={adv} className="ev-tag ev-tag--ok">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {adv}
                  </span>
                ))}
              </div>
            )}

            {/* Conditions du contrat */}
            <section className="ev-card overflow-hidden mb-6">
              <div className="px-5 py-4 border-b" style={{ background: '#fff', borderColor: 'var(--line)' }}>
                <h2 className="ev-kicker">
                  Conditions du contrat
                </h2>
              </div>
              <table className="w-full">
                <tbody>
                  {contractConditions.map((row, i) => (
                    <tr
                      key={row.label}
                      className="border-b last:border-0"
                      style={{ borderColor: 'var(--line)', background: i % 2 === 0 ? '#fff' : 'var(--paper)' }}
                    >
                      <td className="px-5 py-3 text-sm w-2/5" style={{ color: 'var(--ink-3)' }}>{row.label}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: 'var(--ink)' }}>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Échéancier prévisionnel */}
            <section className="ev-card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: '#fff', borderColor: 'var(--line)' }}>
                <div>
                  <h2 className="ev-kicker">
                    Simulation indicative
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    6 premières échéances, hors assurance et services · le calendrier réel démarre à la livraison du matériel
                  </p>
                </div>
                <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                  {duration} échéances au total
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
                    {['Échéance', 'Loyer HT', 'TVA (20 %)', 'Total TTC'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--ink-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, i) => (
                    <tr
                      key={row.n}
                      className="border-b last:border-0"
                      style={{ borderColor: 'var(--line)', background: i % 2 === 0 ? '#fff' : 'var(--paper)' }}
                    >
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-3)' }}>Mois {row.n}</td>
                      <td className="ev-mono px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>{fmt(row.loyer)}</td>
                      <td className="ev-mono px-4 py-3 text-sm" style={{ color: 'var(--ink-3)' }}>{fmt(row.tva)}</td>
                      <td className="ev-mono px-4 py-3 text-sm font-medium" style={{ color: 'var(--ink)' }}>{fmt(row.total)}</td>
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
              initialStatus={offer.status}
              canConfirm={request.status === RS.offers_available}
              leaserName={offer.leaser_name}
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
