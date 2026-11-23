// Base outbound hors pré-pipe : niveau de chaleur de chaque société d'après ses événements Lemlist, avancement dans la
// séquence, filtres de la page « Ajouter des leads ». Fonctions pures, testées.
import { sequenceProgress, type LeadStatus } from '@/lib/crm-prepipe'

/** Du plus chaud au plus froid. « froid » = jamais passé par Lemlist. */
export const WARMTHS = ['interesse', 'repondu', 'clique', 'ouvert', 'en_sequence', 'froid'] as const
export type Warmth = (typeof WARMTHS)[number]
export const WARMTH_LABEL: Record<Warmth, string> = {
  interesse: 'Intéressé', repondu: 'A répondu', clique: 'A cliqué', ouvert: 'A ouvert', en_sequence: 'En séquence', froid: 'Froid',
}
export const WARMTH_HINT: Record<Warmth, string> = {
  interesse: 'Marqué intéressé dans Lemlist', repondu: 'A répondu à un email ou un message LinkedIn', clique: 'A cliqué un lien',
  ouvert: 'A ouvert un email', en_sequence: 'A reçu des emails, sans réaction', froid: 'Jamais passé par Lemlist',
}

/** Signaux qui écartent la société par défaut (affichables avec « Montrer les écartés »). */
export const FLAGS = ['pas_interesse', 'rejete', 'desinscrit'] as const
export type Flag = (typeof FLAGS)[number]
export const FLAG_LABEL: Record<Flag, string> = { pas_interesse: 'Pas intéressé', rejete: 'Email rejeté', desinscrit: 'Désinscrit' }

export type OutboundEvent = { event: string | null; campaignId: string | null; sequenceStep: number | null; occurredAt: string }
export type OutboundProfile = { warmth: Warmth; progress: number | null; flags: Flag[]; lastEventAt: string | null }

const has = (events: OutboundEvent[], ...names: string[]) => events.some(e => e.event && names.includes(e.event))

/**
 * Chaleur (la réaction la plus forte), avancement le plus haut parmi ses campagnes (null si la séquence est inconnue),
 * signaux d'exclusion et date du dernier événement.
 */
export function outboundProfile(events: OutboundEvent[], sequences: Map<string, string[]>): OutboundProfile {
  const warmth: Warmth =
    has(events, 'emailsInterested', 'linkedinInterested') ? 'interesse'
      : has(events, 'emailsReplied', 'linkedinReplied') ? 'repondu'
        : has(events, 'emailsClicked') ? 'clique'
          : has(events, 'emailsOpened') ? 'ouvert'
            : events.length ? 'en_sequence' : 'froid'

  const reached = new Map<string, number>()
  for (const e of events) {
    if ((e.event === 'emailsSent' || e.event === 'linkedinSent') && e.campaignId && typeof e.sequenceStep === 'number') {
      reached.set(e.campaignId, Math.max(reached.get(e.campaignId) ?? -1, e.sequenceStep))
    }
  }
  let progress: number | null = null
  for (const [campaignId, index] of reached) {
    const steps = sequences.get(campaignId)
    if (steps) progress = Math.max(progress ?? 0, sequenceProgress(steps, index))
  }

  const flags: Flag[] = []
  if (has(events, 'emailsNotInterested', 'linkedinNotInterested')) flags.push('pas_interesse')
  if (has(events, 'emailsBounced')) flags.push('rejete')
  if (has(events, 'emailsUnsubscribed')) flags.push('desinscrit')

  const lastEventAt = events.reduce<string | null>((m, e) => (!m || e.occurredAt > m ? e.occurredAt : m), null)
  return { warmth, progress, flags, lastEventAt }
}

/** Étape et signal d'entrée dans le pré-pipe quand l'équipe choisit la société. */
export function selectionEntry(warmth: Warmth): { status: LeadStatus; signal: string } {
  if (warmth === 'interesse') return { status: 'connecte', signal: 'interested' }
  if (warmth === 'repondu') return { status: 'connecte', signal: 'replied' }
  if (warmth === 'clique') return { status: 'a_contacter', signal: 'clicked' }
  return { status: 'a_contacter', signal: 'selection' }
}

export type OutboundRow = OutboundProfile & {
  id: string; name: string; industry: string | null
  segment: string | null; batchId: string | null; batchLabel: string | null; angle: string | null
  contact: { name: string; title: string | null } | null; contacts: number; phones: number
}

/** '' = tous ; NONE = sans segment / sans batch. */
export const NONE = '__aucun'

export type OutboundFilter = {
  segment: string; batchId: string; warmths: Warmth[]; minProgress: number; withPhone: boolean; showFlagged: boolean
}

export const DEFAULT_FILTER: OutboundFilter = { segment: '', batchId: '', warmths: [], minProgress: 0, withPhone: false, showFlagged: false }

export function filterOutbound(rows: OutboundRow[], f: OutboundFilter): OutboundRow[] {
  return rows.filter(r =>
    (!f.segment || (f.segment === NONE ? !r.segment : r.segment === f.segment))
    && (!f.batchId || (f.batchId === NONE ? !r.batchId : r.batchId === f.batchId))
    && (!f.warmths.length || f.warmths.includes(r.warmth))
    && (f.minProgress <= 0 || (r.progress ?? 0) >= f.minProgress - 1e-9)
    && (!f.withPhone || r.phones > 0)
    && (f.showFlagged || !r.flags.length))
}

/** Les plus chauds d'abord, puis les plus avancés dans la séquence, puis l'activité la plus récente. */
export function sortOutbound(rows: OutboundRow[]): OutboundRow[] {
  const rank = (w: Warmth) => WARMTHS.indexOf(w)
  return [...rows].sort((a, b) => rank(a.warmth) - rank(b.warmth) || (b.progress ?? -1) - (a.progress ?? -1) || (b.lastEventAt ?? '').localeCompare(a.lastEventAt ?? ''))
}
