'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addActivityAction, type FicheState } from '@/app/admin/crm/fiche-actions'
import { CALL_OUTCOMES, OUTCOME_LABEL, type CallOutcome } from '@/lib/crm-activities'
import { LEAD_STATUS_LABEL, LEAD_STATUSES, type LeadStatus } from '@/lib/crm-prepipe'
import { formatPhone, toE164 } from '@/lib/phone'
import { ExitReasonField } from '@/components/admin/crm/PrepipeForms'

// ─── Session gardée dans l'onglet (sessionStorage) : file figée au lancement + issues enregistrées ─────

type Session = { ids: string[]; label: string; startedAt: string; outcomes: Record<string, string[]> }
const KEY = 'crm-call-session'
const EVENT = 'crm-call-session'

function read(): string | null {
  try { return sessionStorage.getItem(KEY) } catch { return null }
}
function write(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s))
    else sessionStorage.removeItem(KEY)
  } catch { /* stockage indisponible : la session ne survit pas au rechargement */ }
  window.dispatchEvent(new Event(EVENT))
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb) }
}
function useSession(): Session | null {
  const raw = useSyncExternalStore(subscribe, read, () => null)
  return useMemo(() => { try { return raw ? (JSON.parse(raw) as Session) : null } catch { return null } }, [raw])
}
function recordOutcome(companyId: string, outcome: string) {
  const raw = read()
  if (!raw) return
  const s = JSON.parse(raw) as Session
  write({ ...s, outcomes: { ...s.outcomes, [companyId]: [...(s.outcomes[companyId] ?? []), outcome] } })
}

// ─── Lancement ───────────────────────────────────────────────────────────────

const DEFAULT_STATUSES: LeadStatus[] = ['a_contacter', 'qualification', 'tentative', 'connecte']

export function SessionStart({ items }: { items: { id: string; status: string; channel: string | null }[] }) {
  const router = useRouter()
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES)
  const [channel, setChannel] = useState<string>('outbound')
  const picked = items.filter(i => statuses.includes(i.status) && (channel === 'tous' || i.channel === channel))
  const countFor = (s: string) => items.filter(i => i.status === s && (channel === 'tous' || i.channel === channel)).length

  function start() {
    if (!picked.length) return
    const label = `${channel === 'tous' ? 'Inbound + outbound' : channel === 'inbound' ? 'Inbound' : 'Outbound'} · ${statuses.map(s => LEAD_STATUS_LABEL[s as LeadStatus]).join(' + ')}`
    write({ ids: picked.map(i => i.id), label, startedAt: new Date().toISOString(), outcomes: {} })
    router.push(`/admin/crm/appels/${picked[0].id}`)
  }

  return (
    <section className="ev-card p-5 flex flex-col gap-4 max-w-xl">
      <h2 className="ev-display text-xl">Nouvelle session d’appels</h2>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="ev-label mb-1">Canal</legend>
        <div className="flex gap-4">
          {[['outbound', 'Outbound'], ['inbound', 'Inbound'], ['tous', 'Les deux']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-1.5"><input type="radio" name="canal" checked={channel === v} onChange={() => setChannel(v)} style={{ accentColor: 'var(--accent)' }} /> {l}</label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="ev-label mb-1">Lead status</legend>
        {LEAD_STATUSES.map(s => (
          <label key={s} className="flex items-center gap-2">
            <input type="checkbox" checked={statuses.includes(s)} onChange={e => setStatuses(e.target.checked ? [...statuses, s] : statuses.filter(x => x !== s))} style={{ accentColor: 'var(--accent)' }} />
            {LEAD_STATUS_LABEL[s]} <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{countFor(s)}</span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Ordre : signal fort, relance du jour, nouveaux de moins de 48 h, puis les moins appelés.</p>
      <button type="button" className="ev-btn ev-btn--primary self-start" disabled={!picked.length} onClick={start}>
        Lancer la session ({picked.length} société{picked.length > 1 ? 's' : ''})
      </button>
    </section>
  )
}

// ─── Barre de session : position, précédent / suivant / passer / terminer ────

export function SessionBar({ companyId }: { companyId: string }) {
  const router = useRouter()
  const session = useSession()
  const index = session ? session.ids.indexOf(companyId) : -1
  const done = session ? Object.keys(session.outcomes).length : 0
  const go = (i: number) => { if (session && session.ids[i]) router.push(`/admin/crm/appels/${session.ids[i]}`) }
  const finish = () => router.push('/admin/crm/appels?fin=1')
  const next = () => (session && index + 1 < session.ids.length ? go(index + 1) : finish())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!session || index < 0) {
    return (
      <div className="h-12 flex items-center justify-between gap-3 px-6 border-b text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span style={{ color: 'var(--ink-3)' }}>Hors session d’appels</span>
        <Link href="/admin/crm/appels" className="ev-btn ev-btn--ghost ev-btn--sm">Lancer une session</Link>
      </div>
    )
  }
  return (
    <div className="border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <div className="min-h-12 flex flex-wrap items-center justify-between gap-2 px-6 py-2 text-sm">
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" disabled={index === 0} onClick={() => go(index - 1)}>◀ Précédent</button>
        <span className="text-center" style={{ color: 'var(--ink-3)' }}>
          <span className="hidden md:inline">{session.label} · </span>
          <span className="ev-mono" style={{ color: 'var(--ink)' }}>{index + 1} / {session.ids.length}</span> · {done} traitée{done > 1 ? 's' : ''}
        </span>
        <span className="flex gap-2">
          <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={finish}>Terminer</button>
          <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={next}>{index + 1 < session.ids.length ? 'Suivant ▶' : 'Fin ▶'}</button>
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--raised)' }}><div style={{ height: 3, width: `${((index + 1) / session.ids.length) * 100}%`, background: 'var(--accent)' }} /></div>
    </div>
  )
}

// ─── Contacts : appeler, issue en un clic, note, chrono ──────────────────────

export type SessionContactInfo = {
  id: string; name: string; jobTitle: string | null; persona: string | null; phone: string | null; email: string | null
  linkedin: string | null; reaction: string | null; lastCall: string | null; calls: number; lastNote: string | null
}

const KEYS: Record<string, CallOutcome> = Object.fromEntries(CALL_OUTCOMES.map((o, i) => [String(i + 1), o]))

export function SessionContacts({ companyId, contacts }: { companyId: string; contacts: SessionContactInfo[] }) {
  const [active, setActive] = useState<string | null>(null)
  const first = contacts.find(c => toE164(c.phone))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key === 'Enter' && !active && first) document.getElementById(`call-${first.id}`)?.click()
      if (active && KEYS[e.key]) document.getElementById(`outcome-${active}-${KEYS[e.key]}`)?.click()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!contacts.length) return <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Aucun contact. Ajoutez-en un depuis la fiche société.</p>
  return (
    <ul className="divide-y divide-[var(--line)]">
      {contacts.map(c => <ContactRow key={c.id} companyId={companyId} c={c} active={active === c.id} onCall={() => setActive(c.id)} onDone={() => setActive(null)} />)}
    </ul>
  )
}

function ContactRow({ companyId, c, active, onCall, onDone }: { companyId: string; c: SessionContactInfo; active: boolean; onCall: () => void; onDone: () => void }) {
  const e164 = toE164(c.phone)
  const startedAt = useRef(0)
  const [seconds, setSeconds] = useState(0)
  const [outcome, setOutcome] = useState<CallOutcome | null>(null)
  const [state, submit, pending] = useActionState<FicheState, FormData>(async (prev, form) => {
    const next = await addActivityAction(prev, form)
    if (next?.ok) { recordOutcome(companyId, String(form.get('call_outcome'))); setOutcome(null); onDone() }
    return next
  }, null)

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [active])

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <li className="py-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {c.name} {c.reaction && <span className="ev-tag ev-tag--accent ml-1">{c.reaction}</span>}
          </p>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{[c.jobTitle, c.persona].filter(Boolean).join(' · ') || '—'}</p>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{c.lastCall ? `Dernier appel : ${c.lastCall} (${c.calls})` : 'Jamais appelé'}</p>
        </div>
        {e164
          ? <a id={`call-${c.id}`} href={`tel:${e164}`} onClick={() => { startedAt.current = Date.now(); setSeconds(0); onCall() }} className="ev-btn ev-btn--primary ev-btn--sm">Appeler · {formatPhone(e164)}</a>
          : <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Pas de numéro</span>}
      </div>

      {(c.email || c.linkedin || c.lastNote) && (
        <details className="text-xs" style={{ color: 'var(--ink-2)' }}>
          <summary className="cursor-pointer" style={{ color: 'var(--ink-3)' }}>Email, LinkedIn, dernière note</summary>
          <div className="mt-1 flex flex-col gap-1">
            {c.email && <span className="break-all">{c.email}</span>}
            {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" className="underline">Profil LinkedIn</a>}
            {c.lastNote && <span className="whitespace-pre-line pl-2" style={{ borderLeft: '2px solid var(--line-strong)' }}>{c.lastNote}</span>}
          </div>
        </details>
      )}

      {active && (
        <form
          action={form => { form.set('body', `${String(form.get('notes') ?? '').trim()}\n(Durée : environ ${Math.max(1, Math.round(seconds / 60))} min)`.trim()); submit(form) }}
          className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: 'var(--raised)' }}
        >
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="type" value="call" />
          <input type="hidden" name="contact_id" value={c.id} />
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-3)' }}>
            <span>Issue de l’appel (touches 1 à 7)</span><span className="ev-mono">⏱ {mmss}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CALL_OUTCOMES.map((o, i) => (
              <button
                key={o} id={`outcome-${c.id}-${o}`} type={o === 'societe_disqualifiee' ? 'button' : 'submit'} disabled={pending}
                name={o === 'societe_disqualifiee' ? undefined : 'call_outcome'} value={o === 'societe_disqualifiee' ? undefined : o}
                onClick={() => setOutcome(o)}
                className={`ev-btn ev-btn--sm ${outcome === o ? 'ev-btn--ink' : 'ev-btn--ghost'}`}
              >
                <span className="ev-mono mr-1" style={{ color: 'var(--ink-3)' }}>{i + 1}</span>{OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
          {outcome === 'societe_disqualifiee' && (
            <div className="flex flex-col gap-2">
              <ExitReasonField />
              <button type="submit" name="call_outcome" value="societe_disqualifiee" className="ev-btn ev-btn--primary ev-btn--sm self-start" disabled={pending}>Enregistrer la disqualification</button>
            </div>
          )}
          <input name="notes" className="ev-input" placeholder="Note (facultative), puis cliquez l’issue" aria-label="Note de l’appel" />
          {state && !state.ok && <p className="text-xs" style={{ color: 'var(--danger)' }}>{state.message}</p>}
        </form>
      )}
      {!active && state?.ok && <p className="text-xs" style={{ color: 'var(--ok)' }}>{state.message}</p>}
      {!active && e164 && !state?.ok && (
        <button type="button" className="text-xs self-start hover:underline" style={{ color: 'var(--ink-3)' }} onClick={() => { startedAt.current = Date.now(); setSeconds(0); onCall() }}>
          Saisir une issue sans lancer l’appel
        </button>
      )}
    </li>
  )
}

// ─── Récap de fin ────────────────────────────────────────────────────────────

export function SessionSummary() {
  const session = useSession()
  if (!session) return null
  const all = Object.values(session.outcomes).flat()
  const count = (o: string) => all.filter(x => x === o).length
  return (
    <section className="ev-card p-5 flex flex-col gap-3 max-w-xl">
      <h2 className="ev-display text-xl">Session terminée</h2>
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{session.label}</p>
      <dl className="grid grid-cols-2 gap-x-6 text-sm">
        {([['Sociétés traitées', Object.keys(session.outcomes).length], ['Appels enregistrés', all.length], ...CALL_OUTCOMES.map(o => [OUTCOME_LABEL[o], count(o)])] as [string, number][]).map(([k, v]) => (
          <div key={k} className="py-1.5 flex justify-between border-b" style={{ borderColor: 'var(--line)' }}>
            <dt style={{ color: 'var(--ink-3)' }}>{k}</dt><dd className="ev-mono" style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm self-start" onClick={() => write(null)}>Nouvelle session</button>
    </section>
  )
}
