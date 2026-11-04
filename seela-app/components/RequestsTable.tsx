'use client'

import { useRouter } from 'next/navigation'
import { RS, requestStatusInfo, requestDestination } from '@/lib/status'

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

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
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
        const cfg = requestStatusInfo(r.status)
        const selOffer = r.offers?.find(o => o.selected)

        const firstLine = r.line_items?.find(l => l.selected)
        const assetLabel = firstLine?.description
          ? (firstLine.quantity && firstLine.quantity > 1
              ? `${firstLine.description} ×${firstLine.quantity}`
              : firstLine.description)
          : (r.document_type ? r.document_type.charAt(0).toUpperCase() + r.document_type.slice(1) : '—')

        const ref = `C-${r.id.slice(0, 4).toUpperCase()}-${r.id.slice(4, 8).toUpperCase()}`

        const offerCount = r.offers?.length ?? 0
        const destination = requestDestination(r.id, r.status)

        return (
          <tr
            key={r.id}
            onClick={() => router.push(destination)}
            className="cursor-pointer transition-colors"
            style={{ borderBottom: '1px solid var(--line)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <td className="ev-mono px-4 py-3.5 text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {ref}
            </td>
            <td className="px-4 py-3.5 text-sm max-w-xs" style={{ color: 'var(--ink)' }}>
              <span className="block truncate">{assetLabel}</span>
            </td>
            <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ink-3)' }}>
              {selOffer?.leaser_name ?? '—'}
            </td>
            <td className="ev-mono px-4 py-3.5 text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {selOffer ? fmt(selOffer.monthly_payment) : '—'}
            </td>
            <td className="px-4 py-3.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
              {fmtDate(r.created_at)}
            </td>
            <td className="px-4 py-3.5">
              {r.status === RS.offers_available ? (
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/app/offres/${r.id}`) }}
                  className="ev-tag ev-tag--accent cursor-pointer transition-opacity hover:opacity-80"
                >
                  <span className="ev-tag__dot" style={{ background: 'var(--accent)' }} />
                  {offerCount > 0 ? `${offerCount} offre${offerCount > 1 ? 's' : ''} à examiner` : 'Offres disponibles'}
                </button>
              ) : (
                <span className="ev-tag" style={{ background: cfg.bg, color: cfg.color }}>
                  <span className="ev-tag__dot" style={{ background: cfg.dot }} />
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
