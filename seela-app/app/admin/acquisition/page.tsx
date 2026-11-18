import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import {
  PERIOD_LABEL, PERIODS, parsePeriod, periodStart, summarizeAcquisition, totalRow,
  type AcquisitionCompany, type AcquisitionRequest, type ChannelRow,
} from '@/lib/acquisition'
import { eur, Section } from '@/components/admin/ui'

const HEADERS = ['Canal', 'Leads', 'Avec dossier', 'Dossiers', 'Transmis', 'Acceptés', 'Montant financé', 'Conversion']

function Cells({ row, strong = false }: { row: ChannelRow; strong?: boolean }) {
  const cls = `ev-mono px-4 py-2.5 text-sm whitespace-nowrap ${strong ? 'font-semibold' : ''}`
  return (
    <>
      <td className={cls}>{row.leads}</td>
      <td className={cls}>{row.withRequest}</td>
      <td className={cls}>{row.requests}</td>
      <td className={cls}>{row.transmitted}</td>
      <td className={cls}>{row.accepted}</td>
      <td className={cls}>{eur(row.financed)}</td>
      <td className={cls}>{row.conversion == null ? '—' : `${row.conversion.toLocaleString('fr-FR')} %`}</td>
    </>
  )
}

// Quel canal apporte des leads, des dossiers et des contrats. Le trafic (visites, pages) est dans PostHog → Web analytics.
export default async function AdminAcquisitionPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  await requireCapability('view')
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>

  const period = parsePeriod((await searchParams).periode)
  let rows: ChannelRow[] = []
  let failed = false
  try {
    const db = createAdminClient()
    const since = periodStart(period)
    let companiesQuery = db.from('companies')
      .select('id, source, lead_channel, attribution_channel, partner_enabled, created_at')
      .limit(20000)
    if (since) companiesQuery = companiesQuery.gte('created_at', since)
    const [{ data: companies, error: cErr }, { data: requests, error: rErr }] = await Promise.all([
      companiesQuery,
      db.from('financing_requests').select('company_id, status, total_amount').not('company_id', 'is', null).neq('status', 'draft').limit(20000),
    ])
    if (cErr || rErr) throw cErr ?? rErr
    rows = summarizeAcquisition((companies ?? []) as AcquisitionCompany[], (requests ?? []) as AcquisitionRequest[], since)
  } catch (err) {
    console.error('[admin] acquisition', err)
    failed = true
  }
  const total = totalRow(rows)

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Acquisition</span>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-4">
        {failed && <p className="ev-alert ev-alert--danger">Impossible de charger l’acquisition. Rechargez la page.</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm max-w-2xl" style={{ color: 'var(--ink-3)' }}>
            Leads arrivés sur la période, par canal, et ce qu’ils sont devenus. Le canal vient de la première visite (lien tagué,
            site référent) ou de l’origine dans le CRM. Le trafic du site est dans PostHog, onglet Web analytics.
          </p>
          <nav className="flex flex-wrap gap-1.5" aria-label="Période">
            {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map(key => (
              <Link
                key={key}
                href={`/admin/acquisition?periode=${key}`}
                aria-current={key === period ? 'page' : undefined}
                className={key === period ? 'ev-btn ev-btn--primary ev-btn--sm' : 'ev-btn ev-btn--ghost ev-btn--sm'}
              >
                {PERIOD_LABEL[key]}
              </Link>
            ))}
          </nav>
        </div>

        <Section title={`Canaux · ${PERIOD_LABEL[period].toLowerCase()}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {HEADERS.map(h => <th key={h} className="ev-kicker px-4 py-2 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.flatMap(row => [
                  <tr key={row.channel} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="px-4 py-2.5 text-sm font-medium" style={{ color: 'var(--ink)' }}>{row.channel}</td>
                    <Cells row={row} />
                  </tr>,
                  ...row.campaigns.map(c => (
                    <tr key={`${row.channel}/${c.channel}`} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="pl-8 pr-4 py-2 text-sm" style={{ color: 'var(--ink-2)' }}>{c.channel}</td>
                      <Cells row={c} />
                    </tr>
                  )),
                ])}
                {rows.length > 0 && (
                  <tr style={{ background: 'var(--raised)' }}>
                    <td className="px-4 py-2.5 text-sm font-semibold" style={{ color: 'var(--ink)' }}>Total</td>
                    <Cells row={total} strong />
                  </tr>
                )}
              </tbody>
            </table>
            {rows.length === 0 && !failed && (
              <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Aucun lead sur la période.</p>
            )}
          </div>
        </Section>

        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Lead : société créée dans le CRM sur la période (hors distributeurs partenaires et comptes de test). Transmis : dossier envoyé à
          un financeur. Acceptés : dossier accepté par le financeur ou contrat actif. Conversion : part des leads avec au moins un dossier accepté.
          « Non renseigné » : leads antérieurs au suivi de la source (18/11/2026) ou saisis à la main.
        </p>
      </div>
    </div>
  )
}
