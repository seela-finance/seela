// CRM — contacts, activités, tâches et chronologie d'une fiche. Fonctions pures, testées.
import { lemlistEventLabel } from '@/lib/crm-lemlist'
import { CrmError, SECTORS, isLifecycleStage, normalizeDomain, normalizeSiren, isWebmailDomain, type LifecycleStage } from '@/lib/crm-companies'

export const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]
export const ACTIVITY_LABEL: Record<ActivityType, string> = { note: 'Note', call: 'Appel', email: 'Email', meeting: 'Réunion' }

export const CALL_OUTCOMES = ['pas_de_reponse', 'messagerie', 'pas_interesse', 'a_rappeler', 'interesse', 'rdv_pris'] as const
export type CallOutcome = (typeof CALL_OUTCOMES)[number]
export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  pas_de_reponse: 'Pas de réponse', messagerie: 'Messagerie', pas_interesse: 'Pas intéressé',
  a_rappeler: 'À rappeler', interesse: 'Intéressé', rdv_pris: 'RDV pris',
}

export const PRIORITIES = ['haute', 'normale', 'basse'] as const
export type Priority = (typeof PRIORITIES)[number]
export const PRIORITY_LABEL: Record<Priority, string> = { haute: 'Haute', normale: 'Normale', basse: 'Basse' }

export const PERSONAS = ['DAF', 'Dirigeant', 'Ops / Achats', 'Revendeur', 'Autre'] as const

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null)

// ─── Propriétés de la société ────────────────────────────────────────────────

export type CompanyPatch = {
  name: string; siren: string | null; domain: string | null; sector: string | null; lifecycle_stage: LifecycleStage
  legal_form: string | null; naf_code: string | null; creation_year: number | null; headcount_bracket: string | null
  source: string | null; signal: string | null; website: string | null; owner_id: string | null
}

export function parseCompanyPatch(f: Record<string, unknown>, teamIds: string[]): CompanyPatch {
  const name = str(f.name)
  if (!name) throw new CrmError('Le nom ne peut pas être vide.')
  const siren = normalizeSiren(f.siren)
  if (siren && !/^\d{9}$/.test(siren)) throw new CrmError('Le SIREN doit compter 9 chiffres.')
  const domain = normalizeDomain(f.domain)
  if (str(f.domain) && !domain) throw new CrmError('Le domaine n’est pas valide (exemple : societe.fr).')
  if (isWebmailDomain(domain)) throw new CrmError('Ce domaine est celui d’une messagerie grand public.')
  const year = str(f.creation_year) ? Number(str(f.creation_year)) : null
  if (year !== null && (!Number.isInteger(year) || year < 1800 || year > 2100)) throw new CrmError('Année de création invalide.')
  const owner = str(f.owner_id)
  return {
    name, siren, domain,
    sector: oneOf(SECTORS, f.sector),
    lifecycle_stage: isLifecycleStage(f.lifecycle_stage) ? f.lifecycle_stage : 'prospect',
    legal_form: str(f.legal_form) || null,
    naf_code: str(f.naf_code) || null,
    creation_year: year,
    headcount_bracket: str(f.headcount_bracket) || null,
    source: str(f.source) || null,
    signal: str(f.signal) || null,
    website: str(f.website) || null,
    owner_id: teamIds.includes(owner) ? owner : null,
  }
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export type ContactInput = { first_name: string | null; last_name: string | null; email: string | null; phone: string | null; job_title: string | null; persona: string | null }

export function parseContactInput(f: Record<string, unknown>): ContactInput {
  const first = str(f.first_name), last = str(f.last_name), email = str(f.email).toLowerCase()
  if (!first && !last && !email) throw new CrmError('Indiquez au moins un nom ou un email.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CrmError('L’email n’est pas valide.')
  return {
    first_name: first || null, last_name: last || null, email: email || null,
    phone: str(f.phone) || null, job_title: str(f.job_title) || null, persona: oneOf(PERSONAS, f.persona),
  }
}

// ─── Activité ────────────────────────────────────────────────────────────────

export type ActivityInput = { type: ActivityType; call_outcome: CallOutcome | null; body: string; contact_id: string | null; mentions: string[] }

export function parseActivityInput(f: { type: unknown; call_outcome: unknown; body: unknown; contact_id: unknown; mentions: unknown[] }, teamIds: string[], contactIds: string[]): ActivityInput {
  const type = oneOf(ACTIVITY_TYPES, f.type) ?? 'note'
  const call_outcome = type === 'call' ? oneOf(CALL_OUTCOMES, f.call_outcome) : null
  const body = str(f.body)
  if (type === 'call' && !call_outcome) throw new CrmError('Indiquez l’issue de l’appel.')
  if (!body && type !== 'call') throw new CrmError('Écrivez le contenu de l’activité.')
  const contact = str(f.contact_id)
  return {
    type, call_outcome, body: body.slice(0, 20000),
    contact_id: contactIds.includes(contact) ? contact : null,
    mentions: [...new Set(f.mentions.map(str).filter(id => teamIds.includes(id)))],
  }
}

// ─── Tâche ───────────────────────────────────────────────────────────────────

export type TaskInput = { title: string; due_date: string | null; priority: Priority; assignee_id: string | null }

export function parseTaskInput(f: Record<string, unknown>, teamIds: string[]): TaskInput {
  const title = str(f.title)
  if (!title) throw new CrmError('Indiquez l’intitulé de la tâche.')
  const due = str(f.due_date)
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new CrmError('Date d’échéance invalide.')
  const assignee = str(f.assignee_id)
  return { title: title.slice(0, 300), due_date: due || null, priority: oneOf(PRIORITIES, f.priority) ?? 'normale', assignee_id: teamIds.includes(assignee) ? assignee : null }
}

/** Jours avant l'échéance (négatif = en retard), comparés en dates calendaires. */
export function daysUntil(due: string | null, today: string): number | null {
  if (!due) return null
  return Math.round((Date.parse(`${due}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000)
}

// ─── Chronologie : activités CRM + journal admin ─────────────────────────────

export type ActivityRow = {
  id: string; type: string; call_outcome: string | null; body: string | null; occurred_at: string; author_id: string | null; contact_id: string | null
  crm_mentions: { user_id: string }[] | null; source?: string | null; event?: string | null; title?: string | null; summary?: string | null
}
export type AdminEventRow = { id: string; admin_id: string; action: string; note: string | null; created_at: string }

export type TimelineItem = {
  id: string
  kind: 'activity' | 'event'
  label: string
  source: string
  event: string | null
  title: string | null
  summary: string | null
  outcome: CallOutcome | null
  body: string | null
  at: string
  authorId: string | null
  contactId: string | null
  mentions: string[]
}

export function buildTimeline(activities: ActivityRow[], events: AdminEventRow[]): TimelineItem[] {
  const a: TimelineItem[] = activities.map(r => {
    const type = oneOf(ACTIVITY_TYPES, r.type) ?? 'note'
    const source = r.source ?? 'manuel'
    return {
      id: r.id, kind: 'activity', source, event: r.event ?? null, title: r.title ?? null, summary: r.summary ?? null,
      label: source === 'lemlist' ? `Lemlist · ${lemlistEventLabel(r.event ?? null)}` : r.type === 'linkedin' ? 'LinkedIn' : ACTIVITY_LABEL[type],
      outcome: oneOf(CALL_OUTCOMES, r.call_outcome),
      body: r.body, at: r.occurred_at, authorId: r.author_id, contactId: r.contact_id, mentions: (r.crm_mentions ?? []).map(m => m.user_id),
    }
  })
  const e: TimelineItem[] = events.map(r => ({
    id: r.id, kind: 'event', label: r.action, source: 'journal', event: null, title: null, summary: null, outcome: null, body: r.note, at: r.created_at, authorId: r.admin_id, contactId: null, mentions: [],
  }))
  return [...a, ...e].sort((x, y) => y.at.localeCompare(x.at))
}
