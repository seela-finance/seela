import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { loadLeasers } from '@/lib/leasers-admin'
import { missingConditions, ratesExpired, toPricingLeaser, type LeaserRecord } from '@/lib/leaser-conditions'
import { coveredDurations } from '@/lib/leaser-pricing'
import { eur, fmtDate, Section } from '@/components/admin/ui'
import LeaserSimulator from '@/components/admin/LeaserSimulator'

const HEADERS = ['Leaser', 'Statut', 'Montants', 'Durées', 'Commission incluse', 'Validité du barème', 'À compléter']

export default async function AdminLeasersPage() {
  await requireCapability('manage_leasers')
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>

  let leasers: LeaserRecord[] = []
  let failed = false
  try {
    leasers = await loadLeasers(createAdminClient())
  } catch (err) {
    console.error('[admin] leasers', err)
    failed = true
  }
  const now = new Date()

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Leasers</span>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {failed && <p className="ev-alert ev-alert--danger">Impossible de charger les leasers. Rechargez la page.</p>}

        <Section title="Leasers">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {HEADERS.map(h => <th key={h} className="ev-kicker px-4 py-2 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {leasers.map(l => {
                  const durations = coveredDurations(toPricingLeaser(l).grid)
                  const missing = missingConditions(l)
                  const expired = ratesExpired(l.rates_valid_until, now)
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="px-4 py-3 text-sm font-medium">
                        <Link href={`/admin/leasers/${l.id}`} className="underline-offset-2 hover:underline" style={{ color: 'var(--ink)' }}>{l.name}</Link>
                        <span className="block text-xs font-normal" style={{ color: 'var(--ink-3)' }}>Vu par le client : {l.public_kind ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={l.is_active ? 'ev-tag ev-tag--ok' : 'ev-tag'}>{l.is_active ? 'Actif' : 'Inactif'}</span>
                      </td>
                      <td className="ev-mono px-4 py-3 text-sm whitespace-nowrap">{eur(l.min_amount)} – {eur(l.max_amount)}</td>
                      <td className="ev-mono px-4 py-3 text-sm whitespace-nowrap">
                        {durations.length ? `${durations[0]} à ${durations[durations.length - 1]} mois` : <span className="ev-tag ev-tag--warning">Aucun barème</span>}
                        {durations.length > 0 && <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>{durations.length} durées</span>}
                      </td>
                      <td className="ev-mono px-4 py-3 text-sm">{l.commission_included_pct == null ? '—' : `${Number(l.commission_included_pct).toLocaleString('fr-FR')} %`}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {l.rates_valid_until
                          ? <span className={expired ? 'ev-tag ev-tag--danger' : undefined}>{expired ? 'Expiré le ' : ''}{fmtDate(l.rates_valid_until)}</span>
                          : <span className="ev-tag ev-tag--warning">À compléter</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {missing.length === 0
                          ? <span style={{ color: 'var(--ink-3)' }}>Complet</span>
                          : <span className="ev-tag ev-tag--warning" title={missing.map(m => m.label).join(', ')}>{missing.length} champ{missing.length > 1 ? 's' : ''}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {leasers.length === 0 && !failed && <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Aucun leaser.</p>}
          </div>
        </Section>

        <Section title="Simulateur : tous les leasers">
          <LeaserSimulator leasers={leasers.map(toPricingLeaser)} />
        </Section>
      </div>
    </div>
  )
}
