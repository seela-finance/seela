// Emails des boîtes de l'équipe → CRM : quels messages on garde, extrait lisible, bloc « Emails » d'une fiche.
// Fonctions pures, testées.

export type Address = { address?: string | null; name?: string | null }

export const normalizeAddress = (a: string | null | undefined) => (a ?? '').trim().toLowerCase()

export type Classified = { direction: 'sent' | 'received'; contactEmails: string[] }

/**
 * On ne garde un email que s'il est échangé avec au moins un contact du CRM (expéditeur, destinataire ou copie).
 * Envoyé = l'expéditeur est le propriétaire de la boîte. Les emails perso, newsletters, fournisseurs sont ignorés.
 */
export function classifyMessage(
  m: { from: Address[]; to: Address[]; cc: Address[] },
  mailboxEmail: string,
  contactEmails: Set<string>,
): Classified | null {
  const me = normalizeAddress(mailboxEmail)
  const from = m.from.map(a => normalizeAddress(a.address)).filter(Boolean)
  const all = [...from, ...m.to.map(a => normalizeAddress(a.address)), ...m.cc.map(a => normalizeAddress(a.address))]
  const matched = [...new Set(all.filter(a => a && a !== me && contactEmails.has(a)))]
  if (!matched.length) return null
  return { direction: from.includes(me) ? 'sent' : 'received', contactEmails: matched }
}

/** Texte de l'email sans l'historique cité (« Le … a écrit : », lignes « > »), espaces resserrés, 600 caractères. */
export function excerpt(text: string | null | undefined, max = 600): string | null {
  if (!text) return null
  const lines: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*>/.test(line)) continue
    if (/^\s*(Le .+a écrit\s*:|On .+wrote:|-----\s*Original Message|De\s*:.+)$/i.test(line)) break
    lines.push(line)
  }
  const out = lines.join(' ').replace(/\s+/g, ' ').trim()
  return out ? out.slice(0, max) : null
}

// ─── Bloc « Emails » d'une fiche ─────────────────────────────────────────────

export type MailRow = { id: string; event: string | null; occurred_at: string; title: string | null; body: string | null; metadata: Record<string, unknown> | null }

export type MailSummary = {
  sent: number; received: number; lastExchangeAt: string | null
  /** Après mon dernier email envoyé, le contact a-t-il écrit ? null si rien n'a été envoyé. */
  repliedToLast: boolean | null
  recent: MailRow[]
}

export function summarizeMail(rows: MailRow[]): MailSummary {
  const sorted = [...rows].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  const lastSent = sorted.find(r => r.event === 'sent')
  return {
    sent: sorted.filter(r => r.event === 'sent').length,
    received: sorted.filter(r => r.event === 'received').length,
    lastExchangeAt: sorted[0]?.occurred_at ?? null,
    repliedToLast: lastSent ? sorted.some(r => r.event === 'received' && r.occurred_at > lastSent.occurred_at) : null,
    recent: sorted.slice(0, 5),
  }
}

export const MAIL_SYNC_DAYS = 90

export type FolderState = { uidValidity: string; lastUid: number; contactsAt?: string | null }

/**
 * Relire les 90 derniers jours d'un dossier : premier passage, dossier recréé par le serveur, ou contact ajouté /
 * modifié depuis le dernier passage (un email échangé avant la création du contact doit remonter).
 * Sinon on ne lit que les nouveaux emails. Les doublons sont écartés à l'enregistrement.
 */
export function needsRescan(prev: FolderState | undefined, uidValidity: string, latestContactAt: string | null): boolean {
  if (!prev || prev.uidValidity !== uidValidity) return true
  return !!latestContactAt && (!prev.contactsAt || latestContactAt > prev.contactsAt)
}
