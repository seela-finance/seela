'use client'

import { useRouter } from 'next/navigation'

type LineItemRow = { description: string | null; selected: boolean; quantity: number | null }
type OfferRow = { monthly_payment: number; selected: boolean; leaser_name: string; duration_months: number }

type RequestRow = {
  id: string
  document_type: string | null
  total_amount: number | null
  supplier_name?: string | null
  document_number?: string | null
  offers?: OfferRow[]
  line_items?: LineItemRow[]
  status: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  draft:            { label: 'Brouillon',              color: '#9A9A93', bg: '#F5F5F4', dot: '#D1D1CE' },
  submitted:        { label: 'Transmis',               color: '#854D0E', bg: '#FEF9C3', dot: '#D97706' },
  offers_available: { label: 'Offres disponibles',     color: '#3730A3', bg: '#EEF2FF', dot: '#4F46E5' },
  offer_selected:   { label: 'Offre sélectionnée',     color: '#92400E', bg: '#FFF7ED', dot: '#D97706' },
  seela_validated:  { label: 'En cours de validation', color: '#92400E', bg: '#FFF7ED', dot: '#D97706' },
  leaser_confirmed: { label: 'En attente de démarrage', color: '#92400E', bg: '#FFF7ED', dot: '#D97706' },
  active:           { label: 'Actif',                  color: '#166534', bg: '#F0FDF4', dot: '#16A34A' },
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function RequestsTable({ requests }: { requests: RequestRow[] }) {
  const router = useRouter()

  return (
    <tbody>
      {requests.map((r) => {
        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.draft
        const selOffer = r.offers?.find(o => o.selected)

        const firstLine = r.line_items?.find(l => l.selected)
        const assetLabel = firstLine?.description
          ? (firstLine.quantity && firstLine.quantity > 1
              ? `${firstLine.description} ×${firstLine.quantity}`
              : firstLine.description)
          : (r.document_type ? r.document_type.charAt(0).toUpperCase() + r.document_type.slice(1) : '—')

        const ref = `C-${r.id.slice(0, 4).toUpperCase()}-${r.id.slice(4, 8).toUpperCase()}`

        const offerCount = r.offers?.length ?? 0
        const destination = ['offers_available', 'offer_selected', 'seela_validated', 'submitted'].includes(r.status)
          ? `/app/offres/${r.id}`
          : `/app/contrats/${r.id}`

        return (
          <tr
            key={r.id}
            onClick={() => router.push(destination)}
            className="cursor-pointer transition-colors"
            style={{ borderBottom: '1px solid #F5F5F4' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF9')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <td className="px-4 py-3.5 text-sm font-medium" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
              {ref}
            </td>
            <td className="px-4 py-3.5 text-sm max-w-xs" style={{ color: '#0E0E0C' }}>
              <span className="block truncate">{assetLabel}</span>
            </td>
            <td className="px-4 py-3.5 text-sm" style={{ color: '#9A9A93' }}>
              {selOffer?.leaser_name ?? '—'}
            </td>
            <td className="px-4 py-3.5 text-sm font-medium" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>
              {selOffer ? fmt(selOffer.monthly_payment) : '—'}
            </td>
            <td className="px-4 py-3.5 text-sm" style={{ color: '#9A9A93' }}>
              {selOffer ? `— / ${selOffer.duration_months}` : '—'}
            </td>
            <td className="px-4 py-3.5 text-sm" style={{ color: '#9A9A93' }}>—</td>
            <td className="px-4 py-3.5">
              {r.status === 'offers_available' ? (
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/app/offres/${r.id}`) }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: '#EEF2FF', color: '#3730A3' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#4F46E5' }} />
                  {offerCount > 0 ? `${offerCount} offre${offerCount > 1 ? 's' : ''} à examiner` : 'Offres disponibles'}
                </button>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
                  {cfg.label}
                </span>
              )}
            </td>
          </tr>
        )
      })}
    </tbody>
  )
}
