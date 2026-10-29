import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import TopActions from '@/components/TopActions'
import { RS, requestDestination, requestStatusInfo, requestTimeline } from '@/lib/status'
import { formatRate } from '@/lib/offers'


function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtShort(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type LineItemRow = { id: string; description: string | null; quantity: number | null; unit_price: number | null; total_price: number | null; selected: boolean }
type OfferRow = { id: string; leaser_name: string; monthly_payment: number; duration_months: number; selected: boolean; status: string; rate: number | null }

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

  // Seuls les dossiers en phase contrat ont une fiche contrat ; sinon, page adaptée au statut.
  const statusInfo = requestStatusInfo(request.status)
  if (statusInfo.section !== 'contrats') redirect(requestDestination(id, request.status))

  const selectedOffer: OfferRow | undefined = request.offers?.find((o: OfferRow) => o.selected)
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
  const duration: number | null = selectedOffer?.duration_months ?? request.duration_months ?? null
  const rate = formatRate(selectedOffer?.rate)
  const totalCost = monthly != null && duration != null ? monthly * duration : null
  const timeline = requestTimeline(request.status)
  const isActive = request.status === RS.active

  // Référent du leaser, affiché uniquement s'il est renseigné en base
  const { data: leaser } = selectedOffer
    ? await supabase.from('leasers').select('referent_name').eq('name', selectedOffer.leaser_name).maybeSingle()
    : { data: null }

  // Le client écrit à Everlease (pas d'adresse leaser devinée), avec la référence du dossier
  const contactHref = `mailto:contact@everlease.fr?subject=${encodeURIComponent(`Dossier ${ref}`)}`

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
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: statusInfo.bg, color: statusInfo.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusInfo.dot }} />
              {statusInfo.label}
            </span>
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
                Document d&apos;origine ({request.document_type ?? 'devis/facture'})
              </a>
            )}
            {selectedOffer && (
              <a
                href={contactHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-opacity hover:opacity-70"
                style={{ background: '#fff', color: '#0E0E0C', borderColor: '#E5E5E3', borderRadius: 8 }}
              >
                Contacter Everlease
              </a>
            )}
          </div>

          {/* Title */}
          <h1 className="font-semibold mt-3 mb-0.5" style={{ fontSize: 26, color: '#0E0E0C', letterSpacing: '-0.5px' }}>
            {assetTitle}{assetSuffix}
          </h1>
          <p className="text-sm mb-6" style={{ color: '#9A9A93' }}>
            Financé par <strong style={{ color: '#0E0E0C' }}>{leaserName}</strong>
          </p>


          {/* Chiffres du dossier (uniquement des valeurs en base) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Mensualité', value: fmt(monthly), sub: 'HT /mois' },
              { label: 'Durée', value: duration != null ? `${duration} mois` : '—', sub: '' },
              { label: 'Montant financé', value: fmt(request.total_amount), sub: 'HT' },
              { label: 'Coût total', value: fmt(totalCost), sub: 'HT' },
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
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* LEFT — Échéancier */}
            <div className="flex-1 min-w-0">
              <section className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: '#E5E5E3' }}>
                  <h2 className="text-sm font-semibold" style={{ color: '#0E0E0C' }}>
                    {isActive ? 'Contrat démarré' : 'Contrat en préparation'}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: '#9A9A93', lineHeight: 1.6 }}>
                    {isActive
                      ? `Votre échéancier détaillé vous est transmis par ${leaserName}. Il apparaîtra bientôt ici.`
                      : 'Votre échéancier apparaîtra ici dès le démarrage du contrat.'}
                  </p>
                </div>
                <ol className="px-5 py-4 space-y-3">
                  {timeline.map((step) => (
                    <li key={step.label} className="flex items-center gap-3">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: step.state === 'done' ? '#0E0E0C' : '#fff',
                          border: step.state === 'done' ? 'none' : `1.5px solid ${step.state === 'current' ? '#4F46E5' : '#E5E5E3'}`,
                        }}
                      >
                        {step.state === 'done' && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {step.state === 'current' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4F46E5' }} />}
                      </span>
                      <span
                        className="text-sm"
                        style={{
                          color: step.state === 'todo' ? '#9A9A93' : '#0E0E0C',
                          fontWeight: step.state === 'current' ? 500 : 400,
                        }}
                      >
                        {step.label}
                      </span>
                      {step.state === 'current' && (
                        <span className="text-xs" style={{ color: '#4F46E5' }}>En cours</span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* RIGHT — Documents, Détails, Actions */}
            <div className="w-full lg:w-72 lg:shrink-0 space-y-4">

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
                    { label: 'Leaser', value: leaserName },
                    { label: 'Taux nominal', value: rate },
                    { label: 'Coût total', value: totalCost != null ? fmt(totalCost) : null },
                    { label: 'Fournisseur', value: request.supplier_name as string | null },
                    { label: 'Référent leaser', value: leaser?.referent_name ?? null },
                  ].filter(row => row.value).map(row => (
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
                      href: contactHref,
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
                      activeOnly: true,
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
                      activeOnly: true,
                    },
                  ].filter(action => isActive || !action.activeOnly).map(action => (
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
