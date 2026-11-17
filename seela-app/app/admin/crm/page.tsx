import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { ACTIVITY_LABEL, PRIORITY_LABEL, type ActivityType, type Priority } from '@/lib/crm-activities'
import { groupTasks, TASK_BUCKET_LABEL, type TaskBucket } from '@/lib/crm-deals'
import { fmtDate, fmtDateTime } from '@/components/admin/ui'
import { CompleteTaskButton } from '@/components/admin/crm/FicheForms'

type Task = { id: string; title: string; due_date: string | null; priority: string; company_id: string | null; companies: { name: string } | null }
type Mention = { crm_activities: { id: string; type: string; body: string | null; occurred_at: string; author_id: string | null; company_id: string | null; companies: { name: string } | null } | null }

const BUCKET_TAG: Record<TaskBucket, string> = { retard: 'ev-tag ev-tag--danger', aujourdhui: 'ev-tag ev-tag--warning', a_venir: 'ev-tag', sans_date: 'ev-tag' }

export default async function CrmHomePage() {
  const admin = await requireCapability('crm')
  const configured = isServiceRoleConfigured()
  const db = configured ? createAdminClient() : null
  const [tasksRes, mentionsRes, adminsRes] = db
    ? await Promise.all([
      db.from('crm_tasks').select('id, title, due_date, priority, company_id, companies ( name )').eq('assignee_id', admin.userId).is('done_at', null).limit(300),
      db.from('crm_mentions').select('crm_activities ( id, type, body, occurred_at, author_id, company_id, companies ( name ) )').eq('user_id', admin.userId).limit(50),
      db.from('admins').select('user_id, name'),
    ])
    : [{ data: null, error: null }, { data: null, error: null }, { data: null, error: null }]

  const today = new Date().toISOString().slice(0, 10)
  const buckets = groupTasks((tasksRes.data ?? []) as unknown as Task[], today)
  const names = new Map(((adminsRes.data ?? []) as { user_id: string; name: string }[]).map(a => [a.user_id, a.name]))
  const mentions = ((mentionsRes.data ?? []) as unknown as Mention[])
    .map(m => m.crm_activities).filter((a): a is NonNullable<Mention['crm_activities']> => !!a)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 15)
  const total = Object.values(buckets).reduce((n, l) => n + l.length, 0)

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Ma journée</span>
      </div>
      {!configured && <p className="ev-alert ev-alert--danger mx-6 mt-4">{SERVICE_ROLE_MISSING_MESSAGE}</p>}

      <div className="px-6 py-5 flex flex-wrap gap-4 items-start">
        <section className="ev-card px-5 py-4 min-w-0" style={{ flex: '2 1 460px' }}>
          <h2 className="ev-kicker mb-2">Mes tâches ({total})</h2>
          {total === 0 && <p className="py-6 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Rien à faire. Les tâches se créent depuis une fiche société.</p>}
          {(Object.keys(buckets) as TaskBucket[]).filter(k => buckets[k].length).map(k => (
            <div key={k} className="mt-3">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>{TASK_BUCKET_LABEL[k]} · {buckets[k].length}</p>
              <ul className="divide-y divide-[var(--line)]">
                {buckets[k].map(t => (
                  <li key={t.id} className="py-2.5 flex items-center gap-3 text-sm">
                    <span className="flex-1 min-w-0">
                      <span className="block" style={{ color: 'var(--ink)' }}>{t.title}</span>
                      {t.company_id && <Link href={`/admin/crm/societes/${t.company_id}`} className="text-xs hover:underline" style={{ color: 'var(--ink-3)' }}>{t.companies?.name ?? 'Société'}</Link>}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{PRIORITY_LABEL[t.priority as Priority] ?? t.priority}</span>
                    {t.due_date && <span className={BUCKET_TAG[k]}>{fmtDate(t.due_date)}</span>}
                    {t.company_id && <CompleteTaskButton companyId={t.company_id} taskId={t.id} />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="ev-card px-5 py-4 min-w-0" style={{ flex: '1 1 300px' }}>
          <h2 className="ev-kicker mb-2">On vous a mentionné</h2>
          {mentions.length === 0 && <p className="py-6 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Aucune mention.</p>}
          <ul className="divide-y divide-[var(--line)]">
            {mentions.map(a => (
              <li key={a.id} className="py-2.5 text-sm flex flex-col gap-0.5">
                <span style={{ color: 'var(--ink)' }}>
                  <span className="font-medium">{names.get(a.author_id ?? '') ?? 'Quelqu’un'}</span> · {ACTIVITY_LABEL[a.type as ActivityType] ?? a.type}
                  {a.company_id && <> sur <Link href={`/admin/crm/societes/${a.company_id}`} className="underline">{a.companies?.name ?? 'une société'}</Link></>}
                </span>
                {a.body && <span className="line-clamp-2" style={{ color: 'var(--ink-2)' }}>{a.body}</span>}
                <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{fmtDateTime(a.occurred_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
