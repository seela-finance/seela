// Briques visuelles partagées par les fiches du back-office (dossier, société).
import Link from 'next/link'

export function eur(n: number | null | undefined, digits = 0) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}

export function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b" style={{ borderColor: '#E5E5E3' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs" style={{ color: '#9A9A93' }}>{label}</dt>
      <dd className="mt-0.5 text-sm break-words" style={{ color: '#0E0E0C' }}>{value ?? '—'}</dd>
    </div>
  )
}

export function Badge({ info }: { info: { label: string; color: string; bg: string; dot: string } }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: info.bg, color: info.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: info.dot }} />
      {info.label}
    </span>
  )
}

/** Bandeau rouge en tête de fiche (société radiée, etc.). */
export function AlertBanner({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm px-3 py-2 rounded-lg font-medium" style={{ background: '#FEF2F2', color: '#991B1B' }}>
      {children}
    </p>
  )
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div className="h-12 flex items-center gap-2 px-6 border-b text-sm" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2 min-w-0">
          {i > 0 && <span style={{ color: '#D1D1CE' }}>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:opacity-70" style={{ color: '#9A9A93' }}>{item.label}</Link>
          ) : (
            <span className="font-medium truncate" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}
