import { requireCapability } from '@/lib/admin'
import { ROLE_LABEL } from '@/lib/admin-roles'
import { listMembers } from '@/lib/admin-team-store'
import type { TeamMember } from '@/lib/admin-team'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { fmtDate, Section } from '@/components/admin/ui'
import { AddMemberForm, MemberActions } from '@/components/admin/TeamForms'

export default async function AdminTeamPage() {
  const admin = await requireCapability('manage_team')
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>

  let members: TeamMember[] = []
  let failed = false
  try {
    members = await listMembers(createAdminClient())
  } catch (err) {
    console.error('[admin] équipe', err)
    failed = true
  }

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Équipe</span>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {failed && <p className="ev-alert ev-alert--danger">Impossible de charger l’équipe. Rechargez la page.</p>}

        <Section title="Membres du back-office">
          <ul className="divide-y divide-[var(--line)]">
            {members.map(m => (
              <li key={m.userId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {m.name}
                    {m.userId === admin.userId && <span className="text-xs font-normal ml-2" style={{ color: 'var(--ink-3)' }}>(vous)</span>}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{m.email ?? '—'} · depuis le {fmtDate(m.createdAt)}</p>
                </div>
                <span className={m.role === 'admin' ? 'ev-tag ev-tag--dark' : 'ev-tag'}>{ROLE_LABEL[m.role]}</span>
                {m.userId !== admin.userId && <MemberActions userId={m.userId} name={m.name} role={m.role} />}
              </li>
            ))}
          </ul>
          {members.length === 0 && !failed && <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Aucun membre.</p>}
        </Section>

        <Section title="Ajouter un membre">
          <AddMemberForm />
        </Section>
      </div>
    </div>
  )
}
