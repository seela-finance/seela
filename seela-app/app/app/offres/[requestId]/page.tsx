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
      <div className="h-12 flex items-center px-6 border-b gap-2" style={{ borderColor: 'var(--line)', background: '#fff' }}>
        <Link href="/app/offres" className="text-sm transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-3)' }}>
          Offres
        </Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2l4 4-4 4" stroke="var(--line-strong)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="ev-mono text-sm font-medium" style={{ color: 'var(--ink)' }}>{ref}</span>
        <TopActions />
      </div>

      <div className="px-8 py-8 max-w-3xl">
          {/* Header */}
          <h1 className="ev-display mb-1" style={{ fontSize: 26, color: 'var(--ink)' }}>
            {assetTitle}{extraCount > 0 ? ` et ${extraCount} autre${extraCount > 1 ? 's' : ''}` : ''}
          </h1>
          <p className="ev-mono text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            {fmt(request.total_amount)} HT
            {request.duration_months ? ` · ${request.duration_months} mois` : ''}
          </p>

          {/* Votre demande */}
          <section className="ev-card overflow-hidden mb-6">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: '#fff', borderColor: 'var(--line)' }}>
              <h2 className="ev-kicker">
                Votre demande
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
                  {['Description', 'Qté', 'Prix unit. HT', 'Total HT'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: 'var(--ink-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedLines.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-0"
                    style={{ borderColor: 'var(--line)', background: i % 2 === 0 ? '#fff' : 'var(--paper)' }}
                  >
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--ink)' }}>{item.description ?? '—'}</td>
                    <td className="ev-mono px-5 py-3.5 text-sm" style={{ color: 'var(--ink-3)' }}>{item.quantity ?? '—'}</td>
                    <td className="ev-mono px-5 py-3.5 text-sm" style={{ color: 'var(--ink-3)' }}>
                      {item.unit_price != null ? fmt(item.unit_price) : '—'}
                    </td>
                    <td className="ev-mono px-5 py-3.5 text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {item.total_price != null ? fmt(item.total_price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 flex items-center justify-between border-t" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
              <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                {request.duration_months ? `${request.duration_months} mois` : '—'}
                {/* Estimation par coefficients seulement tant qu'aucune offre réelle n'existe */}
                {offers.length === 0 && <>{' · '}loyer estimé {fmt(request.total_amount != null ? request.total_amount * coeff : null)}/mois, indicatif, hors assurance et services</>}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Total HT : <span className="ev-mono">{fmt(request.total_amount)}</span>
              </span>
            </div>
          </section>

          {/* Contre-proposition du leaser */}
          {counterOffer && (
            <section className="ev-alert ev-alert--warning mb-6" style={{ padding: 20 }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
                {counterOffer.leaser_name} propose des conditions modifiées
              </p>
              <p className="text-xs mt-0.5 mb-4" style={{ color: 'var(--warning)' }}>
                Examinez les nouveaux termes, puis acceptez-les ou refusez-les.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5 max-w-sm">
                <div className="ev-card p-3.5">
                  <p className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Nouvelle mensualité</p>
                  <p className="ev-mono font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                    {fmt(counterOffer.monthly_payment)} <span className="font-normal text-xs" style={{ color: 'var(--ink-3)' }}>HT</span>
                  </p>
                </div>
                <div className="ev-card p-3.5">
                  <p className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Durée proposée</p>
                  <p className="ev-mono font-semibold text-sm" style={{ color: 'var(--ink)' }}>{counterOffer.duration_months} mois</p>
                </div>
              </div>
              <CounterOfferActions offerId={counterOffer.id} />
            </section>
          )}

          {/* Offres Everlease */}
          <section>
            <h2 className="ev-kicker mb-4">
              Offres Everlease
            </h2>

            {isWaiting ? (
              <div className="ev-card flex items-start gap-4 p-6">
                <div className="w-8 h-8 rounded-full border-2 border-t-[var(--accent)] animate-spin shrink-0 mt-0.5" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--accent)' }} />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
                    {isNoMatch ? 'Étude par un conseiller Everlease' : 'Recherche en cours'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
                    {isNoMatch
                      ? 'Aucune offre automatique ne correspond à votre demande : un conseiller Everlease étudie votre dossier et recherche une solution adaptée.'
                      : `Everlease présente votre ${request.document_type ?? 'dossier'} à des financeurs adaptés.`}
                    {' '}Vous serez notifié dès que les offres sont disponibles.
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>Un conseiller Everlease vous rappelle sous 24 h ouvrées.</p>
                </div>
              </div>
            ) : offers.length === 0 ? (
              <div className="ev-card ev-card--dashed text-center py-12">
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Aucune offre disponible pour ce dossier.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => {
                  const color = leaserColors.get(offer.leaser_name) ?? null
                  const rate = formatRate(offer.rate)

                  if (offer.id === recommended?.id) {
                    return (
                      <div key={offer.id} className="ev-card p-6" style={{ background: 'var(--ink)', borderColor: 'var(--ink)' }}>
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
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                              style={{ background: color ?? 'var(--accent)' }}
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
                              <p className="ev-mono text-white" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em' }}>
                                {fmt(offer.monthly_payment)}
                              </p>
                            </div>
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>Durée</p>
                              <p className="ev-mono font-medium text-white text-sm">{offer.duration_months} mois</p>
                            </div>
                            {rate && (
                              <div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>Taux indicatif</p>
                                <p className="ev-mono font-medium text-white text-sm">{rate}</p>
                              </div>
                            )}
                            <Link
                              href={`/app/offres/${requestId}/${offer.id}`}
                              className="ev-btn ev-btn--primary"
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
                      className="ev-card flex items-center gap-4 px-5 py-4"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: color ?? 'var(--ink-3)' }}
                      >
                        {leaserInitials(offer.leaser_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{offer.leaser_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                          <span className="ev-mono">{offer.duration_months} mois</span>{rate ? ` · taux indicatif ${rate}` : ''}
                        </p>
                        {offer.status === OS.refused && (
                          <span className="ev-tag mt-1" style={{ background: offerStatusInfo(offer.status).bg, color: offerStatusInfo(offer.status).color }}>
                            <span className="ev-tag__dot" />
                            {offerStatusInfo(offer.status).label}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>Mensualité</p>
                        <p className="ev-mono font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                          {fmt(offer.monthly_payment)}
                        </p>
                      </div>
                      <Link
                        href={`/app/offres/${requestId}/${offer.id}`}
                        className="ev-btn ev-btn--ghost shrink-0"
                      >
                        Voir le détail
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M3 6.5h7M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </div>
                  )
                })}

                <div className="ev-alert ev-alert--accent flex items-start gap-2.5 mt-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                    <path d="M7 1l6 11H1L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M7 5.5v3M7 10h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span>Offres indicatives, hors assurance et services. Sous réserve d&apos;acceptation du dossier par le financeur.</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
  )
}
