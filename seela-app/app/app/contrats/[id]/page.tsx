import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import TopActions from '@/components/TopActions'
import { RS, requestDestination, requestStatusInfo, requestTimeline } from '@/lib/status'
import { CLIENT_OFFER_COLUMNS, formatRate } from '@/lib/offers'
import { signedDocumentUrl } from '@/lib/documents'
import { createAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { availableKinds, buildSchedule } from '@/lib/contract-requests'
import { loadContractRequests } from '@/lib/contract-requests-store'
import ContractRequests from '@/components/ContractRequests'


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
    .select(`*, line_items(*), offers(${CLIENT_OFFER_COLUMNS})`)
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
  const contractStart = (request as { contract_start_date?: string | null }).contract_start_date ?? null
  // Échéancier indicatif (lib/contract-requests.ts) : dès que l'équipe a saisi la date de démarrage
  const schedule = isActive ? buildSchedule(contractStart, duration, monthly) : null
  // Demandes du client sur ce contrat (docs/contrat-client.md), lues avec le service role après le contrôle de propriété ci-dessus
  const contractRequests = isServiceRoleConfigured() ? await loadContractRequests(createAdminClient(), id) : []
  const kinds = availableKinds(request.status)

  // Bucket privé : lien temporaire, valable le temps de la consultation
  const documentHref = await signedDocumentUrl(supabase, request.document_url, user.id, 3600)

  // Le client écrit à everlease (pas d'adresse leaser devinée), avec la référence du dossier
  const contactHref = `mailto:contact@everlease.fr?subject=${encodeURIComponent(`Dossier ${ref}`)}`

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>
      <Sidebar />

      <main className="app-main flex-1">
        {/* Breadcrumb */}
        <div className="h-12 flex items-center px-4 sm:px-6 border-b whitespace-nowrap overflow-hidden gap-2" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <Link href="/app/contrats" className="text-sm transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-3)' }}>
            Contrats
          </Link>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--line-strong)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="ev-mono text-sm font-medium truncate min-w-0" style={{ color: 'var(--ink)' }}>{ref}</span>
          <TopActions />
        </div>

        <div className="px-8 py-8">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <Link href="/app/contrats" className="flex items-center transition-opacity hover:opacity-70" style={{ color: 'var(--ink-3)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <span className="ev-mono text-sm font-medium" style={{ color: 'var(--ink-3)' }}>{ref}</span>
            <span className="ev-tag" style={{ background: statusInfo.bg, color: statusInfo.color }}>
              <span className="ev-tag__dot" style={{ background: statusInfo.dot }} />
              {statusInfo.label}
            </span>
            <div className="flex-1" />
            {documentHref && (
              <a
                href={documentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="ev-btn ev-btn--ghost ev-btn--sm"
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
                className="ev-btn ev-btn--ghost ev-btn--sm"
              >
                Contacter everlease
              </a>
            )}
          </div>

          {/* Title */}
          <h1 className="ev-display mt-3 mb-0.5" style={{ fontSize: 26, color: 'var(--ink)' }}>
            {assetTitle}{assetSuffix}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
            Financé par <strong style={{ color: 'var(--ink)' }}>{leaserName}</strong>
          </p>


          {/* Chiffres du dossier (uniquement des valeurs en base) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Mensualité', value: fmt(monthly), sub: 'HT /mois' },
              { label: 'Durée', value: duration != null ? `${duration} mois` : '—', sub: '' },
              { label: 'Montant financé', value: fmt(request.total_amount), sub: 'HT' },
              { label: 'Coût total', value: fmt(totalCost), sub: 'HT' },
            ].map((kpi) => (
              <div key={kpi.label} className="ev-card p-4">
                <p className="text-xs mb-1.5" style={{ color: 'var(--ink-3)' }}>{kpi.label}</p>
                <p className="ev-mono font-semibold text-sm leading-tight" style={{ color: 'var(--ink)' }}>
                  {kpi.value}
                </p>
                {kpi.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{kpi.sub}</p>}
              </div>
            ))}
          </div>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* LEFT — Échéancier et demandes */}
            <div className="flex-1 min-w-0 space-y-4">
              {schedule ? (
                <section className="ev-card overflow-hidden">
                  <div className="px-5 py-4 border-b flex flex-wrap items-end justify-between gap-3" style={{ borderColor: 'var(--line)' }}>
                    <div>
                      <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Échéancier</h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
                        {schedule.remaining} échéance{schedule.remaining > 1 ? 's' : ''} restante{schedule.remaining > 1 ? 's' : ''} sur {schedule.lines.length} · fin le {fmtShort(schedule.end)}
                      </p>
                    </div>
                    {schedule.next && (
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Prochaine échéance</p>
                        <p className="ev-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>{fmt(schedule.next.amount)} · {fmtShort(schedule.next.date)}</p>
                      </div>
                    )}
                  </div>
                  <ol className="divide-y divide-[var(--line)] max-h-[420px] overflow-y-auto">
                    {schedule.lines.map(line => (
                      <li key={line.index} className="px-5 py-2 flex items-center gap-3 text-sm" style={{ opacity: line.state === 'passee' ? 0.55 : 1 }}>
                        <span className="ev-mono text-xs w-8 shrink-0" style={{ color: 'var(--ink-3)' }}>{String(line.index).padStart(2, '0')}</span>
                        <span className="flex-1" style={{ color: 'var(--ink)' }}>{fmtShort(line.date)}</span>
                        <span className="ev-mono" style={{ color: 'var(--ink)' }}>{fmt(line.amount)}</span>
                        <span className="w-24 text-right text-xs" style={{ color: line.state === 'prochaine' ? 'var(--accent)' : 'var(--ink-3)' }}>
                          {line.state === 'passee' ? 'Réglée' : line.state === 'prochaine' ? 'Prochaine' : ''}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="px-5 py-3 text-xs border-t" style={{ color: 'var(--ink-3)', borderColor: 'var(--line)', lineHeight: 1.6 }}>
                    Échéancier indicatif, hors assurance et services, établi à partir du loyer et de la date de démarrage. L’échéancier contractuel est celui du financeur.
                  </p>
                </section>
              ) : (
                <section className="ev-card overflow-hidden">
                  <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {isActive ? 'Contrat démarré' : 'Contrat en préparation'}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
                      {isActive
                        ? 'Votre échéancier apparaîtra ici dès que la date de démarrage sera confirmée.'
                        : 'Votre échéancier apparaîtra ici dès le démarrage du contrat.'}
                    </p>
                  </div>
                  <ol className="px-5 py-4 space-y-3">
                    {timeline.map((step) => (
                      <li key={step.label} className="flex items-center gap-3">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: step.state === 'done' ? 'var(--ink)' : 'var(--surface)',
                            border: step.state === 'done' ? 'none' : `1.5px solid ${step.state === 'current' ? 'var(--accent)' : 'var(--line-strong)'}`,
                          }}
                        >
                          {step.state === 'done' && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {step.state === 'current' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                        </span>
                        <span
                          className="text-sm"
                          style={{
                            color: step.state === 'todo' ? 'var(--ink-3)' : 'var(--ink)',
                            fontWeight: step.state === 'current' ? 500 : 400,
                          }}
                        >
                          {step.label}
                        </span>
                        {step.state === 'current' && (
                          <span className="text-xs" style={{ color: 'var(--accent)' }}>En cours</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <ContractRequests requestId={id} kinds={kinds} rows={contractRequests} />
            </div>

            {/* RIGHT — Documents, Détails */}
            <div className="w-full lg:w-72 lg:shrink-0 space-y-4">

              {/* Documents */}
              <section className="ev-card overflow-hidden">
                <div className="px-4 py-3.5 border-b" style={{ borderColor: 'var(--line)' }}>
                  <h2 className="ev-kicker">Documents</h2>
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {documentHref ? (
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 1h6l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="var(--accent)" strokeWidth="1.2" />
                          <path d="M9 1v3h3" stroke="var(--accent)" strokeWidth="1.2" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate capitalize" style={{ color: 'var(--ink)' }}>
                          {request.document_type ?? 'Document'} original
                        </p>
                        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                          {fmtShort(request.created_at)}
                        </p>
                      </div>
                      <a
                        href={documentHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M6.5 1v7M4 5.5l2.5 2.5 2.5-2.5M1 11h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    </div>
                  ) : null}
                  {/* Contrat de location — placeholder */}
                  <div className="px-4 py-3 flex items-center gap-3 opacity-40">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--raised)' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 1h6l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="var(--ink-3)" strokeWidth="1.2" />
                        <path d="M9 1v3h3" stroke="var(--ink-3)" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>Contrat de location</p>
                      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>À venir</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Détails du contrat */}
              <section className="ev-card overflow-hidden">
                <div className="px-4 py-3.5 border-b" style={{ borderColor: 'var(--line)' }}>
                  <h2 className="ev-kicker">Détails du contrat</h2>
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {[
                    { label: 'Financeur', value: leaserName },
                    { label: 'Taux nominal', value: rate },
                    { label: 'Coût total', value: totalCost != null ? fmt(totalCost) : null },
                    { label: 'Fournisseur', value: request.supplier_name as string | null },
                    { label: 'Démarrage', value: contractStart ? fmtShort(contractStart) : null },
                    { label: 'Fin prévue', value: schedule?.end ? fmtShort(schedule.end) : null },
                  ].filter(row => row.value).map(row => (
                    <div key={row.label} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{row.label}</span>
                      <span className="ev-mono text-xs font-medium" style={{ color: 'var(--ink)' }}>{row.value}</span>
                    </div>
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
