// Demandes du client sur son contrat (docs/contrat-client.md) : natures, statuts, qui peut demander quoi,
// et l'échéancier indicatif affiché sur la fiche contrat. Sans dépendance serveur : testable.
import { RS } from '@/lib/status'

export const CONTRACT_REQUEST_KINDS = ['report_echeance', 'rachat_anticipe', 'materiel', 'administratif'] as const
export type ContractRequestKind = (typeof CONTRACT_REQUEST_KINDS)[number]

export const CONTRACT_REQUEST_STATUSES = ['recue', 'en_cours', 'repondue', 'close'] as const
export type ContractRequestStatus = (typeof CONTRACT_REQUEST_STATUSES)[number]

export const KIND_INFO: Record<ContractRequestKind, { label: string; hint: string; placeholder: string }> = {
  report_echeance: {
    label: 'Report d’échéance',
    hint: 'Décaler une ou plusieurs échéances. Le financeur décide ; votre conseiller porte la demande.',
    placeholder: 'Quelle(s) échéance(s), et pourquoi ? (ex. : échéance de janvier, trésorerie saisonnière)',
  },
  rachat_anticipe: {
    label: 'Rachat anticipé',
    hint: 'Connaître le montant pour racheter le matériel avant la fin du contrat.',
    placeholder: 'À quelle date envisagez-vous le rachat ?',
  },
  materiel: {
    label: 'Ajout ou remplacement de matériel',
    hint: 'Ajouter un équipement au contrat ou remplacer un matériel en panne ou obsolète.',
    placeholder: 'Quel matériel, pour quel usage ? Un devis du fournisseur accélère l’étude.',
  },
  administratif: {
    label: 'Question administrative',
    hint: 'Attestation, facture, changement de RIB ou d’adresse, question sur une échéance.',
    placeholder: 'Décrivez votre demande.',
  },
}

export const STATUS_INFO: Record<ContractRequestStatus, { label: string; tag: string; client: string }> = {
  recue: { label: 'Reçue', tag: 'ev-tag ev-tag--accent', client: 'Reçue, un conseiller la prend en charge sous 24 h ouvrées.' },
  en_cours: { label: 'En cours', tag: 'ev-tag ev-tag--warning', client: 'En cours de traitement avec le financeur.' },
  repondue: { label: 'Réponse apportée', tag: 'ev-tag ev-tag--ok', client: 'Votre conseiller a répondu.' },
  close: { label: 'Close', tag: 'ev-tag', client: 'Demande close.' },
}

export const OPEN_STATUSES: ContractRequestStatus[] = ['recue', 'en_cours']

export function isContractRequestKind(v: unknown): v is ContractRequestKind {
  return typeof v === 'string' && (CONTRACT_REQUEST_KINDS as readonly string[]).includes(v)
}

export function isContractRequestStatus(v: unknown): v is ContractRequestStatus {
  return typeof v === 'string' && (CONTRACT_REQUEST_STATUSES as readonly string[]).includes(v)
}

/**
 * Natures ouvertes au client selon l'état du dossier : report et rachat n'ont de sens qu'une fois le contrat actif ;
 * matériel et administratif dès l'accord du financeur. Hors phase contrat : aucune.
 */
export function availableKinds(requestStatus: string | null | undefined): ContractRequestKind[] {
  if (requestStatus === RS.active) return [...CONTRACT_REQUEST_KINDS]
  if (requestStatus === RS.leaser_confirmed) return ['materiel', 'administratif']
  return []
}

export const MESSAGE_MIN = 10
export const MESSAGE_MAX = 2000

/** Valide une demande saisie par le client ; message d'erreur en français, ou les valeurs propres. */
export function parseContractRequest(input: { kind: unknown; message: unknown }, requestStatus: string | null | undefined):
  | { ok: true; kind: ContractRequestKind; message: string }
  | { ok: false; error: string } {
  if (!isContractRequestKind(input.kind)) return { ok: false, error: 'Choisissez la nature de votre demande.' }
  if (!availableKinds(requestStatus).includes(input.kind)) return { ok: false, error: 'Cette demande n’est pas possible à ce stade du contrat.' }
  const message = typeof input.message === 'string' ? input.message.replace(/\r\n/g, '\n').trim() : ''
  if (message.length < MESSAGE_MIN) return { ok: false, error: 'Décrivez votre demande en quelques mots (10 caractères minimum).' }
  if (message.length > MESSAGE_MAX) return { ok: false, error: `Votre message dépasse ${MESSAGE_MAX} caractères.` }
  return { ok: true, kind: input.kind, message }
}

/** Transitions de l'équipe : prendre en charge, répondre (depuis tout état ouvert ou déjà répondu), clore. */
export const ADMIN_TRANSITIONS: Record<ContractRequestStatus, ContractRequestStatus[]> = {
  recue: ['en_cours', 'repondue', 'close'],
  en_cours: ['repondue', 'close'],
  repondue: ['en_cours', 'close'],
  close: [],
}

export function canTransition(from: string, to: ContractRequestStatus): boolean {
  return isContractRequestStatus(from) && ADMIN_TRANSITIONS[from].includes(to)
}

export type ContractRequestRow = {
  id: string
  request_id: string
  kind: string
  status: string
  message: string
  answer: string | null
  created_at: string
  answered_at: string | null
  closed_at: string | null
}

export function kindLabel(kind: string): string {
  return isContractRequestKind(kind) ? KIND_INFO[kind].label : kind
}

export function statusInfo(status: string) {
  return isContractRequestStatus(status) ? STATUS_INFO[status] : { label: status, tag: 'ev-tag', client: '' }
}

/** Ce que voit le partenaire : la nature et l'état des demandes ouvertes, jamais le contenu. */
export function partnerSummary(rows: Pick<ContractRequestRow, 'kind' | 'status'>[]): string | null {
  const open = rows.filter(r => OPEN_STATUSES.some(s => s === r.status))
  if (open.length === 0) return null
  return open.map(r => `${kindLabel(r.kind)} · ${statusInfo(r.status).label.toLowerCase()}`).join(' ; ')
}

// ─── Échéancier indicatif ──────────────────────────────────────────────────

export type ScheduleLine = { index: number; date: string; amount: number; state: 'passee' | 'prochaine' | 'a_venir' }

export type Schedule = {
  lines: ScheduleLine[]
  paid: number
  remaining: number
  next: ScheduleLine | null
  end: string | null
}

function addMonths(start: string, months: number): string {
  const [y, m, d] = start.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + months, d))
  if (date.getUTCDate() !== d) date.setUTCDate(0)
  return date.toISOString().slice(0, 10)
}

/**
 * Échéancier mensuel indicatif : première échéance à la date de démarrage, puis chaque mois. Les échéances
 * passées sont réputées réglées (le vrai état est chez le financeur). Sans date de démarrage : rien.
 */
export function buildSchedule(start: string | null, months: number | null, monthly: number | null, today = new Date()): Schedule | null {
  if (!start || !months || months <= 0 || monthly == null || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return null
  const todayIso = today.toISOString().slice(0, 10)
  const lines: ScheduleLine[] = []
  let nextFound = false
  for (let i = 0; i < months; i++) {
    const date = addMonths(start, i)
    let state: ScheduleLine['state'] = 'a_venir'
    if (date < todayIso) state = 'passee'
    else if (!nextFound) { state = 'prochaine'; nextFound = true }
    lines.push({ index: i + 1, date, amount: monthly, state })
  }
  const paid = lines.filter(l => l.state === 'passee').length
  return {
    lines,
    paid,
    remaining: months - paid,
    next: lines.find(l => l.state === 'prochaine') ?? null,
    end: lines[lines.length - 1]?.date ?? null,
  }
}
