// Liste des dossiers du back-office (/admin) : onglets, dernière action, recherche, pagination.
// Fonctions pures : la page charge les dossiers, tout le reste se décide ici.
import { RS, isRequestStatus, type RequestStatus } from '@/lib/status'
import { requestLabel } from '@/lib/request-label'

export const ADMIN_PAGE_SIZE = 50

/** Statuts qui attendent une action de l'équipe (une contre-offre acceptée repasse en offer_selected). */
export const ADMIN_TODO_STATUSES: RequestStatus[] = [RS.submitted, RS.no_match, RS.offer_selected, RS.seela_validated]

export type AdminTab = 'todo' | 'all'

type OfferRow = {
  leaser_name: string | null
  monthly_payment: number | null
  duration_months: number | null
  selected: boolean | null
  confirmed_at?: string | null
  seela_validated_at?: string | null
  leaser_confirmed_at?: string | null
}

export type AdminRequestRow = {
  id: string
  user_id?: string | null
  status: string | null
  total_amount: number | null
  duration_months: number | null
  created_at: string
  updated_at: string | null
  profiles: { company_name: string | null; siren: string | null } | null
  offers: OfferRow[] | null
}

export type AdminRequest = {
  id: string
  userId: string | null
  ref: string
  status: string | null
  companyName: string | null
  siren: string | null
  amount: number | null
  duration: number | null
  leaserName: string | null
  monthly: number | null
  createdAt: string
  lastActionAt: string
}

/** Dernière date connue : création, mise à jour, ou étape d'une offre (confirmation, validation, leaser). */
export function lastActionAt(row: AdminRequestRow): string {
  const dates = [row.created_at, row.updated_at]
  for (const o of row.offers ?? []) dates.push(o.confirmed_at ?? null, o.seela_validated_at ?? null, o.leaser_confirmed_at ?? null)
  return dates
    .filter((d): d is string => !!d && !Number.isNaN(Date.parse(d)))
    .reduce((max, d) => (Date.parse(d) > Date.parse(max) ? d : max), row.created_at)
}

export function toAdminRequest(row: AdminRequestRow): AdminRequest {
  const selected = row.offers?.find(o => o.selected) ?? null
  return {
    id: row.id,
    userId: row.user_id ?? null,
    ref: requestLabel(row),
    status: row.status,
    companyName: row.profiles?.company_name?.trim() || null,
    siren: row.profiles?.siren?.trim() || null,
    amount: row.total_amount,
    duration: selected?.duration_months ?? row.duration_months,
    leaserName: selected?.leaser_name ?? null,
    monthly: selected?.monthly_payment ?? null,
    createdAt: row.created_at,
    lastActionAt: lastActionAt(row),
  }
}

// Minuscules, sans accents, sans espaces superflus
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Recherche par référence (C-XXXX-XXXX ou début d'id), raison sociale ou SIREN. */
export function matchesSearch(r: AdminRequest, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const compact = q.replace(/[\s-]/g, '')
  const digits = q.replace(/\D/g, '')
  return (
    r.ref.toLowerCase().replace(/-/g, '').includes(compact) ||
    r.id.toLowerCase().startsWith(compact) ||
    (!!r.companyName && normalize(r.companyName).includes(q)) ||
    (digits.length >= 3 && !!r.siren && r.siren.replace(/\D/g, '').includes(digits))
  )
}

export type AdminListParams = { tab: AdminTab; status: RequestStatus | null; query: string; page: number }

/** Lit les paramètres d'URL ; toute valeur inconnue retombe sur le défaut. */
export function parseAdminListParams(sp: Record<string, string | string[] | undefined>): AdminListParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? ''
  const status = one('status')
  const page = Number.parseInt(one('page'), 10)
  return {
    tab: one('tab') === 'all' ? 'all' : 'todo',
    status: isRequestStatus(status) ? status : null,
    query: one('q').slice(0, 100),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  }
}

/**
 * « À traiter » : statuts en attente de l'équipe, le plus ancien en tête (dernière action).
 * « Tous » : filtre de statut optionnel, les plus récents en tête (création).
 */
export function listAdminRequests(requests: AdminRequest[], params: AdminListParams) {
  const filtered = requests.filter(r => {
    if (params.tab === 'todo' && !ADMIN_TODO_STATUSES.some(s => s === r.status)) return false
    if (params.tab === 'all' && params.status && r.status !== params.status) return false
    return matchesSearch(r, params.query)
  })
  const sorted = [...filtered].sort((a, b) =>
    params.tab === 'todo'
      ? Date.parse(a.lastActionAt) - Date.parse(b.lastActionAt)
      : Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )
  const pageCount = Math.max(1, Math.ceil(sorted.length / ADMIN_PAGE_SIZE))
  const page = Math.min(params.page, pageCount)
  return {
    total: sorted.length,
    page,
    pageCount,
    items: sorted.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE),
  }
}

// Délai avant « en retard », en jours ouvrés (lundi à vendredi, sans les jours fériés).
// 1 jour : le rappel sous 24 h ouvrées promis au client. 2 jours : réponse attendue du leaser.
const OVERDUE_BUSINESS_DAYS: Partial<Record<RequestStatus, number>> = {
  [RS.submitted]: 1,
  [RS.no_match]: 1,
  [RS.offer_selected]: 1,
  [RS.seela_validated]: 2,
}

/** Dossier en attente de l'équipe depuis plus longtemps que le délai de son statut. */
export function isOverdue(status: string | null, lastAction: string, now: Date = new Date()): boolean {
  const days = isRequestStatus(status) ? OVERDUE_BUSINESS_DAYS[status] : undefined
  if (!days) return false
  const deadline = new Date(lastAction)
  for (let left = days; left > 0;) {
    deadline.setUTCDate(deadline.getUTCDate() + 1)
    if (deadline.getUTCDay() !== 0 && deadline.getUTCDay() !== 6) left--
  }
  return now.getTime() > deadline.getTime()
}

/** « aujourd'hui », « hier », « il y a 3 j » ; au-delà de 60 jours, en mois. */
export function sinceLabel(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days <= 60) return `il y a ${days} j`
  return `il y a ${Math.floor(days / 30)} mois`
}
