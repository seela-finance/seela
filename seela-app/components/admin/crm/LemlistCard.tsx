import type { LemlistSummary } from '@/lib/crm-lemlist'
import { fmtDate, fmtDateTime } from '@/components/admin/ui'

function YesNo({ value, good }: { value: boolean | null; good?: boolean }) {
  if (value === null) return <span style={{ color: 'var(--ink-3)' }}>—</span>
  const tone = value === !!good ? 'ev-tag ev-tag--ok' : value ? 'ev-tag ev-tag--danger' : 'ev-tag'
  return <span className={tone}>{value ? 'Oui' : 'Non'}</span>
}

const n = (v: number) => <span className="ev-mono" style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v}</span>

/** Bloc fixe : mêmes lignes sur chaque fiche, seules les valeurs changent. */
export default function LemlistCard({ s }: { s: LemlistSummary }) {
  const rows: [string, React.ReactNode][] = [
    ['Emails envoyés', n(s.sent)],
    ['Ouvertures', n(s.opened)],
    ['Clics', n(s.clicked)],
    ['Réponses', n(s.replied)],
    ['Intéressé', <YesNo key="i" value={s.interested} good />],
    ['Email rejeté', <YesNo key="b" value={s.bounced} />],
    ['Désinscrit', <YesNo key="u" value={s.unsubscribed} />],
    ['Bloqué par un anti-spam', <YesNo key="a" value={s.antiSpam} />],
    ['Absent du bureau', s.outOfOffice === false ? <YesNo key="o" value={false} /> : <span className="ev-tag ev-tag--warning">{s.outOfOffice ? `Jusqu’au ${fmtDate(s.outOfOffice)}` : 'Oui'}</span>],
    ['LinkedIn : invitation', <YesNo key="li" value={s.linkedinInvited} good />],
    ['LinkedIn : acceptée', <YesNo key="la" value={s.linkedinAccepted} good />],
    ['LinkedIn : messages / réponses', <span key="lm">{n(s.linkedinMessages)} / {n(s.linkedinReplies)}</span>],
    ['Dernier envoi', s.lastSentAt ? fmtDate(s.lastSentAt) : '—'],
    ['Dernière activité', s.lastActivityAt ? fmtDate(s.lastActivityAt) : '—'],
  ]
  return (
    <section className="ev-card px-5 py-4">
      <h2 className="ev-kicker mb-2">Prospection Lemlist</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y divide-[var(--line)] sm:divide-y-0">
        {rows.map(([k, v]) => (
          <div key={k} className="py-1.5 flex justify-between items-center gap-3 text-sm sm:border-b sm:border-[var(--line)]">
            <dt style={{ color: 'var(--ink-3)' }}>{k}</dt>
            <dd className="text-right" style={{ color: 'var(--ink)' }}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs" style={{ color: 'var(--ink-3)' }}>
        {s.campaigns.length ? `Campagne${s.campaigns.length > 1 ? 's' : ''} : ${s.campaigns.join(' · ')}` : 'Aucune campagne Lemlist.'}
      </p>
      {s.emails.length > 0 && (
        <details className="mt-3">
          <summary className="text-sm cursor-pointer" style={{ color: 'var(--ink-2)' }}>Emails envoyés et reçus ({s.emails.length})</summary>
          <ul className="divide-y divide-[var(--line)] mt-1">
            {s.emails.map((m, i) => {
              const step = typeof m.metadata?.sequenceStep === 'number' ? m.metadata.sequenceStep + 1 : null
              const campaign = typeof m.metadata?.campaignName === 'string' ? m.metadata.campaignName : null
              return (
                <li key={m.id ?? i} className="py-2.5 text-sm">
                  <details>
                    <summary className="cursor-pointer list-none flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={m.event === 'emailsReplied' ? 'ev-tag ev-tag--accent' : 'ev-tag'}>{m.event === 'emailsReplied' ? 'Reçu' : 'Envoyé'}</span>
                        <span className="font-medium" style={{ color: 'var(--ink)' }}>{m.title ?? '(sans objet)'}</span>
                      </span>
                      <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                        {fmtDateTime(m.occurred_at)}{step && m.event === 'emailsSent' ? ` · étape ${step}` : ''}{campaign ? ` · ${campaign}` : ''} · cliquer pour lire
                      </span>
                    </summary>
                    <p className="mt-2 pl-3 whitespace-pre-line" style={{ borderLeft: '2px solid var(--line-strong)', color: 'var(--ink-2)' }}>
                      {m.body ?? 'Contenu pas encore récupéré : cliquez sur « Tout réimporter » dans Ma journée.'}
                    </p>
                  </details>
                </li>
              )
            })}
          </ul>
        </details>
      )}
      {s.lastReply?.text && (
        <blockquote className="mt-3 pl-3 text-sm whitespace-pre-line line-clamp-6" style={{ borderLeft: '2px solid var(--line-strong)', color: 'var(--ink-2)' }}>
          {s.lastReply.text}
          <span className="block mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>Dernière réponse · {fmtDate(s.lastReply.at)}</span>
        </blockquote>
      )}
    </section>
  )
}
