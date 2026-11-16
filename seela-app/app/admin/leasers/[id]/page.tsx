import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/admin-request-detail'
import { loadLeaser } from '@/lib/leasers-admin'
import { missingConditions, ratesExpired, toPricingLeaser } from '@/lib/leaser-conditions'
import { Breadcrumb, fmtDate, Section } from '@/components/admin/ui'
import LeaserSimulator from '@/components/admin/LeaserSimulator'
import ConditionsForm from '@/components/admin/leasers/ConditionsForm'
import RateGridEditor from '@/components/admin/leasers/RateGridEditor'
import EligibilityEditor from '@/components/admin/leasers/EligibilityEditor'

export default async function AdminLeaserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>

  const leaser = await loadLeaser(createAdminClient(), id)
  if (!leaser) notFound()
  const missing = missingConditions(leaser)
  const pricing = toPricingLeaser(leaser)
  const expired = ratesExpired(leaser.rates_valid_until)

  return (
    <div>
      <Breadcrumb items={[{ label: 'Leasers', href: '/admin/leasers' }, { label: leaser.name }]} />

      <div className="px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="ev-display text-2xl" style={{ color: 'var(--ink)' }}>{leaser.name}</h1>
          <span className={leaser.is_active ? 'ev-tag ev-tag--ok' : 'ev-tag'}>{leaser.is_active ? 'Actif' : 'Inactif'}</span>
          {expired && <span className="ev-tag ev-tag--danger">Barème expiré le {fmtDate(leaser.rates_valid_until)}</span>}
        </div>

        {missing.length > 0 && (
          <p className="ev-alert ev-alert--warning">
            À compléter : {missing.map(f => f.label.toLowerCase()).join(', ')}.
          </p>
        )}

        <Section title="Simulateur">
          <LeaserSimulator leasers={[pricing]} single />
        </Section>

        <Section title="Barème" right={<span className="text-xs" style={{ color: 'var(--ink-3)' }}>Coefficient mensuel, % du montant HT</span>}>
          <RateGridEditor leaserId={leaser.id} grid={pricing.grid} />
        </Section>

        <Section title="Éligibilité du matériel">
          <EligibilityEditor leaserId={leaser.id} rows={pricing.eligibility} />
        </Section>

        <Section title="Conditions">
          <ConditionsForm leaser={leaser} missing={missing.map(f => String(f.key))} />
        </Section>
      </div>
    </div>
  )
}
