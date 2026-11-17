import Link from 'next/link'
import { after } from 'next/server'
import { requireCapability } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { ACTIVITY_LABEL, PRIORITY_LABEL, type ActivityType, type Priority } from '@/lib/crm-activities'
import { groupTasks, TASK_BUCKET_LABEL, type TaskBucket } from '@/lib/crm-deals'
import { fmtDate, fmtDateTime } from '@/components/admin/ui'
import { CompleteTaskButton } from '@/components/admin/crm/FicheForms'
import { LemlistSyncButton, MailboxActions, MailboxConnectForm } from '@/components/admin/crm/CrmForms'
import { syncMailbox, type Mailbox } from '@/lib/mailbox-sync'
import { isSecretBoxConfigured } from '@/lib/secret-box'
import { isLemlistConfigured, syncLemlist } from '@/lib/lemlist-sync'
import { syncIsDue } from '@/lib/crm-lemlist'

type SyncState = { last_run_at: string | null; last_error: string | null; last_result: { imported: number } | null } | null
type Task = { id: string; title: string; due_date: string | null; priority: string; company_id: string | null; companies: { name: string } | null }
type Mention = { crm_activities: { id: string; type: string; body: string | null; occurred_at: string; author_id: string | null; company_id: string | null; companies: { name: string } | null } | null }

const BUCKET_TAG: Record<TaskBucket, string> = { retard: 'ev-tag ev-tag--danger', aujourdhui: 'ev-tag ev-tag--warning', a_venir: 'ev-tag', sans_date: 'ev-tag' }

export default async function CrmHomePage() {
  const admin = await requireCapability('crm')
  const configured = isServiceRoleConfigured()
  const db = configured ? createAdminClient() : null
  const none = { data: null, error: null }
  // Toutes les lectures partent en même temps (chaque aller-retour vers la base coûte)
  const [syncRes, mailboxRes, tasksRes, mentionsRes, adminsRes] = db
    ? await Promise.all([
      db.from('crm_sync_state').select('last_run_at, last_error, last_result').eq('source', 'lemlist').maybeSingle(),
      db.from('crm_mailboxes').select('*').eq('user_id', admin.userId).maybeSingle(),
      db.from('crm_tasks').select('id, title, due_date, priority, company_id, companies ( name )').eq('assignee_id', admin.userId).is('done_at', null).limit(300),
      db.from('crm_mentions').select('crm_activities ( id, type, body, occurred_at, author_id, company_id, companies ( name ) )').eq('user_id', admin.userId).limit(50),
      db.from('admins').select('user_id, name'),
    ])
    : [none, none, none, none, none]
  const lemlist = syncRes.data as SyncState
  // Synchro Lemlist en arrière-plan, après l'affichage, au plus toutes les 15 min (l'historique complet se lance au bouton)
  if (db && isLemlistConfigured() && lemlist?.last_run_at && syncIsDue(lemlist.last_run_at, new Date())) {
    after(() => syncLemlist(db).catch(err => console.error('[lemlist auto]', err)))
  }
  const mailbox = mailboxRes.data as (Mailbox & { last_sync_at: string | null; last_error: string | null; last_result: { imported: number } | null }) | null
  if (db && mailbox && syncIsDue(mailbox.last_sync_at, new Date())) {
    after(() => syncMailbox(db, mailbox).catch(err => console.error('[mailbox auto]', err)))
  }

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

        <div className="flex flex-col gap-4 min-w-0" style={{ flex: '1 1 300px' }}>
        <section className="ev-card px-5 py-4">
          <h2 className="ev-kicker mb-2">Lemlist</h2>
          {!isLemlistConfigured()
            ? <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Clé Lemlist absente : ajoutez LEMLIST_API_KEY aux réglages du serveur.</p>
            : (
              <div className="flex flex-col gap-2 text-sm">
                <p style={{ color: 'var(--ink-2)' }}>
                  {lemlist?.last_run_at
                    ? <>Dernière synchronisation {fmtDateTime(lemlist.last_run_at)}{lemlist.last_result ? ` · ${lemlist.last_result.imported} importé(s)` : ''}. Automatique toutes les 15 min quand le CRM est ouvert.</>
                    : 'Jamais synchronisé. Importez l’historique de vos campagnes : envois, réponses, leads intéressés et LinkedIn arrivent sur les fiches.'}
                </p>
                {lemlist?.last_error && <p className="ev-alert ev-alert--danger">Dernière erreur : {lemlist.last_error}</p>}
                <LemlistSyncButton neverSynced={!lemlist?.last_run_at} />
              </div>
            )}
        </section>
        <section className="ev-card px-5 py-4">
          <h2 className="ev-kicker mb-2">Ma boîte mail</h2>
          {!isSecretBoxConfigured()
            ? <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Clé de chiffrement absente : ajoutez EMAIL_ENCRYPTION_KEY aux réglages du serveur.</p>
            : mailbox
              ? (
                <div className="flex flex-col gap-2 text-sm">
                  <p style={{ color: 'var(--ink-2)' }}>
                    <span className="font-medium" style={{ color: 'var(--ink)' }}>{mailbox.email}</span>
                    {' · '}{mailbox.last_sync_at ? `synchronisée ${fmtDateTime(mailbox.last_sync_at)}${mailbox.last_result ? `, ${mailbox.last_result.imported} échange(s)` : ''}` : 'import en cours…'}
                    . Automatique toutes les 15 min quand le CRM est ouvert.
                  </p>
                  {mailbox.last_error && <p className="ev-alert ev-alert--danger">Dernière erreur : {mailbox.last_error}</p>}
                  <MailboxActions />
                </div>
              )
              : <MailboxConnectForm defaultEmail={admin.email ?? ''} />}
        </section>
        <section className="ev-card px-5 py-4">
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
    </div>
  )
}
