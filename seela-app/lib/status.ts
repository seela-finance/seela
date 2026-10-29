// Source unique des statuts de dossier (financing_requests.status) et d'offre (offers.status) :
// libellés client, badges, destination depuis le dashboard, transitions autorisées.
// Ne jamais écrire une chaîne de statut en dur ailleurs : utiliser RS.* / OS.*.

export type Actor = 'client' | 'admin' | 'system'

type Badge = { label: string; color: string; bg: string; dot: string }

const GRAY = { color: '#9A9A93', bg: '#F5F5F4', dot: '#D1D1CE' }
const YELLOW = { color: '#854D0E', bg: '#FEF9C3', dot: '#D97706' }
const INDIGO = { color: '#3730A3', bg: '#EEF2FF', dot: '#4F46E5' }
const ORANGE = { color: '#92400E', bg: '#FFF7ED', dot: '#D97706' }
const GREEN = { color: '#166534', bg: '#F0FDF4', dot: '#16A34A' }
const RED = { color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' }

// ── Dossiers ─────────────────────────────────────────────────────────

export const REQUEST_STATUSES = [
  'draft',
  'submitted',
  'offers_available',
  'no_match',
  'offer_selected',
  'counter_offer',
  'seela_validated',
  'leaser_confirmed',
  'active',
  'refused',
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

/** RS.offers_available === 'offers_available' — à utiliser au lieu des chaînes en dur. */
export const RS = Object.fromEntries(REQUEST_STATUSES.map(s => [s, s])) as { [K in RequestStatus]: K }

/** Où vit le dossier côté client : brouillon, onglet Offres, onglet Contrats, ou clos. */
export type RequestSection = 'draft' | 'offres' | 'contrats' | 'closed'

export const REQUEST_STATUS: Record<RequestStatus, Badge & { section: RequestSection }> = {
  draft:            { label: 'Brouillon',                     section: 'draft',    ...GRAY },
  submitted:        { label: 'Transmis',                      section: 'offres',   ...YELLOW },
  offers_available: { label: 'Offres disponibles',            section: 'offres',   ...INDIGO },
  no_match:         { label: 'Étude par un conseiller',       section: 'offres',   ...YELLOW },
  offer_selected:   { label: 'Offre sélectionnée',            section: 'offres',   ...ORANGE },
  counter_offer:    { label: 'Contre-proposition à examiner', section: 'offres',   ...INDIGO },
  seela_validated:  { label: 'En cours de validation',        section: 'offres',   ...ORANGE },
  leaser_confirmed: { label: 'En attente de démarrage',       section: 'contrats', ...ORANGE },
  active:           { label: 'Actif',                         section: 'contrats', ...GREEN },
  refused:          { label: 'Non retenu',                    section: 'closed',   ...RED },
}

const UNKNOWN_REQUEST: Badge & { section: RequestSection } = { label: 'En cours', section: 'offres', ...GRAY }

export function isRequestStatus(s: unknown): s is RequestStatus {
  return typeof s === 'string' && (REQUEST_STATUSES as readonly string[]).includes(s)
}

/** Libellé, couleurs et section d'un statut lu en base (statut inconnu → « En cours », gris). */
export function requestStatusInfo(status: string | null | undefined) {
  return isRequestStatus(status) ? REQUEST_STATUS[status] : UNKNOWN_REQUEST
}

export function requestStatusesIn(section: RequestSection): RequestStatus[] {
  return REQUEST_STATUSES.filter(s => REQUEST_STATUS[s].section === section)
}

/** Page client d'un dossier. Un statut inconnu ne mène jamais à la fiche contrat. */
export function requestDestination(id: string, status: string | null | undefined): string {
  switch (requestStatusInfo(status).section) {
    case 'draft':
      return `/app/nouveau?request=${id}`
    case 'contrats':
      return `/app/contrats/${id}`
    default:
      return `/app/offres/${id}`
  }
}

type Transition<S> = { to: S; by: Actor[] }

export const REQUEST_TRANSITIONS: Record<RequestStatus, Transition<RequestStatus>[]> = {
  draft: [{ to: 'submitted', by: ['client'] }],
  submitted: [
    { to: 'offers_available', by: ['system'] },
    { to: 'no_match', by: ['system'] },
    { to: 'refused', by: ['admin'] },
  ],
  offers_available: [
    { to: 'offer_selected', by: ['client'] },
    { to: 'refused', by: ['admin'] },
  ],
  no_match: [
    { to: 'offers_available', by: ['admin'] },
    { to: 'refused', by: ['admin'] },
  ],
  offer_selected: [
    { to: 'seela_validated', by: ['admin'] },
    { to: 'counter_offer', by: ['admin'] },
    { to: 'refused', by: ['admin'] },
  ],
  counter_offer: [
    { to: 'offer_selected', by: ['client'] },
    { to: 'offers_available', by: ['client'] },
    { to: 'no_match', by: ['client'] },
    { to: 'refused', by: ['admin'] },
  ],
  seela_validated: [
    { to: 'leaser_confirmed', by: ['admin'] },
    { to: 'counter_offer', by: ['admin'] },
    { to: 'offers_available', by: ['admin'] },
    { to: 'no_match', by: ['admin'] },
    { to: 'refused', by: ['admin'] },
  ],
  leaser_confirmed: [
    { to: 'active', by: ['admin'] },
    { to: 'refused', by: ['admin'] },
  ],
  active: [],
  refused: [],
}

export function canTransitionRequest(from: string, to: RequestStatus, actor: Actor): boolean {
  if (!isRequestStatus(from)) return false
  return REQUEST_TRANSITIONS[from].some(t => t.to === to && t.by.includes(actor))
}

// ── Offres ───────────────────────────────────────────────────────────

export const OFFER_STATUSES = [
  'indicative',
  'client_confirmed',
  'counter_offer',
  'seela_validated',
  'leaser_confirmed',
  'refused',
] as const
export type OfferStatus = (typeof OFFER_STATUSES)[number]

/** OS.indicative === 'indicative' — à utiliser au lieu des chaînes en dur. */
export const OS = Object.fromEntries(OFFER_STATUSES.map(s => [s, s])) as { [K in OfferStatus]: K }

export const OFFER_STATUS: Record<OfferStatus, Badge> = {
  indicative:       { label: 'Offre indicative',        ...INDIGO },
  client_confirmed: { label: 'Sélection confirmée',     ...ORANGE },
  counter_offer:    { label: 'Contre-proposition',      ...INDIGO },
  seela_validated:  { label: 'Transmise au leaser',     ...ORANGE },
  leaser_confirmed: { label: 'Confirmée par le leaser', ...GREEN },
  refused:          { label: 'Non retenue',             ...RED },
}

const UNKNOWN_OFFER: Badge = { label: 'En cours', ...GRAY }

export function isOfferStatus(s: unknown): s is OfferStatus {
  return typeof s === 'string' && (OFFER_STATUSES as readonly string[]).includes(s)
}

export function offerStatusInfo(status: string | null | undefined): Badge {
  return isOfferStatus(status) ? OFFER_STATUS[status] : UNKNOWN_OFFER
}

export const OFFER_TRANSITIONS: Record<OfferStatus, Transition<OfferStatus>[]> = {
  indicative: [
    { to: 'client_confirmed', by: ['client'] },
    { to: 'counter_offer', by: ['admin'] },
    { to: 'refused', by: ['admin', 'system'] },
  ],
  client_confirmed: [
    { to: 'seela_validated', by: ['admin'] },
    { to: 'counter_offer', by: ['admin'] },
    { to: 'refused', by: ['admin'] },
  ],
  counter_offer: [
    { to: 'client_confirmed', by: ['client'] },
    { to: 'refused', by: ['client', 'admin'] },
  ],
  seela_validated: [
    { to: 'leaser_confirmed', by: ['admin'] },
    { to: 'counter_offer', by: ['admin'] },
    { to: 'refused', by: ['admin'] },
  ],
  leaser_confirmed: [],
  refused: [],
}

export function canTransitionOffer(from: string, to: OfferStatus, actor: Actor): boolean {
  if (!isOfferStatus(from)) return false
  return OFFER_TRANSITIONS[from].some(t => t.to === to && t.by.includes(actor))
}
