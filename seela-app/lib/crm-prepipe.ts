// Pré-pipe de prospection (lead status sur la société) : étapes, effet des issues d'appel, entrée depuis Lemlist,
// liste « À appeler aujourd'hui ». Fonctions pures, testées. Le CRM ne fait jamais sortir un lead tout seul :
// seules l'issue « société disqualifiée » ou une décision manuelle le font.

export const LEAD_STATUSES = ['a_contacter', 'qualification', 'tentative', 'connecte', 'rdv_pris', 'pas_maintenant', 'disqualifie'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  a_contacter: 'À contacter', qualification: 'Analyse de qualification', tentative: 'Tentative de contact',
  connecte: 'Connecté', rdv_pris: 'RDV pris', pas_maintenant: 'Pas maintenant', disqualifie: 'Disqualifié',
}
/** Étapes où la société est à travailler (les autres sont des sorties décidées par l'équipe). */
export const ACTIVE_STATUSES: LeadStatus[] = ['a_contacter', 'qualification', 'tentative', 'connecte']

export const LEAD_CHANNELS = ['inbound', 'outbound'] as const
export type LeadChannel = (typeof LEAD_CHANNELS)[number]
export const LEAD_CHANNEL_LABEL: Record<LeadChannel, string> = { inbound: 'Inbound', outbound: 'Outbound' }

export const EXIT_REASONS = ['Pas la cible', 'Pas de besoin', 'Déjà équipé ou financé', 'Injoignable', 'Choisit un concurrent', 'Autre'] as const

export const LEAD_SIGNAL_LABEL: Record<string, string> = {
  interested: 'Intéressé (Lemlist)', replied: 'A répondu (Lemlist)', clicked: 'A cliqué (Lemlist)', sequence: 'Séquence à 60 %',
  inscription: 'Inscrit sur l’app', expert: 'Formulaire expert', manuel: 'Ajout manuel', appel: 'Appel',
}

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === 'string' && (LEAD_STATUSES as readonly string[]).includes(v)
}

// Rang dans le pré-pipe : un automatisme ne fait jamais reculer une société. Les sorties (pas maintenant,
// disqualifié) et l'absence de statut ont le rang 0 : un nouvel appel ou un signal y fait revenir la société.
const RANK: Record<LeadStatus, number> = { a_contacter: 1, qualification: 1, tentative: 2, connecte: 3, rdv_pris: 4, pas_maintenant: 0, disqualifie: 0 }

export function forward(current: string | null, target: LeadStatus): LeadStatus {
  if (!isLeadStatus(current)) return target
  return RANK[target] > RANK[current] ? target : current
}

/** Lead status après un appel. « Société disqualifiée » est la seule issue qui fait sortir la société. */
export function statusAfterCall(current: string | null, outcome: string): LeadStatus {
  if (outcome === 'societe_disqualifiee') return 'disqualifie'
  const target: LeadStatus | null =
    outcome === 'pas_de_reponse' || outcome === 'messagerie' ? 'tentative'
      : outcome === 'pas_interesse' || outcome === 'a_rappeler' || outcome === 'interesse' ? 'connecte'
        : outcome === 'rdv_pris' ? 'rdv_pris'
          : null
  if (!target) return isLeadStatus(current) ? current : 'a_contacter'
  return forward(current, target)
}

// ─── Entrée depuis Lemlist ───────────────────────────────────────────────────

/** Étapes comptées pour l'avancement : emails et messages LinkedIn (pas les invitations, visites, appels, tâches). */
export const COUNTED_STEP_TYPES = new Set(['email', 'linkedinSend'])
export const DEFAULT_SEQUENCE_THRESHOLD = 0.6

/**
 * Avancement d'un lead dans sa séquence : étapes comptées déjà atteintes ÷ étapes comptées de la séquence.
 * `stepTypes` = types des étapes dans l'ordre de la séquence ; `reachedIndex` = plus haute étape atteinte (index Lemlist).
 */
export function sequenceProgress(stepTypes: string[], reachedIndex: number): number {
  const counted = stepTypes.map((t, i) => ({ t, i })).filter(s => COUNTED_STEP_TYPES.has(s.t))
  if (!counted.length) return 0
  return counted.filter(s => s.i <= reachedIndex).length / counted.length
}

export type LeadEvent = { event: string | null; campaignId: string | null; sequenceStep: number | null }

/**
 * Signal d'entrée dans le pré-pipe outbound (le plus fort l'emporte) et étape visée.
 * Intéressé ou réponse → Connecté ; clic ou séquence à 60 % → À contacter. null = pas (encore) d'entrée.
 */
export function lemlistEntry(events: LeadEvent[], sequences: Map<string, string[]>, threshold = DEFAULT_SEQUENCE_THRESHOLD): { signal: string; status: LeadStatus } | null {
  const has = (...e: string[]) => events.some(x => x.event && e.includes(x.event))
  if (has('emailsInterested', 'linkedinInterested')) return { signal: 'interested', status: 'connecte' }
  if (has('emailsReplied', 'linkedinReplied')) return { signal: 'replied', status: 'connecte' }
  if (has('emailsClicked')) return { signal: 'clicked', status: 'a_contacter' }
  const reached = new Map<string, number>()
  for (const e of events) {
    if ((e.event === 'emailsSent' || e.event === 'linkedinSent') && e.campaignId && typeof e.sequenceStep === 'number') {
      reached.set(e.campaignId, Math.max(reached.get(e.campaignId) ?? -1, e.sequenceStep))
    }
  }
  for (const [campaignId, index] of reached) {
    const steps = sequences.get(campaignId)
    if (steps && sequenceProgress(steps, index) >= threshold - 1e-9) return { signal: 'sequence', status: 'a_contacter' }
  }
  return null
}

// ─── À appeler aujourd'hui ───────────────────────────────────────────────────

export type CallCandidate = {
  id: string; lead_status: string | null; lead_signal: string | null; lead_entered_at: string | null; lead_next_date: string | null
  attempts: number; lastCallAt: string | null
}

const STRONG = new Set(['interested', 'replied', 'clicked'])

/**
 * Priorité (petit = en premier) : 1 signal fort, 2 relance « pas maintenant » arrivée, 3 entré il y a moins de 48 h,
 * 4 le reste. Puis moins de tentatives d'abord, puis appel le plus ancien d'abord. Les sociétés hors pré-pipe actif
 * (sauf relance arrivée) ne sont pas proposées.
 */
export function callPriority(c: CallCandidate, now: Date): number | null {
  const today = now.toISOString().slice(0, 10)
  if (c.lead_status === 'pas_maintenant') return c.lead_next_date && c.lead_next_date <= today ? 2 : null
  if (!c.lead_status || !(ACTIVE_STATUSES as string[]).includes(c.lead_status)) return null
  if (c.lead_signal && STRONG.has(c.lead_signal)) return 1
  if (c.lead_entered_at && now.getTime() - Date.parse(c.lead_entered_at) < 48 * 3600_000) return 3
  return 4
}

export function buildCallList<T extends CallCandidate>(items: T[], now: Date): (T & { priority: number })[] {
  return items
    .map(c => ({ ...c, priority: callPriority(c, now) }))
    .filter((c): c is T & { priority: number } => c.priority !== null)
    .sort((a, b) => a.priority - b.priority || a.attempts - b.attempts || (a.lastCallAt ?? '').localeCompare(b.lastCallAt ?? ''))
}

/**
 * Ordre d'une session d'appels sur les statuts choisis : même priorité que « À appeler aujourd'hui »
 * (les statuts hors liste du jour passent après), puis moins d'appels, puis appel le plus ancien.
 */
export function orderForSession<T extends CallCandidate & { lead_channel: string | null }>(
  items: T[], statuses: string[], channel: string | null, now: Date,
): T[] {
  return items
    .filter(c => c.lead_status && statuses.includes(c.lead_status) && (!channel || c.lead_channel === channel))
    .map(c => ({ c, p: callPriority(c, now) ?? 5 }))
    .sort((a, b) => a.p - b.p || a.c.attempts - b.c.attempts || (a.c.lastCallAt ?? '').localeCompare(b.c.lastCallAt ?? ''))
    .map(x => x.c)
}

/** Tag Lemlist d'un contact pendant l'appel : la réaction la plus forte. */
export function contactReaction(events: (string | null)[]): string | null {
  if (events.some(e => e === 'emailsInterested' || e === 'linkedinInterested')) return 'Intéressé'
  if (events.some(e => e === 'emailsReplied' || e === 'linkedinReplied')) return 'A répondu'
  if (events.includes('emailsClicked')) return 'A cliqué'
  if (events.includes('emailsOpened')) return 'A ouvert'
  return null
}
