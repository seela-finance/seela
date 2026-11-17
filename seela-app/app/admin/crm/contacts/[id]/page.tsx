import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/admin'
import { isUuid } from '@/lib/admin-request-detail'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildTimeline, OUTCOME_LABEL, type ActivityRow } from '@/lib/crm-activities'
import { contactName } from '@/lib/crm-deals'
import { fmtDate, fmtDateTime } from '@/components/admin/ui'
import { ActivityComposer } from '@/components/admin/crm/FicheForms'
import { ContactPropertiesForm, type ContactValues } from '@/components/admin/crm/CrmForms'
import LemlistCard from '@/components/admin/crm/LemlistCard'
import CallButton from '@/components/admin/crm/CallButton'
import EmailCard from '@/components/admin/crm/EmailCard'
import { summarizeMail, type MailRow } from '@/lib/crm-mail'
import { summarizeLemlist, type LemlistRow } from '@/lib/crm-lemlist'

type Contact = {
  id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; job_title: string | null
  persona: string | null; linkedin_url: string | null; lemlist_url: string | null; headline: string | null; location: string | null; user_id: string | null; owner_id: string | null
  company_id: string | null; created_at: string; companies: { name: string; lifecycle_stage: string } | null
}

const OUTCOME_TAG: Record<string, string> = { rdv_pris: 'ev-tag ev-tag--ok', interesse: 'ev-tag ev-tag--ok', pas_interesse: 'ev-tag ev-tag--danger', a_rappeler: 'ev-tag ev-tag--warning' }

export default async function CrmContactPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireCapability('crm')
  const { id } = await params
  if (!isUuid(id)) notFound()

  const db = createAdminClient()
  const [contactRes, companiesRes, adminsRes, activitiesRes, lemlistRes, mailRes, boxesRes] = await Promise.all([
    db.from('contacts').select('*, companies ( name, lifecycle_stage )').eq('id', id).maybeSingle(),
    db.from('companies').select('id, name').order('name'),
    db.from('admins').select('user_id, name').order('name'),
    db.from('crm_activities').select('id, type, call_outcome, body, occurred_at, author_id, contact_id, source, event, title, summary, crm_mentions ( user_id )').eq('contact_id', id).not('source', 'in', '(lemlist,mailbox)').order('occurred_at', { ascending: false }).limit(100),
    db.from('crm_activities').select('id, event, occurred_at, title, body, metadata').eq('contact_id', id).eq('source', 'lemlist').limit(5000),
    db.from('crm_activities').select('id, event, occurred_at, title, body, metadata').eq('contact_id', id).eq('source', 'mailbox').order('occurred_at', { ascending: false }).limit(500),
    db.from('crm_mailboxes').select('email, user_id'),
  ])
  const c = contactRes.data as Contact | null
  if (!c) notFound()
  const team = ((adminsRes.data ?? []) as { user_id: string; name: string }[]).map(a => ({ id: a.user_id, name: a.name }))
  const mailboxNames = new Map(((boxesRes.data ?? []) as { email: string; user_id: string }[]).map(b => [b.email, team.find(m => m.id === b.user_id)?.name ?? b.email]))
  const nameOf = (uid: string | null) => team.find(m => m.id === uid)?.name ?? null
  const timeline = buildTimeline((activitiesRes.data ?? []) as ActivityRow[], [])
  const name = contactName(c)

  const s = (v: string | null) => v ?? ''
  const values: ContactValues = {
    first_name: s(c.first_name), last_name: s(c.last_name), email: s(c.email), phone: s(c.phone), job_title: s(c.job_title),
    persona: s(c.persona), linkedin_url: s(c.linkedin_url), company_id: s(c.company_id), owner_id: s(c.owner_id),
  }
  const props: [string, React.ReactNode][] = [
    ['Email', c.email],
    ['Téléphone', c.phone ? <CallButton phone={c.phone} companyId={c.company_id} contactId={c.id} contactName={contactName(c)} compact /> : null],
    ['Poste', c.job_title],
    ['Accroche LinkedIn', c.headline],
    ['Localisation', c.location],
    ['Persona', c.persona],
    ['LinkedIn', c.linkedin_url ? <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="underline">Profil</a> : null],
    ['Propriétaire', nameOf(c.owner_id)],
    ['Créé le', fmtDate(c.created_at)],
  ]

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink-3)' }}>
        <Link href="/admin/crm/contacts" className="hover:underline">Contacts</Link>
        <span className="mx-2">›</span>
        <span style={{ color: 'var(--ink)' }}>{name}</span>
      </div>

      <div className="px-6 py-5 flex flex-wrap gap-4 items-start">
        <div className="flex flex-col gap-4" style={{ flex: '1 1 280px', maxWidth: 360 }}>
          <section className="ev-card p-5 flex flex-col gap-2">
            <h1 className="ev-display text-2xl">{name}</h1>
            {c.job_title && <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{c.job_title}</p>}
            {c.phone && <div><CallButton phone={c.phone} companyId={c.company_id} contactId={c.id} contactName={name} /></div>}
            <div className="flex flex-wrap gap-1.5">
              {c.user_id && <Link href={`/admin/societes/${c.user_id}`} className="ev-tag ev-tag--accent">Accès app · voir le compte client</Link>}
              {c.persona && <span className="ev-tag">{c.persona}</span>}
            </div>
          </section>
          <section className="ev-card px-5 py-4">
            <h2 className="ev-kicker mb-2">À propos de ce contact</h2>
            <dl className="divide-y divide-[var(--line)] mb-3">
              {props.map(([k, v]) => (
                <div key={k} className="py-2 flex justify-between gap-3 text-sm">
                  <dt style={{ color: 'var(--ink-3)' }}>{k}</dt>
                  <dd className="text-right break-all" style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <ContactPropertiesForm contactId={c.id} values={values} companies={(companiesRes.data ?? []) as { id: string; name: string }[]} team={team} emailLocked={!!c.user_id} />
          </section>
        </div>

        <div className="flex flex-col gap-4 min-w-0" style={{ flex: '2 1 420px' }}>
          <LemlistCard s={summarizeLemlist((lemlistRes.data ?? []) as LemlistRow[])} />
          <EmailCard s={summarizeMail((mailRes.data ?? []) as MailRow[])} names={mailboxNames} />
          <section className="ev-card px-5 py-4">
            <h2 className="ev-kicker mb-2">Ajouter une activité</h2>
            {c.company_id
              ? <ActivityComposer companyId={c.company_id} contacts={[{ id: c.id, label: name }]} defaultContactId={c.id} team={team.filter(m => m.id !== admin.userId)} />
              : <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Rattachez ce contact à une société (Modifier les propriétés) pour enregistrer appels et notes.</p>}
          </section>
          <section className="ev-card px-5 py-4">
            <h2 className="ev-kicker mb-2">Chronologie</h2>
            {timeline.length === 0 && <p className="py-6 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Aucune activité pour l’instant.</p>}
            <ul className="divide-y divide-[var(--line)]">
              {timeline.map(e => (
                <li key={e.id} className="py-3 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium" style={{ color: 'var(--ink)' }}>{e.label}</span>
                    {e.outcome && <span className={OUTCOME_TAG[e.outcome] ?? 'ev-tag'}>{OUTCOME_LABEL[e.outcome]}</span>}
                  </div>
                  {e.title && <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{e.title}</p>}
                    {e.body && <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ink-2)' }}>{e.body}</p>}
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    {e.summary ?? nameOf(e.authorId) ?? 'Système'} · {fmtDateTime(e.at)}
                    {e.mentions.length > 0 && ` · mentionne ${e.mentions.map(m => nameOf(m)).filter(Boolean).join(', ')}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex flex-col gap-4" style={{ flex: '1 1 260px', maxWidth: 320 }}>
          <section className="ev-card px-5 py-4">
            <h2 className="ev-kicker mb-2">Société</h2>
            {c.company_id && c.companies
              ? <Link href={`/admin/crm/societes/${c.company_id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--ink)' }}>{c.companies.name}</Link>
              : <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Aucune société.</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
