import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/admin'
import { isUuid } from '@/lib/admin-request-detail'
import { createAdminClient } from '@/lib/supabase/admin'
import { eur, fmtDate, fmtDateTime } from '@/components/admin/ui'
import { OUTCOME_LABEL, type CallOutcome } from '@/lib/crm-activities'
import { contactReaction, LEAD_CHANNEL_LABEL, LEAD_SIGNAL_LABEL, LEAD_STATUS_LABEL, type LeadChannel, type LeadStatus } from '@/lib/crm-prepipe'
import { summarizeLemlist, type LemlistRow } from '@/lib/crm-lemlist'
import { contactName } from '@/lib/crm-deals'
import { SessionBar, SessionContacts, type SessionContactInfo } from '@/components/admin/crm/CallSession'

type Company = {
  id: string; name: string; domain: string | null; website: string | null; sector: string | null; headcount_bracket: string | null
  creation_year: number | null; legal_form: string | null; naf_code: string | null; address: string | null; revenue_declared: number | null
  result_declared: number | null; signal: string | null; source: string | null; lead_status: string | null; lead_channel: string | null; lead_signal: string | null
}
type Contact = { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; job_title: string | null; persona: string | null; linkedin_url: string | null }
type Activity = { id: string; type: string; call_outcome: string | null; body: string | null; occurred_at: string; contact_id: string | null }

const city = (address: string | null) => address?.match(/\d{5}\s+(.+)$/)?.[1] ?? null

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="py-1.5 flex justify-between gap-3 text-sm">
      <dt style={{ color: 'var(--ink-3)' }}>{k}</dt>
      <dd className="text-right" style={{ color: v === null || v === undefined || v === '' ? 'var(--ink-3)' : 'var(--ink)' }}>{v === null || v === undefined || v === '' ? '—' : v}</dd>
    </div>
  )
}

export default async function CallSessionCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability('crm')
  const { id } = await params
  if (!isUuid(id)) notFound()
  const db = createAdminClient()
  const [companyRes, contactsRes, activitiesRes, lemlistRes] = await Promise.all([
    db.from('companies').select('id, name, domain, website, sector, headcount_bracket, creation_year, legal_form, naf_code, address, revenue_declared, result_declared, signal, source, lead_status, lead_channel, lead_signal').eq('id', id).maybeSingle(),
    db.from('contacts').select('id, first_name, last_name, email, phone, job_title, persona, linkedin_url').eq('company_id', id).order('created_at'),
    db.from('crm_activities').select('id, type, call_outcome, body, occurred_at, contact_id').eq('company_id', id).in('type', ['call', 'note']).order('occurred_at', { ascending: false }).limit(200),
    db.from('crm_activities').select('id, event, occurred_at, title, body, metadata, contact_id').eq('company_id', id).eq('source', 'lemlist').limit(5000),
  ])
  const c = companyRes.data as Company | null
  if (!c) notFound()
  const contacts = (contactsRes.data ?? []) as Contact[]
  const activities = (activitiesRes.data ?? []) as Activity[]
  const lemlistRows = (lemlistRes.data ?? []) as (LemlistRow & { contact_id: string | null })[]
  const calls = activities.filter(a => a.type === 'call')
  const lemlist = summarizeLemlist(lemlistRows)
  const callLabel = (a: Activity) => `${fmtDate(a.occurred_at)} · ${OUTCOME_LABEL[a.call_outcome as CallOutcome] ?? 'appel'}`

  // Contacts : ceux qui ont réagi dans Lemlist d'abord, puis ceux qui ont un téléphone
  const infos: SessionContactInfo[] = contacts.map(p => {
    const mine = calls.filter(a => a.contact_id === p.id)
    return {
      id: p.id, name: contactName(p), jobTitle: p.job_title, persona: p.persona, phone: p.phone, email: p.email, linkedin: p.linkedin_url,
      reaction: contactReaction(lemlistRows.filter(r => r.contact_id === p.id).map(r => r.event)),
      lastCall: mine[0] ? callLabel(mine[0]) : null, calls: mine.length,
      lastNote: activities.find(a => a.contact_id === p.id && a.body && a.body.trim())?.body ?? null,
    }
  }).sort((a, b) => Number(!!b.reaction) - Number(!!a.reaction) || Number(!!b.phone) - Number(!!a.phone))

  return (
    <div>
      <SessionBar companyId={c.id} />
      <div className="px-6 py-5 flex flex-wrap gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0" style={{ flex: '1 1 320px', maxWidth: 440 }}>
          <section className="ev-card p-5 flex flex-col gap-2">
            <Link href={`/admin/crm/societes/${c.id}`} className="ev-display text-2xl hover:underline">{c.name}</Link>
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{[c.domain, city(c.address)].filter(Boolean).join(' · ') || '—'}</p>
            <div className="flex flex-wrap gap-1.5">
              {c.lead_status && <span className="ev-tag ev-tag--dark">{LEAD_STATUS_LABEL[c.lead_status as LeadStatus] ?? c.lead_status}</span>}
              {c.lead_channel && <span className="ev-tag">{LEAD_CHANNEL_LABEL[c.lead_channel as LeadChannel]}</span>}
              {c.lead_signal && <span className="ev-tag ev-tag--accent">{LEAD_SIGNAL_LABEL[c.lead_signal] ?? c.lead_signal}</span>}
              <span className="ev-tag">{calls.length} appel{calls.length > 1 ? 's' : ''}</span>
            </div>
          </section>

          <section className="ev-card px-5 py-4">
            <h2 className="ev-kicker mb-1">Pour l’approche</h2>
            <dl className="divide-y divide-[var(--line)]">
              <Row k="Secteur" v={c.sector} />
              <Row k="Effectif" v={c.headcount_bracket} />
              <Row k="CA déclaré" v={c.revenue_declared != null ? eur(Number(c.revenue_declared)) : null} />
              <Row k="Signal" v={c.signal} />
            </dl>
            <details className="mt-1">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--ink-3)' }}>Plus d’infos</summary>
              <dl className="divide-y divide-[var(--line)] mt-1">
                <Row k="Forme juridique" v={c.legal_form} />
                <Row k="Code NAF" v={c.naf_code} />
                <Row k="Création" v={c.creation_year} />
                <Row k="Résultat déclaré" v={c.result_declared != null ? eur(Number(c.result_declared)) : null} />
                <Row k="Source" v={c.source} />
                <Row k="Site web" v={c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="underline">{c.website}</a> : null} />
              </dl>
            </details>
          </section>

          <section className="ev-card px-5 py-4">
            <h2 className="ev-kicker mb-1">Lemlist</h2>
            <dl className="grid grid-cols-2 gap-x-4">
              {([['Envoyés', lemlist.sent], ['Ouvertures', lemlist.opened], ['Clics', lemlist.clicked], ['Réponses', lemlist.replied]] as [string, number][]).map(([k, v]) => (
                <div key={k} className="py-1.5 flex justify-between text-sm border-b" style={{ borderColor: 'var(--line)' }}>
                  <dt style={{ color: 'var(--ink-3)' }}>{k}</dt><dd className="ev-mono" style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v}</dd>
                </div>
              ))}
            </dl>
            <Row k="Intéressé" v={lemlist.interested === null ? null : <span className={lemlist.interested ? 'ev-tag ev-tag--ok' : 'ev-tag'}>{lemlist.interested ? 'Oui' : 'Non'}</span>} />
            <details className="mt-1">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--ink-3)' }}>LinkedIn, campagnes, emails ({lemlist.emails.length})</summary>
              <dl className="divide-y divide-[var(--line)] mt-1">
                <Row k="LinkedIn : acceptée" v={lemlist.linkedinAccepted ? 'Oui' : 'Non'} />
                <Row k="LinkedIn : messages / réponses" v={`${lemlist.linkedinMessages} / ${lemlist.linkedinReplies}`} />
                <Row k="Dernier envoi" v={lemlist.lastSentAt ? fmtDate(lemlist.lastSentAt) : null} />
                <Row k="Campagnes" v={lemlist.campaigns.join(' · ') || null} />
              </dl>
              <ul className="divide-y divide-[var(--line)] mt-2">
                {lemlist.emails.map((m, i) => (
                  <li key={m.id ?? i} className="py-2 text-sm">
                    <details>
                      <summary className="cursor-pointer list-none">
                        <span className={m.event === 'emailsReplied' ? 'ev-tag ev-tag--accent mr-2' : 'ev-tag mr-2'}>{m.event === 'emailsReplied' ? 'Reçu' : 'Envoyé'}</span>
                        <span style={{ color: 'var(--ink)' }}>{m.title ?? '(sans objet)'}</span>
                        <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>{fmtDateTime(m.occurred_at)}</span>
                      </summary>
                      <p className="mt-2 pl-3 whitespace-pre-line" style={{ borderLeft: '2px solid var(--line-strong)', color: 'var(--ink-2)' }}>{m.body ?? 'Contenu pas encore récupéré.'}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <section className="ev-card px-5 py-4">
            <h2 className="ev-kicker mb-1">Dernier appel</h2>
            {calls.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Jamais appelée.</p>}
            {calls[0] && (
              <p className="text-sm" style={{ color: 'var(--ink)' }}>
                {callLabel(calls[0])}{calls[0].contact_id ? ` · ${contactName(contacts.find(p => p.id === calls[0].contact_id) ?? { first_name: null, last_name: null, email: null })}` : ''}
                {calls[0].body && <span className="block truncate" style={{ color: 'var(--ink-2)' }}>{calls[0].body}</span>}
              </p>
            )}
            {calls.length > 1 && (
              <details className="mt-1">
                <summary className="text-xs cursor-pointer" style={{ color: 'var(--ink-3)' }}>Appels précédents</summary>
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {calls.slice(1, 3).map(a => <li key={a.id} style={{ color: 'var(--ink-2)' }}>{callLabel(a)}{a.body ? ` · ${a.body}` : ''}</li>)}
                </ul>
              </details>
            )}
          </section>
        </div>

        <section className="ev-card px-5 py-4 min-w-0" style={{ flex: '2 1 420px' }}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="ev-kicker">Contacts à appeler ({contacts.length})</h2>
            <Link href={`/admin/crm/societes/${c.id}`} className="text-xs hover:underline" style={{ color: 'var(--ink-3)' }}>+ Ajouter un contact</Link>
          </div>
          <SessionContacts companyId={c.id} contacts={infos} />
          <p className="text-xs mt-3" style={{ color: 'var(--ink-3)' }}>Raccourcis : Entrée = appeler · 1 à 7 = issue · → suivant · ← précédent</p>
        </section>
      </div>
    </div>
  )
}
