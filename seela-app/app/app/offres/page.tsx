import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TopActions from '@/components/TopActions'
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

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'Informatique': { bg: '#DBEAFE', color: '#1E40AF' },
  'Mobilier':     { bg: '#FEF3C7', color: '#92400E' },
  'Véhicule':     { bg: '#D1FAE5', color: '#065F46' },
  'Médical':      { bg: '#EDE9FE', color: '#5B21B6' },
  'Industrie':    { bg: '#FFEDD5', color: '#9A3412' },
  'Téléphonie':   { bg: '#CFFAFE', color: '#164E63' },
  'Audiovisuel':  { bg: '#FCE7F3', color: '#9D174D' },
  'Autre':        { bg: '#F0F0EE', color: '#9A9A93' },
}


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
      <span className="text-sm truncate block" style={{ color: '#1A1A18' }}>{label}</span>
      {extraCount > 0 && (
        <span className="text-xs" style={{ color: '#9A9A93' }}>+{extraCount} autre{extraCount > 1 ? 's' : ''}</span>
      )}
    </div>
  )
}

function CategoryBadge({ line_items }: { line_items: LineItem[] }) {
  const category = line_items.find(l => l.selected)?.category ?? null
  if (!category) return <span style={{ color: '#9A9A93' }}>—</span>
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Autre']
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: colors.bg, color: colors.color }}
    >
      {category}
    </span>
  )
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
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #E5E5E3' }}>
            {TABLE_HEADERS.map((h, i) => (
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
        <tbody>
          {requests.map(r => {
            const ref = `C-${r.id.slice(0, 4).toUpperCase()}-${r.id.slice(4, 8).toUpperCase()}`
            return (
              <tr
                key={r.id}
                className="transition-colors hover:bg-[#FAFAF9]"
                style={{ borderBottom: '1px solid #F5F5F4' }}
              >
                <td className="px-4 py-3.5 text-sm font-medium" style={{ color: '#1A1A18', fontVariantNumeric: 'tabular-nums' }}>{ref}</td>
                <td className="px-4 py-3.5 text-sm max-w-[120px]" style={{ color: '#9A9A93' }}>
                  <span className="truncate block">{r.supplier_name ?? '—'}</span>
                </td>
                <td className="px-4 py-3.5 text-sm" style={{ color: '#9A9A93' }}>
                  {r.document_number ?? '—'}
                </td>
                <td className="px-4 py-3.5 max-w-xs">
                  <EquipName line_items={r.line_items} />
                </td>
                <td className="px-4 py-3.5">
                  <CategoryBadge line_items={r.line_items} />
                </td>
                <td className="px-4 py-3.5 text-sm font-medium" style={{ color: '#1A1A18', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_amount)}</td>
                <td className="px-4 py-3.5 text-sm" style={{ color: '#9A9A93' }}>{r.duration_months ? `${r.duration_months} mois` : '—'}</td>
                <td className="px-4 py-3.5 text-sm" style={{ color: '#9A9A93' }}>{fmtDate(r.created_at)}</td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={href(r)}
                    className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: '#4F46E5' }}
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
  )
}

function AvailableSection({ requests }: { requests: RequestRow[] }) {
  return <RequestTable requests={requests} ctaLabel="Voir les offres" href={r => `/app/offres/${r.id}`} />
}

function StepDot({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#16A34A' }}>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EEF2FF', border: '2px solid #4F46E5' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4F46E5' }} />
      </div>
    )
  }
  return (
    <div className="w-5 h-5 rounded-full shrink-0 border" style={{ background: '#F5F5F4', borderColor: '#E5E5E3' }} />
  )
}

function MiniProgress({ status }: { status: string }) {
  const s1: 'done' | 'active' | 'pending' = 'done'
  const s2: 'done' | 'active' | 'pending' = status === 'seela_validated' ? 'done' : 'active'
  const s3: 'done' | 'active' | 'pending' = status === 'seela_validated' ? 'active' : 'pending'

  const label = status === 'seela_validated'
    ? 'Décision du leaser en cours'
    : 'Validation Seela en cours'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <StepDot state={s1} />
        <div className="w-6 border-t" style={{ borderColor: '#E5E5E3' }} />
        <StepDot state={s2} />
        <div className="w-6 border-t" style={{ borderColor: '#E5E5E3' }} />
        <StepDot state={s3} />
      </div>
      <p className="text-xs" style={{ color: '#4F46E5' }}>{label}</p>
    </div>
  )
}

function ProcessingSection({ requests }: { requests: RequestRow[] }) {
  if (requests.length === 0) return null
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3' }}>
      {requests.map((r, i) => {
        const ref = `C-${r.id.slice(0, 4).toUpperCase()}-${r.id.slice(4, 8).toUpperCase()}`
        const selectedOffer = r.offers.find(o => o.selected)
        const isLast = i === requests.length - 1
        return (
          <Link
            key={r.id}
            href={`/app/offres/${r.id}`}
            className="flex items-center gap-6 px-5 py-4 transition-colors hover:bg-[#FAFAF9]"
            style={{ background: '#fff', borderBottom: isLast ? 'none' : '1px solid #F5F5F4', display: 'flex' }}
          >
            {/* Ref + date */}
            <div className="shrink-0 w-32">
              <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>{ref}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>{fmtDate(r.created_at)}</p>
            </div>

            {/* Equipment */}
            <div className="flex-1 min-w-0">
              <EquipName line_items={r.line_items} />
            </div>

            {/* Leaser + amount */}
            <div className="shrink-0 text-right w-44">
              <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>
                {selectedOffer?.leaser_name ?? '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                {selectedOffer ? `${fmt(selectedOffer.monthly_payment)}/mois` : '—'}
              </p>
            </div>

            {/* Progress */}
            <div className="shrink-0 w-48">
              <MiniProgress status={r.status} />
            </div>

            {/* Arrow */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#D1D1CE' }}>
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
    .in('status', ['submitted', 'offers_available', 'offer_selected', 'seela_validated'])
    .order('created_at', { ascending: false })

  const all: RequestRow[] = (data ?? []) as RequestRow[]
  const available   = all.filter(r => r.status === 'offers_available')
  const processing  = all.filter(r => r.status === 'offer_selected' || r.status === 'seela_validated')
  const submitted   = all.filter(r => r.status === 'submitted')

  const totalPending = all.length

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <span className="text-sm font-medium" style={{ color: '#1A1A18' }}>Offres</span>
        <TopActions />
      </div>

      <div className="px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-semibold mb-0.5" style={{ fontSize: 24, color: '#1A1A18', letterSpacing: '-0.4px' }}>
              Mes demandes
            </h1>
            <p className="text-sm" style={{ color: '#9A9A93' }}>
              {totalPending} demande{totalPending !== 1 ? 's' : ''} en cours
            </p>
          </div>
        </div>

        {totalPending === 0 ? (
          <div className="text-center py-20 rounded-xl border border-dashed" style={{ borderColor: '#E5E5E3' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#F5F5F4' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8.5" stroke="#9A9A93" strokeWidth="1.3" />
                <path d="M10 6v5M10 13h.01" stroke="#9A9A93" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#1A1A18' }}>Aucune demande en cours</p>
            <p className="text-xs mb-5" style={{ color: '#9A9A93' }}>Les offres apparaissent ici dès qu&apos;un leaser partenaire répond à votre dossier.</p>
            <Link
              href="/app/nouveau"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#1A1A18', color: '#FAFAF9', borderRadius: 8 }}
            >
              Démarrer un financement
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {available.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#1A1A18' }}>Offres disponibles</h2>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: '#EEF2FF', color: '#3730A3' }}
                  >
                    {available.length} nouvelle{available.length > 1 ? 's' : ''}
                  </span>
                </div>
                <AvailableSection requests={available} />
              </div>
            )}

            {processing.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#1A1A18' }}>En cours de traitement</h2>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: '#FFF7ED', color: '#92400E' }}
                  >
                    {processing.length}
                  </span>
                </div>
                <ProcessingSection requests={processing} />
              </div>
            )}

            {submitted.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#1A1A18' }}>En attente d&apos;offres</h2>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: '#F5F5F4', color: '#9A9A93' }}
                  >
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
