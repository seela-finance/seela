// Lemlist → CRM : quels événements on garde et comment ils deviennent des activités. Fonctions pures, testées.
import { isWebmailDomain, normalizeDomain } from '@/lib/crm-companies'

export const LEMLIST_EVENTS = {
  emailsSent: { type: 'email', label: 'Email envoyé' },
  emailsOpened: { type: 'email', label: 'Email ouvert' },
  emailsClicked: { type: 'email', label: 'Lien cliqué' },
  emailsReplied: { type: 'email', label: 'Réponse reçue' },
  emailsInterested: { type: 'email', label: 'Marqué intéressé' },
  emailsNotInterested: { type: 'email', label: 'Marqué pas intéressé' },
  emailsBounced: { type: 'email', label: 'Email rejeté' },
  emailsUnsubscribed: { type: 'email', label: 'Désinscrit' },
  mailinblackDetected: { type: 'email', label: 'Bloqué par un anti-spam (MailInBlack) : email probablement pas reçu' },
  outOfOffice: { type: 'email', label: 'Absent du bureau' },
  linkedinSent: { type: 'linkedin', label: 'Message LinkedIn envoyé' },
  linkedinReplied: { type: 'linkedin', label: 'Réponse LinkedIn' },
  linkedinInviteDone: { type: 'linkedin', label: 'Invitation LinkedIn envoyée' },
  linkedinInviteAccepted: { type: 'linkedin', label: 'Invitation LinkedIn acceptée' },
  linkedinInterested: { type: 'linkedin', label: 'Marqué intéressé (LinkedIn)' },
  linkedinNotInterested: { type: 'linkedin', label: 'Marqué pas intéressé (LinkedIn)' },
} as const

export type LemlistEvent = keyof typeof LEMLIST_EVENTS

export function isLemlistEvent(v: unknown): v is LemlistEvent {
  return typeof v === 'string' && Object.hasOwn(LEMLIST_EVENTS, v)
}

export const lemlistEventLabel = (event: string | null) => (isLemlistEvent(event) ? LEMLIST_EVENTS[event].label : 'Événement Lemlist')

/** Une activité Lemlist telle que renvoyée par GET /api/activities (champs utiles seulement). */
export type LemlistActivity = {
  _id: string; type: string; createdAt: string; leadEmail?: string | null; leadFirstName?: string | null; leadLastName?: string | null
  leadCompanyName?: string | null; campaignId?: string | null; campaignName?: string | null; subject?: string | null
  messagePreview?: string | null; outOfOfficeEndsAt?: string | null; sendUserName?: string | null; sendUserEmail?: string | null; sequenceStep?: number | null; leadId?: string | null
}

export type MappedActivity = {
  externalId: string; event: LemlistEvent; type: 'email' | 'linkedin'; occurredAt: string
  lead: { email: string; firstName: string | null; lastName: string | null; companyName: string | null; domain: string | null }
  title: string | null; summary: string | null; body: string | null
  metadata: Record<string, unknown>
}

const clean = (v: unknown, max = 500) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/** null = événement ignoré (étape sautée, échec d'envoi technique…) ou sans email de lead. */
export function mapLemlistActivity(a: LemlistActivity): MappedActivity | null {
  if (!isLemlistEvent(a.type) || !a._id || !a.createdAt) return null
  const email = clean(a.leadEmail, 320)?.toLowerCase()
  if (!email || !email.includes('@')) return null
  const domain = normalizeDomain(email)
  const replied = a.type === 'emailsReplied' || a.type === 'linkedinReplied' || a.type === 'outOfOffice'
  return {
    externalId: a._id,
    event: a.type,
    type: LEMLIST_EVENTS[a.type].type,
    occurredAt: a.createdAt,
    lead: {
      email, firstName: clean(a.leadFirstName, 100), lastName: clean(a.leadLastName, 100), companyName: clean(a.leadCompanyName, 200),
      domain: domain && !isWebmailDomain(domain) ? domain : null,
    },
    title: clean(a.subject, 300),
    summary: [a.campaignName && `Campagne « ${a.campaignName.trim()} »`, a.sendUserName && `par ${a.sendUserName.trim()}`].filter(Boolean).join(' ') || null,
    body: replied ? clean(a.messagePreview, 5000) : null,
    metadata: { campaignId: a.campaignId ?? null, campaignName: a.campaignName ?? null, sendUserEmail: a.sendUserEmail ?? null, sequenceStep: a.sequenceStep ?? null, leadId: a.leadId ?? null, outOfOfficeEndsAt: a.outOfOfficeEndsAt ?? null },
  }
}

/**
 * Lemlist renvoie les plus récents d'abord. On s'arrête dès qu'une page atteint ce qui est déjà importé,
 * et on ne garde que ce qui est plus récent que le dernier import, du plus ancien au plus récent.
 */
export function pageReachedCursor(page: LemlistActivity[], cursor: string | null): boolean {
  return !!cursor && page.some(a => a.createdAt <= cursor)
}

export function newSince(all: LemlistActivity[], cursor: string | null): MappedActivity[] {
  return all
    .filter(a => !cursor || a.createdAt > cursor)
    .map(mapLemlistActivity)
    .filter((m): m is MappedActivity => !!m)
    .sort((x, y) => x.occurredAt.localeCompare(y.occurredAt))
}

/** Nom de la société à créer pour un lead inconnu : celui donné dans Lemlist, sinon le domaine. */
export function companyNameFor(lead: MappedActivity['lead']): string | null {
  return lead.companyName ?? lead.domain
}

export const SYNC_EVERY_MS = 15 * 60 * 1000

export function syncIsDue(lastRunAt: string | null, now: Date): boolean {
  return !lastRunAt || now.getTime() - Date.parse(lastRunAt) >= SYNC_EVERY_MS
}

// ─── Chronologie : envois et ouvertures regroupés ────────────────────────────

/** Événements nombreux et peu parlants pris un par un : regroupés quand ils se suivent. */
export const GROUPED_EVENTS = new Set<string>(['emailsSent', 'emailsOpened'])

type Groupable = { id: string; source: string; event?: string | null; label: string; summary: string | null; title: string | null; at: string }

/**
 * Dans une chronologie triée du plus récent au plus ancien, les envois et ouvertures Lemlist qui se suivent
 * deviennent une seule ligne : « Lemlist · 3 emails envoyés, 2 ouvertures », campagne(s) en résumé.
 */
export function groupLemlistNoise<T extends Groupable>(items: T[]): T[] {
  const out: T[] = []
  let run: T[] = []
  const flush = () => {
    if (run.length === 1) out.push(run[0])
    else if (run.length > 1) {
      const sent = run.filter(r => r.event === 'emailsSent').length
      const opened = run.length - sent
      const parts = [sent && `${sent} email${sent > 1 ? 's' : ''} envoyé${sent > 1 ? 's' : ''}`, opened && `${opened} ouverture${opened > 1 ? 's' : ''}`].filter(Boolean)
      const campaigns = [...new Set(run.map(r => r.summary).filter(Boolean))]
      out.push({ ...run[0], id: `${run[0].id}+${run.length}`, label: `Lemlist · ${parts.join(', ')}`, title: null, summary: campaigns.join(' · ') || null })
    }
    run = []
  }
  for (const it of items) {
    if (it.source === 'lemlist' && it.event && GROUPED_EVENTS.has(it.event)) run.push(it)
    else { flush(); out.push(it) }
  }
  flush()
  return out
}
