import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TopActions from '@/components/TopActions'


type LineItem = { description: string | null; selected: boolean; quantity: number | null; unit_price: number | null; total_price: number | null }
type OfferRow = {
  id: string
  leaser_name: string
  monthly_payment: number
  duration_months: number
  selected: boolean
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const SCORES: Record<string, number> = {
  'BNP Lease': 94,
  'Société Générale Équipement': 91,
  'Crédit Agricole Leasing': 88,
}

const LEASERMETA: Record<string, { letters: string; bg: string; rate: number }> = {
  'BNP Lease':                    { letters: 'BL', bg: '#2563EB', rate: 4.85 },
  'Société Générale Équipement':  { letters: 'SG', bg: '#DC2626', rate: 5.10 },
  'Crédit Agricole Leasing':      { letters: 'CA', bg: '#16A34A', rate: 4.62 },
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

  const offers: OfferRow[] = (request.offers ?? []).sort(
    (a: OfferRow, b: OfferRow) => (SCORES[b.leaser_name] ?? 80) - (SCORES[a.leaser_name] ?? 80)
  )

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

  const isWaiting = request.status === 'submitted'

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
                    Recherche en cours
                  </p>
                  <p className="text-sm" style={{ color: '#9A9A93', lineHeight: 1.6 }}>
                    Everlease consulte ses leasers partenaires pour votre {request.document_type ?? 'dossier'}.
                    Vous serez notifié dès que les offres sont disponibles.
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
                {offers.map((offer, idx) => {
                  const meta = LEASERMETA[offer.leaser_name]
                  const score = SCORES[offer.leaser_name] ?? 85
                  const isFirst = idx === 0

                  if (isFirst) {
                    return (
                      <div key={offer.id} className="rounded-xl p-6" style={{ background: '#0E0E0C' }}>
                        <div className="flex items-center gap-2 mb-5">
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1l1.5 4H13l-3.5 2.5L11 12 7 9.5 3 12l1.5-4.5L1 5h4.5L7 1Z" fill="rgba(255,255,255,0.7)" />
                          </svg>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                            Recommandée par Everlease · Meilleur rapport coût / flexibilité
                          </span>
                        </div>
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                              style={{ background: meta?.bg ?? '#4F46E5' }}
                            >
                              {meta?.letters ?? offer.leaser_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">{offer.leaser_name}</p>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                                Score Everlease {score} / 100
                              </p>
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
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>Taux indicatif</p>
                              <p className="font-medium text-white text-sm">{(meta?.rate ?? 4.85).toFixed(2)} %</p>
                            </div>
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
                        <div className="mt-5 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                            <div className="h-full rounded-full" style={{ background: '#fff', width: `${score}%` }} />
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{score} / 100</span>
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
                        style={{ background: meta?.bg ?? '#9A9A93' }}
                      >
                        {meta?.letters ?? offer.leaser_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#0E0E0C' }}>{offer.leaser_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                          Taux indicatif : {(meta?.rate ?? 4.85).toFixed(2)} %
                        </p>
                      </div>
                      <div className="shrink-0 w-24">
                        <p className="text-xs mb-1.5" style={{ color: '#9A9A93' }}>Score Everlease</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#E5E5E3' }}>
                            <div className="h-full rounded-full" style={{ background: '#4F46E5', width: `${score}%` }} />
                          </div>
                          <span className="text-xs font-medium" style={{ color: '#0E0E0C', minWidth: 20 }}>{score}</span>
                        </div>
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
