import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TopActions from '@/components/TopActions'
import { OS, RS, offerStatusInfo, requestDestination, requestStatusInfo } from '@/lib/status'
import CounterOfferActions from './CounterOfferActions'
import { RECOMMENDATION_REASON, formatRate, leaserInitials, recommendedOffer, sortOffers } from '@/lib/offers'


type LineItem = { description: string | null; selected: boolean; quantity: number | null; unit_price: number | null; total_price: number | null }
type OfferRow = {
  id: string
  leaser_name: string
  monthly_payment: number
  duration_months: number
  selected: boolean
  status: string | null
  rate: number | null
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const COEFFICIENTS: Record<number, number> = { 24: 0.048, 36: 0.034, 48: 0.027, 60: 0.023 }

export default async function OffresDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: request } = await supabase
    .from('financing_requests')
    .select('id, total_amount, duration_months, created_at, status, document_type, supplier_name, document_number, line_items(description, selected, quantity, unit_price, total_price), offers(*)')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()

  if (!request) notFound()

  // Brouillon → flow ; dossier en phase contrat → fiche contrat (pas d'offre à confirmer)
  const section = requestStatusInfo(request.status).section
  if (section === 'draft' || section === 'contrats') redirect(requestDestination(requestId, request.status))

  const offers: OfferRow[] = sortOffers(request.offers ?? [])
  const counterOffer = offers.find(o => o.status === OS.counter_offer)
  const recommended = recommendedOffer(offers)

  // Couleur de marque de chaque leaser (table leasers), à défaut gris neutre
  const { data: leaserRows } = offers.length > 0
    ? await supabase.from('leasers').select('name, brand_color').in('name', offers.map(o => o.leaser_name))
    : { data: [] }
  const leaserColors = new Map((leaserRows ?? []).map(l => [l.name, l.brand_color as string | null]))

  const selectedLines: LineItem[] = (request.line_items ?? []).filter((l: LineItem) => l.selected)
  const firstLine = selectedLines[0]
  const assetTitle = firstLine?.description
    ? (firstLine.quantity && firstLine.quantity > 1
        ? `${firstLine.description} ×${firstLine.quantity}`
        : firstLine.description)
    : 'Équipements'
  const extraCount = selectedLines.length - 1

  const ref = `C-${requestId.slice(0, 4).toUpperCase()}-${requestId.slice(4, 8).toUpperCase()}`
  const duration = request.duration_months ?? 36
  const coeff = COEFFICIENTS[duration] ?? 0.034

  const isWaiting = request.status === RS.submitted || request.status === RS.no_match
  const isNoMatch = request.status === RS.no_match

  return (
    <div>
      {/* Breadcrumb */}
      <div className="h-12 flex items-center px-6 border-b gap-2" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <Link href="/app/offres" className="text-sm transition-colors hover:text-[#0E0E0C]" style={{ color: '#9A9A93' }}>
          Offres
        </Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2l4 4-4 4" stroke="#D1D1CE" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium" style={{ color: '#0E0E0C' }}>{ref}</span>
        <TopActions />
      </div>

      <div className="px-8 py-8 max-w-3xl">
          {/* Header */}
          <h1 className="font-semibold mb-1" style={{ fontSize: 26, color: '#0E0E0C', letterSpacing: '-0.5px' }}>
            {assetTitle}{extraCount > 0 ? ` et ${extraCount} autre${extraCount > 1 ? 's' : ''}` : ''}
          </h1>
          <p className="text-sm mb-8" style={{ color: '#9A9A93' }}>
            {fmt(request.total_amount)} HT
            {request.duration_months ? ` · ${request.duration_months} mois` : ''}
          </p>

          {/* Votre demande */}
          <section className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: '#E5E5E3' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>
                Votre demande
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #E5E5E3' }}>
                  {['Description', 'Qté', 'Prix unit. HT', 'Total HT'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: '#9A9A93' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedLines.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-0"
                    style={{ borderColor: '#E5E5E3', background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}
                  >
                    <td className="px-5 py-3.5 text-sm" style={{ color: '#0E0E0C' }}>{item.description ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: '#9A9A93' }}>{item.quantity ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: '#9A9A93' }}>
                      {item.unit_price != null ? fmt(item.unit_price) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium" style={{ color: '#0E0E0C' }}>
                      {item.total_price != null ? fmt(item.total_price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 flex items-center justify-between border-t" style={{ background: '#FAFAF9', borderColor: '#E5E5E3' }}>
              <span className="text-xs" style={{ color: '#9A9A93' }}>
                {request.duration_months ? `${request.duration_months} mois` : '—'}
                {' · '}loyer estimé {fmt(request.total_amount != null ? request.total_amount * coeff : null)}/mois
              </span>
              <span className="text-sm font-semibold" style={{ color: '#0E0E0C' }}>
                Total HT : {fmt(request.total_amount)}
              </span>
            </div>
          </section>

          {/* Contre-proposition du leaser */}
          {counterOffer && (
            <section className="p-5 rounded-xl border mb-6" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
              <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
                {counterOffer.leaser_name} propose des conditions modifiées
              </p>
              <p className="text-xs mt-0.5 mb-4" style={{ color: '#B45309' }}>
                Examinez les nouveaux termes, puis acceptez-les ou refusez-les.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5 max-w-sm">
                <div className="p-3.5 rounded-xl border" style={{ background: '#fff', borderColor: '#FED7AA' }}>
                  <p className="text-xs mb-1" style={{ color: '#9A9A93' }}>Nouvelle mensualité</p>
                  <p className="font-semibold text-sm" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(counterOffer.monthly_payment)} <span className="font-normal text-xs" style={{ color: '#9A9A93' }}>HT</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border" style={{ background: '#fff', borderColor: '#FED7AA' }}>
                  <p className="text-xs mb-1" style={{ color: '#9A9A93' }}>Durée proposée</p>
                  <p className="font-semibold text-sm" style={{ color: '#0E0E0C' }}>{counterOffer.duration_months} mois</p>
                </div>
              </div>
              <CounterOfferActions offerId={counterOffer.id} requestId={requestId} allOfferIds={offers.map(o => o.id)} />
            </section>
          )}

          {/* Offres Everlease */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#9A9A93' }}>
              Offres Everlease
            </h2>

            {isWaiting ? (
              <div
                className="flex items-start gap-4 p-6 rounded-xl border"
                style={{ background: '#fff', borderColor: '#E5E5E3' }}
              >
                <div className="w-8 h-8 rounded-full border-2 border-t-[#4F46E5] animate-spin shrink-0 mt-0.5" style={{ borderColor: '#E5E5E2', borderTopColor: '#4F46E5' }} />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#0E0E0C' }}>
                    {isNoMatch ? 'Étude par un conseiller Everlease' : 'Recherche en cours'}
                  </p>
                  <p className="text-sm" style={{ color: '#9A9A93', lineHeight: 1.6 }}>
                    {isNoMatch
                      ? 'Aucune offre automatique ne correspond à votre demande : un conseiller recherche une solution auprès de nos partenaires.'
                      : `Everlease consulte ses leasers partenaires pour votre ${request.document_type ?? 'dossier'}.`}
                    {' '}Vous serez notifié dès que les offres sont disponibles.
                  </p>
                  <p className="text-xs mt-2" style={{ color: '#9A9A93' }}>Délai estimé : 24 à 48h ouvrées</p>
                </div>
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: '#E5E5E3' }}>
                <p className="text-sm" style={{ color: '#9A9A93' }}>Aucune offre disponible pour ce dossier.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => {
                  const color = leaserColors.get(offer.leaser_name) ?? null
                  const rate = formatRate(offer.rate)

                  if (offer.id === recommended?.id) {
                    return (
                      <div key={offer.id} className="rounded-xl p-6" style={{ background: '#0E0E0C' }}>
                        <div className="flex items-center gap-2 mb-5">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1l1.5 4H13l-3.5 2.5L11 12 7 9.5 3 12l1.5-4.5L1 5h4.5L7 1Z" fill="rgba(255,255,255,0.7)" />
                          </svg>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                            Recommandée par Everlease · {RECOMMENDATION_REASON}
                          </span>
                        </div>
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                              style={{ background: color ?? '#4F46E5' }}
                            >
                              {leaserInitials(offer.leaser_name)}
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">{offer.leaser_name}</p>
                            </div>
                          </div>
                          <div className="flex items-end gap-6 flex-wrap">
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>Mensualité</p>
                              <p className="font-bold text-white" style={{ fontSize: 30, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
                                {fmt(offer.monthly_payment)}
                              </p>
                            </div>
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>Durée</p>
                              <p className="font-medium text-white text-sm">{offer.duration_months} mois</p>
                            </div>
                            {rate && (
                              <div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>Taux indicatif</p>
                                <p className="font-medium text-white text-sm">{rate}</p>
                              </div>
                            )}
                            <Link
                              href={`/app/offres/${requestId}/${offer.id}`}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                              style={{ background: '#fff', color: '#0E0E0C', borderRadius: 8 }}
                            >
                              Voir le détail
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M3 6.5h7M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={offer.id}
                      className="flex items-center gap-4 px-5 py-4 rounded-xl border"
                      style={{ background: '#fff', borderColor: '#E5E5E3' }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: color ?? '#9A9A93' }}
                      >
                        {leaserInitials(offer.leaser_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#0E0E0C' }}>{offer.leaser_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                          {offer.duration_months} mois{rate ? ` · taux indicatif ${rate}` : ''}
                        </p>
                        {offer.status === OS.refused && (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: offerStatusInfo(offer.status).bg, color: offerStatusInfo(offer.status).color }}>
                            {offerStatusInfo(offer.status).label}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs mb-0.5" style={{ color: '#9A9A93' }}>Mensualité</p>
                        <p className="font-semibold text-sm" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(offer.monthly_payment)}
                        </p>
                      </div>
                      <Link
                        href={`/app/offres/${requestId}/${offer.id}`}
                        className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:border-[#0E0E0C]"
                        style={{ borderColor: '#E5E5E3', color: '#0E0E0C', background: 'transparent', borderRadius: 8 }}
                      >
                        Voir le détail
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M3 6.5h7M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </div>
                  )
                })}

                <div
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm mt-2"
                  style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                    <path d="M7 1l6 11H1L7 1Z" stroke="#92400E" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M7 5.5v3M7 10h.01" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span>Offres indicatives — confirmation sous 48h ouvrées par le leaser.</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
  )
}
