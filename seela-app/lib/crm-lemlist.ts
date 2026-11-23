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
  messagePreview?: string | null; outOfOfficeEndsAt?: string | null; messageId?: string | null; contactId?: string | null; sendUserName?: string | null; sendUserEmail?: string | null; sequenceStep?: number | null; leadId?: string | null
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
  // L'aperçu Lemlist ne fait que quelques mots : le contenu des emails vient de la boîte Lemlist (fetchInbox)
  const withText = ['linkedinSent', 'linkedinReplied', 'outOfOffice'].includes(a.type)
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
    body: withText ? clean(a.messagePreview, 5000) : null,
    metadata: { campaignId: a.campaignId ?? null, campaignName: a.campaignName ?? null, sendUserEmail: a.sendUserEmail ?? null, sequenceStep: a.sequenceStep ?? null, leadId: a.leadId ?? null, outOfOfficeEndsAt: a.outOfOfficeEndsAt ?? null, messageId: a.messageId ?? null, lemlistContactId: a.contactId ?? null },
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

/**
 * Découpe les événements (déjà triés du plus ancien au plus récent) en tranches d'environ `size`, sans jamais séparer
 * deux événements de même date : la reprise se fait sur la date du dernier événement traité.
 */
export function chunkByTime<T extends { occurredAt: string }>(events: T[], size: number): T[][] {
  const out: T[][] = []
  let cur: T[] = []
  for (const e of events) {
    if (cur.length >= size && cur.at(-1)!.occurredAt !== e.occurredAt) { out.push(cur); cur = [] }
    cur.push(e)
  }
  if (cur.length) out.push(cur)
  return out
}

/** Nom de la société à créer pour un lead inconnu : celui donné dans Lemlist, sinon le domaine. */
export function companyNameFor(lead: MappedActivity['lead']): string | null {
  return lead.companyName ?? lead.domain
}

export const SYNC_EVERY_MS = 15 * 60 * 1000

/** Durée au-delà de laquelle une synchro démarrée est considérée comme interrompue (le serveur la coupe à 5 min). */
export const SYNC_LOCK_MS = 6 * 60 * 1000

export function syncIsRunning(runningSince: string | null, now: Date): boolean {
  return !!runningSince && now.getTime() - Date.parse(runningSince) < SYNC_LOCK_MS
}

export function syncIsDue(lastRunAt: string | null, now: Date): boolean {
  return !lastRunAt || now.getTime() - Date.parse(lastRunAt) >= SYNC_EVERY_MS
}

// ─── Bloc « Prospection Lemlist » d'une fiche ────────────────────────────────

export type LemlistRow = { id?: string; event: string | null; occurred_at: string; title?: string | null; body: string | null; metadata: Record<string, unknown> | null }

export type LemlistSummary = {
  sent: number; opened: number; clicked: number; replied: number
  interested: boolean | null
  bounced: boolean; unsubscribed: boolean; antiSpam: boolean; outOfOffice: string | null | false
  linkedinInvited: boolean; linkedinAccepted: boolean; linkedinMessages: number; linkedinReplies: number
  campaigns: string[]; lastActivityAt: string | null; lastSentAt: string | null; lastReply: { at: string; text: string | null } | null
  /** Emails envoyés et réponses, du plus récent au plus ancien (30 au plus). */
  emails: LemlistRow[]
}

/** Compteurs et indicateurs d'une fiche à partir de ses événements Lemlist. Intéressé : le dernier avis l'emporte. */
export function summarizeLemlist(rows: LemlistRow[]): LemlistSummary {
  const sorted = [...rows].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
  const count = (...events: string[]) => sorted.filter(r => r.event && events.includes(r.event)).length
  const has = (...events: string[]) => count(...events) > 0
  const last = (...events: string[]) => [...sorted].reverse().find(r => r.event && events.includes(r.event)) ?? null
  const verdict = last('emailsInterested', 'emailsNotInterested', 'linkedinInterested', 'linkedinNotInterested')
  const ooo = last('outOfOffice')
  const reply = last('emailsReplied', 'linkedinReplied')
  const campaigns = [...new Set(sorted.map(r => r.metadata?.campaignName).filter((c): c is string => typeof c === 'string' && !!c.trim()).map(c => c.trim()))]
  return {
    sent: count('emailsSent'), opened: count('emailsOpened'), clicked: count('emailsClicked'), replied: count('emailsReplied'),
    interested: verdict ? verdict.event === 'emailsInterested' || verdict.event === 'linkedinInterested' : null,
    bounced: has('emailsBounced'), unsubscribed: has('emailsUnsubscribed'), antiSpam: has('mailinblackDetected'),
    outOfOffice: ooo ? (typeof ooo.metadata?.outOfOfficeEndsAt === 'string' ? ooo.metadata.outOfOfficeEndsAt : null) : false,
    linkedinInvited: has('linkedinInviteDone'), linkedinAccepted: has('linkedinInviteAccepted'),
    linkedinMessages: count('linkedinSent'), linkedinReplies: count('linkedinReplied'),
    campaigns, lastActivityAt: sorted.at(-1)?.occurred_at ?? null, lastSentAt: last('emailsSent')?.occurred_at ?? null,
    lastReply: reply ? { at: reply.occurred_at, text: reply.body } : null,
    emails: [...sorted].reverse().filter(r => r.event === 'emailsSent' || r.event === 'emailsReplied').slice(0, 30),
  }
}

// ─── Contenu complet des emails (boîte Lemlist d'un contact : GET /api/inbox/{contactId}) ──────

export type LemlistInboxMessage = { messageId?: string | null; type?: string | null; message?: string | null; subject?: string | null; createdAt?: string | null }

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }

/**
 * HTML d'un email → texte lisible, sans l'historique cité (bloc de citation Gmail / Outlook / Apple, « Le … a écrit : »).
 * Paragraphes conservés, 10 000 caractères au plus.
 */
export function emailHtmlToText(html: string | null | undefined): string | null {
  if (!html) return null
  let s = html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<div[^>]*class="[^"]*(gmail_quote|gmail_extra)[^"]*"[\s\S]*$/i, '')
    .replace(/<blockquote[\s\S]*$/i, '')
    .replace(/<div[^>]*id="(divRplyFwdMsg|appendonsend)"[\s\S]*$/i, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<\/(td|th|span|a)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e.toLowerCase()] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1).replace(/^x/i, '0x'))) : m))
  const lines: string[] = []
  for (const line of s.split('\n')) {
    if (/^\s*(Le .+a écrit\s*:|On .+wrote:|-{2,}\s*(Original Message|Message d.origine)|De\s*:\s.+|From:\s.+)\s*$/i.test(line)) break
    if (/^\s*>/.test(line)) continue
    lines.push(line.replace(/[ \t\u00a0]+/g, ' ').trim())
  }
  s = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return s ? s.slice(0, 10000) : null
}

// ─── Fiche du lead Lemlist (GET /api/leads/{email}) → champs du contact et de la société ─────

export type LemlistLead = {
  contactId?: string | null; firstName?: string | null; lastName?: string | null; jobTitle?: string | null; linkedinUrl?: string | null
  tagline?: string | null; location?: string | null; companyName?: string | null; companyDomain?: string | null; companyIndustry?: string | null
  companySize?: string | null; companyFoundedOn?: string | number | null; companyLocation?: string | null; companyDescription?: string | null
  companyLinkedinUrl?: string | null
}

const txt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const url = (v: unknown) => { const s = txt(v, 500); return s && /^https?:\/\//i.test(s) ? s : s ? `https://${s.replace(/^\/+/, '')}` : null }

export function mapLemlistLead(l: LemlistLead) {
  const year = Number(String(l.companyFoundedOn ?? '').match(/\d{4}/)?.[0])
  return {
    contact: {
      first_name: txt(l.firstName, 100), last_name: txt(l.lastName, 100), job_title: txt(l.jobTitle, 200), linkedin_url: url(l.linkedinUrl),
      headline: txt(l.tagline, 300), location: txt(l.location, 200), lemlist_contact_id: txt(l.contactId, 100),
    },
    company: {
      lemlist_industry: txt(l.companyIndustry, 200), headcount_bracket: txt(l.companySize, 50),
      creation_year: Number.isInteger(year) && year > 1800 && year <= 2100 ? year : null,
      location: txt(l.companyLocation, 200), description: txt(l.companyDescription, 3000), linkedin_url: url(l.companyLinkedinUrl),
    },
  }
}

/** Ne garde que ce qui remplit un champ vide : une saisie de l'équipe n'est jamais écrasée. */
export function fillEmpty<T extends Record<string, unknown>>(existing: Record<string, unknown>, patch: T): Partial<T> {
  const out: Partial<T> = {}
  for (const k of Object.keys(patch) as (keyof T & string)[]) {
    const v = patch[k]
    const cur = existing[k]
    if (v !== null && v !== undefined && (cur === null || cur === undefined || cur === '')) out[k] = v
  }
  return out
}
