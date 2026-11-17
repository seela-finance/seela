import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/admin'
import { isUuid } from '@/lib/admin-request-detail'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLifecycleStage, LIFECYCLE_LABEL } from '@/lib/crm-companies'
import {
  buildTimeline, daysUntil, OUTCOME_LABEL, PRIORITY_LABEL, type ActivityRow, type AdminEventRow, type Priority,
} from '@/lib/crm-activities'
import { CLOSED_DEAL_STAGES, isDealStage } from '@/lib/crm-deals'
import { eur, fmtDate, fmtDateTime } from '@/components/admin/ui'
import { DealStageSelect, NewDealButton } from '@/components/admin/crm/CrmForms'
import LemlistCard from '@/components/admin/crm/LemlistCard'
import PartnerCard from '@/components/admin/partner/PartnerCard'
import { can } from '@/lib/admin-roles'
import { LeadStatusControl } from '@/components/admin/crm/PrepipeForms'
import { LEAD_SIGNAL_LABEL } from '@/lib/crm-prepipe'
import CallButton from '@/components/admin/crm/CallButton'
import EmailCard from '@/components/admin/crm/EmailCard'
import { summarizeMail, type MailRow } from '@/lib/crm-mail'
import { summarizeLemlist, type LemlistRow } from '@/lib/crm-lemlist'
import {
  ActivityComposer, AddContactForm, AddTaskForm, CompleteTaskButton, PropertiesForm, type CompanyValues,
} from '@/components/admin/crm/FicheForms'

type Company = {
  id: string; name: string; siren: string | null; domain: string | null; lifecycle_stage: string; sector: string | null
  legal_form: string | null; naf_code: string | null; creation_year: number | null; headcount_bracket: string | null
  revenue_declared: number | null; source: string | null; signal: string | null; website: string | null; owner_id: string | null
  seela_score: number | null; seela_score_grade: string | null; created_at: string
  lemlist_industry: string | null; location: string | null; description: string | null; linkedin_url: string | null
  partner_enabled?: boolean | null
  lead_status: string | null; lead_channel: string | null; lead_signal: string | null; lead_entered_at: string | null; lead_exit_reason: string | null; lead_next_date: string | null
}
type Contact = { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; job_title: string | null; persona: string | null; user_id: string | null }
type Request = { id: string; status: string | null; total_amount: number | null; duration_months: number | null; created_at: string }
type Deal = { id: string; name: string; stage: string; amount: number | null; next_action: string | null; next_action_date: string | null }
type Task = { id: string; title: string; due_date: string | null; priority: string; assignee_id: string | null }

const STAGE_TAG: Record<string, string> = { prospect: 'ev-tag', client: 'ev-tag ev-tag--ok', partenaire: 'ev-tag ev-tag--accent', exclu: 'ev-tag ev-tag--danger' }
const OUTCOME_TAG: Record<string, string> = { rdv_pris: 'ev-tag ev-tag--ok', interesse: 'ev-tag ev-tag--ok', pas_interesse: 'ev-tag ev-tag--danger', a_rappeler: 'ev-tag ev-tag--warning' }

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="ev-card px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <h2 className="ev-kicker pt-1">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

const contactName = (p: Contact) => [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Sans nom'

export default async function CrmCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireCapability('crm')
  const { id } = await params
  if (!isUuid(id)) notFound()

  const db = createAdminClient()
  const [companyRes, contactsRes, requestsRes, adminsRes, tasksRes, activitiesRes, lemlistRes, mailRes, dealsRes, boxesRes] = await Promise.all([
    db.from('companies').select('*').eq('id', id).maybeSingle(),
    db.from('contacts').select('id, first_name, last_name, email, phone, job_title, persona, user_id').eq('company_id', id).order('created_at'),
    db.from('financing_requests').select('id, status, total_amount, duration_months, created_at').eq('company_id', id).order('created_at', { ascending: false }),
    db.from('admins').select('user_id, name').order('name'),
    db.from('crm_tasks').select('id, title, due_date, priority, assignee_id').eq('company_id', id).is('done_at', null).order('due_date', { nullsFirst: false }),
    db.from('crm_activities').select('id, type, call_outcome, body, occurred_at, author_id, contact_id, source, event, title, summary, crm_mentions ( user_id )').eq('company_id', id).not('source', 'in', '(lemlist,mailbox)').order('occurred_at', { ascending: false }).limit(100),
    db.from('crm_activities').select('id, event, occurred_at, title, body, metadata').eq('company_id', id).eq('source', 'lemlist').limit(5000),
    db.from('crm_activities').select('id, event, occurred_at, title, body, metadata').eq('company_id', id).eq('source', 'mailbox').order('occurred_at', { ascending: false }).limit(500),
    db.from('crm_deals').select('id, name, stage, amount, next_action, next_action_date').eq('company_id', id).order('updated_at', { ascending: false }),
    db.from('crm_mailboxes').select('email, user_id'),
  ])
  const c = companyRes.data as Company | null
  if (!c) notFound()
  const contacts = (contactsRes.data ?? []) as Contact[]
  const requests = (requestsRes.data ?? []) as Request[]
  const tasks = (tasksRes.data ?? []) as Task[]
  const deals = (dealsRes.data ?? []) as Deal[]
  const team = ((adminsRes.data ?? []) as { user_id: string; name: string }[]).map(a => ({ id: a.user_id, name: a.name }))
  const mailboxNames = new Map(((boxesRes.data ?? []) as { email: string; user_id: string }[]).map(b => [b.email, team.find(m => m.id === b.user_id)?.name ?? b.email]))
  const nameOf = (uid: string | null) => team.find(m => m.id === uid)?.name ?? null

  // Journal admin lié : dossiers de la société, comptes de ses contacts, actions CRM sur la fiche
  const userIds = contacts.map(p => p.user_id).filter((v): v is string => !!v)
  const orFilters = [
    `after->>company_id.eq.${id}`,
    requests.length && `request_id.in.(${requests.map(r => r.id).join(',')})`,
    userIds.length && `profile_id.in.(${userIds.join(',')})`,
  ].filter(Boolean).join(',')
  const { data: events } = await db.from('admin_events').select('id, admin_id, action, note, created_at').or(orFilters).order('created_at', { ascending: false }).limit(100)
  const timeline = buildTimeline((activitiesRes.data ?? []) as ActivityRow[], (events ?? []) as AdminEventRow[])

  const stage = isLifecycleStage(c.lifecycle_stage) ? c.lifecycle_stage : 'prospect'
  const today = new Date().toISOString().slice(0, 10)
  const s = (v: string | number | null) => (v == null ? '' : String(v))
  const values: CompanyValues = {
    name: c.name, siren: s(c.siren), domain: s(c.domain), sector: s(c.sector), lifecycle_stage: stage, legal_form: s(c.legal_form),
    naf_code: s(c.naf_code), creation_year: s(c.creation_year), headcount_bracket: s(c.headcount_bracket), source: s(c.source),
    signal: s(c.signal), website: s(c.website), owner_id: s(c.owner_id),
  }
  const props: [string, React.ReactNode][] = [
    ['SIREN', c.siren ? <span className="ev-mono">{c.siren}</span> : null],
    ['Domaine', c.domain],
    ['Secteur', c.sector],
    ['Secteur (Lemlist)', c.lemlist_industry],
    ['Localisation', c.location],
    ['Forme juridique', c.legal_form],
    ['Code NAF', c.naf_code],
    ['Création', c.creation_year],
    ['Effectif', c.headcount_bracket],
    ['CA déclaré', c.revenue_declared != null ? eur(Number(c.revenue_declared)) : null],
    ['Source', c.source],
    ['Signal', c.signal],
    ['Site web', c.website],
    ['LinkedIn', c.linkedin_url ? <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="underline">Page entreprise</a> : null],
    ['Propriétaire', nameOf(c.owner_id)],
    ['Créée le', fmtDate(c.created_at)],
  ]

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink-3)' }}>
        <Link href="/admin/crm/societes" className="hover:underline">Sociétés</Link>
        <span className="mx-2">›</span>
        <span style={{ color: 'var(--ink)' }}>{c.name}</span>
      </div>

      <div className="px-6 py-5 flex flex-wrap gap-4 items-start">
        <div className="flex flex-col gap-4" style={{ flex: '1 1 280px', maxWidth: 340 }}>
          <section className="ev-card p-5 flex flex-col gap-3">
            <h1 className="ev-display text-2xl">{c.name}</h1>
            {c.domain && <p className="text-sm -mt-2" style={{ color: 'var(--ink-3)' }}>{c.domain}</p>}
            {c.description && (
              <details className="text-sm" style={{ color: 'var(--ink-2)' }}>
                <summary className="cursor-pointer text-xs" style={{ color: 'var(--ink-3)' }}>Description de l’entreprise</summary>
                <p className="mt-1 whitespace-pre-line">{c.description}</p>
              </details>
            )}
            <div className="flex flex-wrap gap-1.5">
              <span className={STAGE_TAG[stage]}>{LIFECYCLE_LABEL[stage]}</span>
              {c.seela_score_grade && <span className="ev-tag">Score {c.seela_score_grade} · {c.seela_score}</span>}
            </div>
          </section>
          <Card title="Prospection">
            <LeadStatusControl key={`${c.lead_status}-${c.lead_channel}`} companyId={c.id} status={c.lead_status} channel={c.lead_channel} />
            {c.lead_status && (
              <p className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>
                {[c.lead_signal && `Entrée : ${LEAD_SIGNAL_LABEL[c.lead_signal] ?? c.lead_signal}`, c.lead_entered_at && `le ${fmtDate(c.lead_entered_at)}`,
                  c.lead_status === 'disqualifie' && c.lead_exit_reason && `Raison : ${c.lead_exit_reason}`,
                  c.lead_status === 'pas_maintenant' && c.lead_next_date && `Relance le ${fmtDate(c.lead_next_date)}`].filter(Boolean).join(' · ')}
              </p>
            )}
          </Card>
          <Card title="À propos de cette société">
            <dl className="divide-y divide-[var(--line)] mb-3">
              {props.map(([k, v]) => (
                <div key={k} className="py-2 flex justify-between gap-3 text-sm">
                  <dt style={{ color: 'var(--ink-3)' }}>{k}</dt>
                  <dd className="text-right break-all" style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <PropertiesForm companyId={c.id} values={values} team={team} />
          </Card>
          {/* Parcours distributeur : espace partenaire (colonne absente avant la migration : rien ne s'affiche) */}
          {c.partner_enabled != null && (
            <PartnerCard companyId={c.id} enabled={!!c.partner_enabled} canEdit={can(admin.role, 'decide_requests')} />
          )}
        </div>

        <div className="flex flex-col gap-4 min-w-0" style={{ flex: '2 1 420px' }}>
          <LemlistCard s={summarizeLemlist((lemlistRes.data ?? []) as LemlistRow[])} />
          <EmailCard s={summarizeMail((mailRes.data ?? []) as MailRow[])} names={mailboxNames} />

          <Card title="Ajouter une activité">
            <ActivityComposer
              companyId={c.id}
              contacts={contacts.map(p => ({ id: p.id, label: contactName(p) }))}
              team={team.filter(m => m.id !== admin.userId)}
            />
          </Card>

          <Card title={`Tâches à faire (${tasks.length})`}>
            <ul className="divide-y divide-[var(--line)]">
              {tasks.map(t => {
                const d = daysUntil(t.due_date, today)
                const tag = d == null ? 'ev-tag' : d < 0 ? 'ev-tag ev-tag--danger' : d === 0 ? 'ev-tag ev-tag--warning' : 'ev-tag'
                return (
                  <li key={t.id} className="py-2.5 flex items-center gap-3 text-sm">
                    <span className="flex-1 min-w-0" style={{ color: 'var(--ink)' }}>{t.title}</span>
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{nameOf(t.assignee_id) ?? ''} · {PRIORITY_LABEL[t.priority as Priority] ?? t.priority}</span>
                    {t.due_date && <span className={tag}>{d != null && d < 0 ? 'En retard · ' : ''}{fmtDate(t.due_date)}</span>}
                    <CompleteTaskButton companyId={c.id} taskId={t.id} />
                  </li>
                )
              })}
            </ul>
            <AddTaskForm companyId={c.id} team={team} today={today} />
          </Card>

          <Card title="Chronologie">
            {timeline.length === 0 && <p className="py-6 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Aucune activité pour l’instant.</p>}
            <ul className="divide-y divide-[var(--line)]">
              {timeline.map(e => {
                const contact = contacts.find(p => p.id === e.contactId)
                return (
                  <li key={`${e.kind}-${e.id}`} className="py-3 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium" style={{ color: 'var(--ink)' }}>{e.label}{contact ? ` · ${contactName(contact)}` : ''}</span>
                      {e.outcome && <span className={OUTCOME_TAG[e.outcome] ?? 'ev-tag'}>{OUTCOME_LABEL[e.outcome]}</span>}
                      {e.kind === 'event' && <span className="ev-tag">Journal</span>}
                    </div>
                    {e.title && <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{e.title}</p>}
                    {e.body && <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ink-2)' }}>{e.body}</p>}
                    <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                      {e.summary ?? nameOf(e.authorId) ?? 'Système'} · {fmtDateTime(e.at)}
                      {e.mentions.length > 0 && ` · mentionne ${e.mentions.map(m => nameOf(m)).filter(Boolean).join(', ')}`}
                    </p>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-4" style={{ flex: '1 1 280px', maxWidth: 340 }}>
          <Card title={`Contacts (${contacts.length})`} right={<AddContactForm companyId={c.id} />}>
            {contacts.length === 0 && <p className="text-sm py-2" style={{ color: 'var(--ink-3)' }}>Aucun contact.</p>}
            <ul className="divide-y divide-[var(--line)]">
              {contacts.map(p => (
                <li key={p.id} className="py-2.5 text-sm">
                  <span className="flex justify-between gap-2">
                    <Link href={`/admin/crm/contacts/${p.id}`} className="font-medium hover:underline" style={{ color: 'var(--ink)' }}>{contactName(p)}</Link>
                    {p.user_id && <Link href={`/admin/societes/${p.user_id}`} className="ev-tag ev-tag--accent" title="Voir le compte client : documents, registre, score">Accès app</Link>}
                  </span>
                  <span className="block" style={{ color: 'var(--ink-3)' }}>{[p.job_title, p.persona].filter(Boolean).join(' · ') || '—'}</span>
                  {p.email && <span className="block break-all" style={{ color: 'var(--ink-3)' }}>{p.email}</span>}
                  {p.phone && <span className="block mt-1"><CallButton phone={p.phone} companyId={c.id} contactId={p.id} contactName={contactName(p)} /></span>}
                </li>
              ))}
            </ul>
          </Card>
          <Card title={`Deals (${deals.length})`} right={<NewDealButton companies={[]} team={team} fixedCompany={{ id: c.id, name: c.name }} small />}>
            {deals.length === 0 && <p className="text-sm py-2" style={{ color: 'var(--ink-3)' }}>Aucun deal.</p>}
            <ul className="divide-y divide-[var(--line)]">
              {deals.map(d => (
                <li key={d.id} className="py-2.5 text-sm flex flex-col gap-1.5">
                  <span className="flex justify-between gap-2">
                    <span className="font-medium" style={{ color: 'var(--ink)' }}>{d.name}</span>
                    {d.amount != null && <span className="ev-mono" style={{ color: 'var(--ink)' }}>{eur(Number(d.amount))}</span>}
                  </span>
                  {(d.next_action || d.next_action_date) && (
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{d.next_action ?? 'Prochaine action'}{d.next_action_date ? ` · ${fmtDate(d.next_action_date)}` : ''}</span>
                  )}
                  <DealStageSelect dealId={d.id} stage={isDealStage(d.stage) ? d.stage : 'pending_qualification'} />
                </li>
              ))}
            </ul>
            {deals.length > 0 && <Link href="/admin/crm/deals" className="text-xs hover:underline" style={{ color: 'var(--ink-3)' }}>Voir le pipeline · {deals.filter(d => !(CLOSED_DEAL_STAGES as string[]).includes(d.stage)).length} en cours</Link>}
          </Card>
          <Card title={`Dossiers (${requests.length})`}>
            {requests.length === 0 && <p className="text-sm py-2" style={{ color: 'var(--ink-3)' }}>Aucun dossier.</p>}
            <ul className="divide-y divide-[var(--line)]">
              {requests.map(r => (
                <li key={r.id} className="py-2.5 text-sm">
                  <Link href={`/admin/dossiers/${r.id}`} className="flex justify-between gap-2 hover:underline" style={{ color: 'var(--ink)' }}>
                    <span>{fmtDate(r.created_at)}</span>
                    <span className="ev-tag">{r.status ?? '—'}</span>
                  </Link>
                  <span className="block ev-mono" style={{ color: 'var(--ink-3)' }}>
                    {r.total_amount != null ? eur(Number(r.total_amount)) : '—'}{r.duration_months ? ` · ${r.duration_months} mois` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
