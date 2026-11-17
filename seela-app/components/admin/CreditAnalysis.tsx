import { Badge, Section, fmtDateTime } from '@/components/admin/ui'
import { indicatorRows, opinionInfo, type CreditFlag } from '@/lib/credit-analysis'
import type { CreditAnalysisRecord } from '@/lib/credit-analyst'
import CreditAnalysisActions from '@/components/admin/CreditAnalysisActions'

type Props = {
  requestId: string
  record: CreditAnalysisRecord | null
  /** Le membre peut lancer ou relancer l'analyse (droit decide_requests) */
  canRun: boolean
  /** Message si la lecture de l'analyse a échoué */
  error?: string | null
}

const FLAG_CLASS: Record<CreditFlag['severity'], string> = { danger: 'ev-alert ev-alert--danger', warning: 'ev-alert ev-alert--warning', info: 'ev-alert' }

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="ev-kicker">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--ink)' }}>
            <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--line-strong)' }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Fiche « Analyse crédit » du dossier : avis, synthèse, alertes, indicateurs, listes, placement. */
export default function CreditAnalysis({ requestId, record, canRun, error }: Props) {
  const right = record ? (
    <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-3)' }}>
      <span className="hidden sm:inline">{fmtDateTime(record.created_at)}</span>
      <Badge info={opinionInfo(record.avis)} />
    </span>
  ) : undefined

  return (
    <Section title="Analyse crédit" right={right}>
      {error && <p className="ev-alert ev-alert--danger m-4">{error}</p>}
      {!record ? (
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {error ? null : 'Aucune analyse pour l’instant. Elle est lancée automatiquement à la soumission ; en cas d’échec, relancez-la ici.'}
          </p>
          {canRun && <CreditAnalysisActions requestId={requestId} hasAnalysis={false} />}
        </div>
      ) : (
        <div className="px-4 py-4 space-y-5">
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--ink)' }}>{record.analysis.synthese}</p>

          {record.indicators.flags.filter(f => f.severity !== 'info').length > 0 && (
            <ul className="space-y-1.5">
              {record.indicators.flags.filter(f => f.severity !== 'info').map(f => (
                <li key={f.code} className={`${FLAG_CLASS[f.severity]} text-sm`}>{f.label}</li>
              ))}
            </ul>
          )}

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
            {indicatorRows(record.indicators).map(r => (
              <div key={r.label} className="min-w-0">
                <dt className="text-xs" style={{ color: 'var(--ink-3)' }}>{r.label}</dt>
                <dd className="ev-mono mt-0.5 text-sm break-words" style={{ color: 'var(--ink)' }}>{r.value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 md:grid-cols-2">
            <List title="Points forts" items={record.analysis.points_forts} />
            <List title="Points de vigilance" items={record.analysis.points_vigilance} />
            <List title="Questions à poser au client" items={record.analysis.questions_client} />
            <List title="Pièces à demander" items={record.analysis.pieces_a_demander} />
          </div>

          {(record.analysis.placement.financeur_recommande || record.analysis.placement.strategie) && (
            <div>
              <p className="ev-kicker">Placement</p>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--ink)' }}>
                {record.analysis.placement.financeur_recommande && <strong>{record.analysis.placement.financeur_recommande} · </strong>}
                {record.analysis.placement.strategie}
              </p>
            </div>
          )}

          {record.indicators.flags.some(f => f.severity === 'info') && (
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              {record.indicators.flags.filter(f => f.severity === 'info').map(f => f.label).join(' · ')}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Générée par IA ({record.model}, confiance {record.analysis.confiance}) à partir du dossier et du registre des entreprises. À vérifier par un conseiller.
            </p>
            {canRun && <CreditAnalysisActions requestId={requestId} hasAnalysis />}
          </div>
        </div>
      )}
    </Section>
  )
}
