import type { MailSummary } from '@/lib/crm-mail'
import { fmtDate, fmtDateTime } from '@/components/admin/ui'

/** Bloc fixe « Emails » : mêmes lignes sur chaque fiche, puis les derniers échanges à déplier. */
export default function EmailCard({ s, names }: { s: MailSummary; names: Map<string, string> }) {
  const n = (v: number) => <span className="ev-mono" style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v}</span>
  const rows: [string, React.ReactNode][] = [
    ['Emails envoyés', n(s.sent)],
    ['Emails reçus', n(s.received)],
    ['Dernier échange', s.lastExchangeAt ? fmtDate(s.lastExchangeAt) : '—'],
    ['A répondu à mon dernier email', s.repliedToLast === null
      ? <span style={{ color: 'var(--ink-3)' }}>—</span>
      : <span className={s.repliedToLast ? 'ev-tag ev-tag--ok' : 'ev-tag ev-tag--warning'}>{s.repliedToLast ? 'Oui' : 'Pas encore'}</span>],
  ]
  return (
    <section className="ev-card px-5 py-4">
      <h2 className="ev-kicker mb-2">Emails</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y divide-[var(--line)] sm:divide-y-0">
        {rows.map(([k, v]) => (
          <div key={k} className="py-1.5 flex justify-between items-center gap-3 text-sm sm:border-b sm:border-[var(--line)]">
            <dt style={{ color: 'var(--ink-3)' }}>{k}</dt>
            <dd className="text-right" style={{ color: 'var(--ink)' }}>{v}</dd>
          </div>
        ))}
      </dl>
      {s.recent.length > 0 ? (
        <details className="mt-3">
          <summary className="text-sm cursor-pointer" style={{ color: 'var(--ink-2)' }}>Derniers échanges ({s.recent.length})</summary>
          <ul className="divide-y divide-[var(--line)] mt-1">
            {s.recent.map(m => {
              const mailbox = typeof m.metadata?.mailbox === 'string' ? m.metadata.mailbox : null
              return (
                <li key={m.id} className="py-2.5 text-sm flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={m.event === 'sent' ? 'ev-tag' : 'ev-tag ev-tag--accent'}>{m.event === 'sent' ? 'Envoyé' : 'Reçu'}</span>
                    <span className="font-medium" style={{ color: 'var(--ink)' }}>{m.title ?? '(sans objet)'}</span>
                  </span>
                  {m.body && <span className="line-clamp-3" style={{ color: 'var(--ink-2)' }}>{m.body}</span>}
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{fmtDateTime(m.occurred_at)}{mailbox ? ` · boîte de ${names.get(mailbox) ?? mailbox}` : ''}</span>
                </li>
              )
            })}
          </ul>
        </details>
      ) : (
        <p className="mt-3 text-xs" style={{ color: 'var(--ink-3)' }}>Aucun email échangé avec cette fiche dans les boîtes connectées.</p>
      )}
    </section>
  )
}
