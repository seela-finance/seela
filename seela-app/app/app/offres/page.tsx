import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TopActions from '@/components/TopActions'
import { RS, requestStatusesIn } from '@/lib/status'
type LineItem = { description: string | null; category: string | null; selected: boolean; quantity: number | null }
type Offer = { id: string; leaser_name: string; monthly_payment: number; selected: boolean; status: string }

type RequestRow = {
  id: string
  total_amount: number | null
  duration_months: number | null
  created_at: string
  status: string
  supplier_name: string | null
  document_number: string | null
  line_items: LineItem[]
  offers: Offer[]
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// v2 : plus de couleur par catégorie, un seul tag neutre (`ev-tag`)

const TABLE_HEADERS = ['Référence', 'Fournisseur', 'N° Document', 'Équipement', 'Catégorie', 'Montant HT', 'Durée', 'Date', '']

function EquipName({ line_items }: { line_items: LineItem[] }) {
  const selectedLines = line_items.filter(l => l.selected)
  const firstLine = selectedLines[0]
  const extraCount = selectedLines.length - 1
  const label = firstLine?.description
    ? (firstLine.quantity && firstLine.quantity > 1
        ? `${firstLine.description} ×${firstLine.quantity}`
        : firstLine.description)
    : '—'
  return (
    <div>
      <span className="text-sm truncate block" style={{ color: 'var(--ink)' }}>{label}</span>
      {extraCount > 0 && (
        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>+{extraCount} autre{extraCount > 1 ? 's' : ''}</span>
      )}
    </div>
  )
}

function CategoryBadge({ line_items }: { line_items: LineItem[] }) {
  const category = line_items.find(l => l.selected)?.category ?? null
  if (!category) return <span style={{ color: 'var(--ink-3)' }}>—</span>
  return <span className="ev-tag">{category}</span>
}

function RequestTable({
  requests,
  ctaLabel,
  href,
}: {
  requests: RequestRow[]
  ctaLabel: string
  href: (r: RequestRow) => string
}) {
  if (requests.length === 0) return null
  return (
    <div className="ev-card overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
            {TABLE_HEADERS.map((h, i) => (
              <th key={i} className="ev-kicker px-4 py-3 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map(r => {
            const ref = `C-${r.id.slice(0, 4).toUpperCase()}-${r.id.slice(4, 8).toUpperCase()}`
            return (
              <tr
                key={r.id}
                className="transition-colors hover:bg-[var(--paper)]"
                style={{ borderBottom: '1px solid var(--line)' }}
              >
                <td className="ev-mono px-4 py-3.5 text-sm font-medium" style={{ color: 'var(--ink)' }}>{ref}</td>
                <td className="px-4 py-3.5 text-sm max-w-[120px]" style={{ color: 'var(--ink-3)' }}>
                  <span className="truncate block">{r.supplier_name ?? '—'}</span>
                </td>
                <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ink-3)' }}>
                  {r.document_number ?? '—'}
                </td>
                <td className="px-4 py-3.5 max-w-xs">
                  <EquipName line_items={r.line_items} />
                </td>
                <td className="px-4 py-3.5">
                  <CategoryBadge line_items={r.line_items} />
                </td>
                <td className="ev-mono px-4 py-3.5 text-sm font-medium" style={{ color: 'var(--ink)' }}>{fmt(r.total_amount)}</td>
                <td className="ev-mono px-4 py-3.5 text-sm" style={{ color: 'var(--ink-3)' }}>{r.duration_months ? `${r.duration_months} mois` : '—'}</td>
                <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ink-3)' }}>{fmtDate(r.created_at)}</td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={href(r)}
                    className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: 'var(--accent)' }}
                  >
                    {ctaLabel}
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M3 6.5h7M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function AvailableSection({ requests }: { requests: RequestRow[] }) {
  return <RequestTable requests={requests} ctaLabel="Voir les offres" href={r => `/app/offres/${r.id}`} />
}

function StepDot({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--ink)' }}>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', border: '2px solid var(--accent)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
      </div>
    )
  }
  return (
    <div className="w-5 h-5 rounded-full shrink-0 border" style={{ background: 'var(--raised)', borderColor: 'var(--line)' }} />
  )
}

function MiniProgress({ status }: { status: string }) {
  const s1: 'done' | 'active' | 'pending' = 'done'
  const s2: 'done' | 'active' | 'pending' = status === RS.seela_validated ? 'done' : 'active'
  const s3: 'done' | 'active' | 'pending' = status === RS.seela_validated ? 'active' : 'pending'

  const label = status === RS.seela_validated
    ? 'Décision du financeur en cours'
    : 'Validation Everlease en cours'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <StepDot state={s1} />
        <div className="w-6 border-t" style={{ borderColor: 'var(--line)' }} />
        <StepDot state={s2} />
        <div className="w-6 border-t" style={{ borderColor: 'var(--line)' }} />
        <StepDot state={s3} />
      </div>
      <p className="text-xs" style={{ color: 'var(--accent)' }}>{label}</p>
    </div>
  )
}

function ProcessingSection({ requests }: { requests: RequestRow[] }) {
  if (requests.length === 0) return null
  return (
    <div className="ev-card overflow-hidden">
      {requests.map((r, i) => {
        const ref = `C-${r.id.slice(0, 4).toUpperCase()}-${r.id.slice(4, 8).toUpperCase()}`
        const selectedOffer = r.offers.find(o => o.selected)
        const isLast = i === requests.length - 1
        return (
          <Link
            key={r.id}
            href={`/app/offres/${r.id}`}
            className="flex items-center gap-6 px-5 py-4 transition-colors hover:bg-[var(--paper)]"
            style={{ background: '#fff', borderBottom: isLast ? 'none' : '1px solid var(--line)', display: 'flex' }}
          >
            {/* Ref + date */}
            <div className="shrink-0 w-32">
              <p className="ev-mono text-sm font-medium" style={{ color: 'var(--ink)' }}>{ref}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{fmtDate(r.created_at)}</p>
            </div>

            {/* Equipment */}
            <div className="flex-1 min-w-0">
              <EquipName line_items={r.line_items} />
            </div>

            {/* Leaser + amount */}
            <div className="shrink-0 text-right w-44">
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {selectedOffer?.leaser_name ?? '—'}
              </p>
              <p className="ev-mono text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {selectedOffer ? `${fmt(selectedOffer.monthly_payment)}/mois` : '—'}
              </p>
            </div>

            {/* Progress */}
            <div className="shrink-0 w-48">
              <MiniProgress status={r.status} />
            </div>

            {/* Arrow */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: 'var(--line-strong)' }}>
              <path d="M4 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )
      })}
    </div>
  )
}

function SubmittedSection({ requests }: { requests: RequestRow[] }) {
  return (
    <RequestTable
      requests={requests}
      ctaLabel="Voir le dossier"
      href={r => `/app/offres/${r.id}`}
    />
  )
}

export default async function OffresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data } = await supabase
    .from('financing_requests')
    .select('id, total_amount, duration_months, created_at, status, supplier_name, document_number, line_items(description, category, selected, quantity), offers(id, leaser_name, monthly_payment, selected, status)')
    .eq('user_id', user.id)
    .in('status', requestStatusesIn('offres'))
    .order('created_at', { ascending: false })

  const all: RequestRow[] = (data ?? []) as RequestRow[]
  // Action attendue du client / traitement Everlease ou leaser / en attente d'offres
  const available   = all.filter(r => r.status === RS.offers_available || r.status === RS.counter_offer)
  const processing  = all.filter(r => r.status === RS.offer_selected || r.status === RS.seela_validated)
  const submitted   = all.filter(r => r.status === RS.submitted || r.status === RS.no_match)

  const totalPending = all.length

  return (
    <div>
      <div className="h-12 flex items-center px-4 sm:px-6 border-b whitespace-nowrap overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Offres</span>
        <TopActions />
      </div>

      <div className="px-4 sm:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="ev-display mb-0.5" style={{ fontSize: 24, color: 'var(--ink)' }}>
              Mes demandes
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              {totalPending} demande{totalPending !== 1 ? 's' : ''} en cours
            </p>
          </div>
        </div>

        {totalPending === 0 ? (
          <div className="ev-card ev-card--dashed text-center py-20">
            <div className="w-10 h-10 rounded-md flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--raised)' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8.5" stroke="var(--ink-3)" strokeWidth="1.3" />
                <path d="M10 6v5M10 13h.01" stroke="var(--ink-3)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Aucune demande en cours</p>
            <p className="text-xs mb-5" style={{ color: 'var(--ink-3)' }}>Les offres apparaissent ici dès qu&apos;un financeur répond à votre dossier.</p>
            <Link href="/app/nouveau" className="ev-btn ev-btn--primary">
              Démarrer un financement
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {available.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Offres disponibles</h2>
                  <span className="ev-tag ev-tag--accent">
                    {available.length} nouvelle{available.length > 1 ? 's' : ''}
                  </span>
                </div>
                <AvailableSection requests={available} />
              </div>
            )}

            {processing.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>En cours de traitement</h2>
                  <span className="ev-tag ev-tag--warning">
                    {processing.length}
                  </span>
                </div>
                <ProcessingSection requests={processing} />
              </div>
            )}

            {submitted.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>En attente d&apos;offres</h2>
                  <span className="ev-tag">
                    {submitted.length}
                  </span>
                </div>
                <SubmittedSection requests={submitted} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
