// Fiche dossier du back-office (/admin/dossiers/[id]) : timeline construite à partir de la base.
// Fonctions pures, sans dépendance serveur : testables.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID.test(s)
}

export type DetailOffer = {
  id: string
  leaser_name: string | null
  monthly_payment: number | null
  duration_months: number | null
  rate: number | null
  status: string | null
  selected: boolean | null
  notes: string | null
  confirmed_at: string | null
  seela_validated_at: string | null
  leaser_confirmed_at: string | null
}

export type DetailAdminEvent = {
  id: string
  action: string
  note: string | null
  created_at: string
  adminName: string | null
}

export type TimelineEvent = {
  at: string
  label: string
  detail: string | null
  author: string | null
}

/**
 * Événements datés connus en base : création du dossier, étapes des offres, actions admin.
 * La soumission et les emails ne sont pas encore datés en base : ils n'apparaissent pas (rien d'inventé).
 */
export function buildTimeline(
  request: { created_at: string },
  offers: DetailOffer[],
  events: DetailAdminEvent[],
): TimelineEvent[] {
  const items: TimelineEvent[] = [{ at: request.created_at, label: 'Dossier créé', detail: null, author: 'Client' }]

  for (const o of offers) {
    const leaser = o.leaser_name ?? 'Leaser inconnu'
    if (o.confirmed_at) items.push({ at: o.confirmed_at, label: 'Offre choisie par le client', detail: leaser, author: 'Client' })
    if (o.seela_validated_at) items.push({ at: o.seela_validated_at, label: 'Offre validée et transmise au leaser', detail: leaser, author: 'Everlease' })
    if (o.leaser_confirmed_at) items.push({ at: o.leaser_confirmed_at, label: 'Offre confirmée par le leaser', detail: leaser, author: leaser })
  }

  for (const e of events) {
    items.push({ at: e.created_at, label: e.action, detail: e.note, author: e.adminName ?? 'Admin' })
  }

  return items
    .filter(i => !Number.isNaN(Date.parse(i.at)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}

/** Type d'aperçu du document d'après l'extension du chemin. */
export function documentPreviewKind(path: string | null): 'pdf' | 'image' | null {
  if (!path) return null
  const ext = path.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image'
  return null
}
