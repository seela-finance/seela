// Pièces du dossier (docs/pieces-et-compte.md) : quelles pièces une société doit fournir, à quel moment,
// et ce qu'il manque avant de transmettre un dossier au financeur. Règles décidées avec Louis le 24/11/2026.
// Sans dépendance serveur : testable. Lecture et écriture en base : lib/pieces-store.ts.

export const PIECE_KINDS = ['kbis', 'liasse', 'situation', 'statuts', 'previsionnel', 'identite', 'rib'] as const
export type PieceKind = (typeof PIECE_KINDS)[number]

/** `dossier` : avant transmission au financeur. `contrat` : après son accord, pour la mise en place. */
export type PiecePhase = 'dossier' | 'contrat'

export const PIECE_INFO: Record<PieceKind, { label: string; hint: string; phase: PiecePhase; sensitive: boolean }> = {
  kbis: { label: 'Extrait Kbis', hint: 'De moins de 3 mois', phase: 'dossier', sensitive: false },
  liasse: { label: 'Liasse fiscale', hint: 'Dernier exercice clos (bilan et compte de résultat)', phase: 'dossier', sensitive: false },
  situation: { label: 'Situation comptable intermédiaire', hint: 'Le dernier exercice clos date de plus de 6 mois', phase: 'dossier', sensitive: false },
  statuts: { label: 'Statuts signés', hint: 'Société de moins d’un an', phase: 'dossier', sensitive: false },
  previsionnel: { label: 'Prévisionnel', hint: 'Société de moins d’un an', phase: 'dossier', sensitive: false },
  identite: { label: 'Pièce d’identité du dirigeant', hint: 'Carte d’identité ou passeport, recto verso', phase: 'contrat', sensitive: true },
  rib: { label: 'RIB', hint: 'Compte prélevé pour les loyers', phase: 'contrat', sensitive: true },
}

export const PIECE_STATUSES = ['en_verification', 'validee', 'refusee', 'dispensee'] as const
export type PieceStatus = (typeof PIECE_STATUSES)[number]

export const PIECE_STATUS_LABEL: Record<PieceStatus | 'a_deposer', string> = {
  a_deposer: 'À déposer',
  en_verification: 'En vérification',
  validee: 'Validée',
  refusee: 'Refusée',
  dispensee: 'Non requise',
}

/** Après la décision du financeur, les pièces sensibles sont effacées passé ce délai. */
export const SENSITIVE_RETENTION_DAYS = 30

export type PieceDoc = {
  id: string
  kind: string
  status: string
  path: string | null
  file_name: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
  deleted_at?: string | null
}

export type PieceCompany = { creation_year: number | null }

export const isPieceKind = (v: unknown): v is PieceKind => typeof v === 'string' && (PIECE_KINDS as readonly string[]).includes(v)

/** Société de moins d'un an : on ne connaît que l'année de création, on prend l'année en cours et la précédente. */
export function isYoungCompany(company: PieceCompany, now = new Date()): boolean {
  return company.creation_year != null && company.creation_year >= now.getUTCFullYear() - 1
}

/**
 * Pièces requises pour une phase. Hypothèse : exercice clos au 31/12 ; passé le 30 juin, le dernier exercice
 * clos a plus de 6 mois et une situation intermédiaire s'ajoute. L'équipe peut dispenser une pièce.
 */
export function requiredPieces(company: PieceCompany, phase: PiecePhase, now = new Date()): PieceKind[] {
  if (phase === 'contrat') return ['identite', 'rib']
  if (isYoungCompany(company, now)) return ['kbis', 'statuts', 'previsionnel']
  const afterJune = now.getUTCMonth() >= 6
  return afterJune ? ['kbis', 'liasse', 'situation'] : ['kbis', 'liasse']
}

export type ChecklistRow = { kind: PieceKind; label: string; hint: string; status: PieceStatus | 'a_deposer'; doc: PieceDoc | null; sensitive: boolean }

/** Dernier document vivant de chaque nature (un refus laisse la place à un nouveau dépôt). */
export function latestByKind(docs: PieceDoc[]): Map<string, PieceDoc> {
  const map = new Map<string, PieceDoc>()
  for (const d of [...docs].filter(d => !d.deleted_at).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    map.set(d.kind, d)
  }
  return map
}

/** Une ligne par pièce requise, avec son état. Les pièces déposées hors liste (ex. liasse d'une jeune société) s'ajoutent. */
export function pieceChecklist(company: PieceCompany, docs: PieceDoc[], phase: PiecePhase, now = new Date()): ChecklistRow[] {
  const latest = latestByKind(docs)
  const required = requiredPieces(company, phase, now)
  const extra = [...latest.keys()].filter((k): k is PieceKind => isPieceKind(k) && PIECE_INFO[k].phase === phase && !required.includes(k))
  return [...required, ...extra].map(kind => {
    const doc = latest.get(kind) ?? null
    const status = (doc && (PIECE_STATUSES as readonly string[]).includes(doc.status) ? doc.status : 'a_deposer') as PieceStatus | 'a_deposer'
    return { kind, label: PIECE_INFO[kind].label, hint: PIECE_INFO[kind].hint, status, doc, sensitive: PIECE_INFO[kind].sensitive }
  })
}

/** Pièces de la phase `dossier` qui ne sont ni validées ni dispensées : elles bloquent la transmission. */
export function missingForTransmission(company: PieceCompany, docs: PieceDoc[], now = new Date()): PieceKind[] {
  return pieceChecklist(company, docs, 'dossier', now)
    .filter(r => requiredPieces(company, 'dossier', now).includes(r.kind) && r.status !== 'validee' && r.status !== 'dispensee')
    .map(r => r.kind)
}

/** « 2 pièces sur 3 » pour la bannière du tableau de bord et le suivi du partenaire. */
export function pieceProgress(company: PieceCompany, docs: PieceDoc[], phase: PiecePhase, now = new Date()): { done: number; total: number } {
  const rows = pieceChecklist(company, docs, phase, now).filter(r => requiredPieces(company, phase, now).includes(r.kind))
  return { done: rows.filter(r => r.status === 'validee' || r.status === 'dispensee').length, total: rows.length }
}

/** Libellés des pièces manquantes, pour un message. */
export const pieceLabels = (kinds: PieceKind[]) => kinds.map(k => PIECE_INFO[k].label).join(', ')

export type DecidedRequest = { company_id: string | null; status: string; updated_at: string }

/**
 * Pièces sensibles à effacer : celles d'une société dont le dernier dossier a été tranché par le financeur
 * (accepté, actif ou refusé) depuis plus de 30 jours, sans autre dossier encore en cours.
 */
export function sensitiveDocsToPurge(docs: PieceDoc[], docCompany: (d: PieceDoc) => string, requests: DecidedRequest[], now = new Date()): PieceDoc[] {
  const limit = now.getTime() - SENSITIVE_RETENTION_DAYS * 24 * 3600 * 1000
  const DECIDED = ['leaser_confirmed', 'active', 'refused']
  const OPEN = ['submitted', 'offers_available', 'no_match', 'offer_selected', 'counter_offer', 'seela_validated']
  return docs.filter(d => {
    if (d.deleted_at || !isPieceKind(d.kind) || !PIECE_INFO[d.kind].sensitive) return false
    const mine = requests.filter(r => r.company_id === docCompany(d))
    if (mine.some(r => OPEN.includes(r.status))) return false
    const decided = mine.filter(r => DECIDED.includes(r.status)).map(r => new Date(r.updated_at).getTime())
    return decided.length > 0 && Math.max(...decided) < limit
  })
}
