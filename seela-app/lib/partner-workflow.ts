// Parcours distributeur (docs/parcours-distributeur.md) : un partenaire monte le dossier de son client,
// le client le rejoint depuis un lien reçu par email, puis choisit lui-même l'offre.
// Logique sans dépendance serveur : la base est injectée (lib/partner-store.ts), ce qui la rend testable.
import { createHash, randomBytes } from 'node:crypto'
import { ClientActionError, submitRequest, type ClientStore, type SubmitPayload } from '@/lib/client-workflow'
import { OS, RS } from '@/lib/status'

/** Durée de validité du lien envoyé au client. */
export const INVITATION_DAYS = 30

export type PartnerContext = {
  contactId: string
  companyId: string
  companyName: string
  companySiren: string | null
  partnerEnabled: boolean
}

export type ClientInput = { siren: string; email: string; firstName: string | null; lastName: string | null }

export type Invitation = {
  id: string
  request_id: string
  email: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  revoked_at: string | null
}

export interface PartnerStore {
  loadPartner(userId: string): Promise<PartnerContext | null>
  /** Société du client par SIREN, créée depuis le registre public si elle n'existe pas. */
  findOrCreateClientCompany(siren: string): Promise<{ id: string; name: string }>
  attachRequest(requestId: string, fields: { company_id: string; partner_company_id: string; partner_contact_id: string }): Promise<void>
  /** Annule les liens encore valables du dossier (renvoi d'une invitation). */
  revokeInvitations(requestId: string): Promise<void>
  createInvitation(values: { request_id: string; email: string; token_hash: string; created_by: string; expires_at: string }): Promise<void>
  loadInvitation(tokenHash: string): Promise<Invitation | null>
  /** Réserve l'invitation (accepted_at encore vide) ; false si un autre compte l'a utilisée entre-temps. */
  markAccepted(invitationId: string, userId: string, at: string): Promise<boolean>
  /** Le dossier passe au client : il en devient propriétaire et lui seul confirme l'offre. */
  handOver(requestId: string, userId: string, at: string): Promise<void>
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const text = (v: unknown, max = 100) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/** Email du client, normalisé en minuscules. */
export function parseEmail(v: unknown): string {
  const email = typeof v === 'string' ? v.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 200) throw new ClientActionError('Email du client invalide.', 400)
  return email
}

/** Client saisi par le partenaire : SIREN (espaces tolérés) et email obligatoires. */
export function parseClientInput(raw: unknown): ClientInput {
  const c = (raw ?? {}) as Record<string, unknown>
  const siren = typeof c.siren === 'string' ? c.siren.replace(/\s+/g, '') : ''
  if (!/^\d{9}$/.test(siren)) throw new ClientActionError('SIREN du client invalide : 9 chiffres.', 400)
  return { siren, email: parseEmail(c.email), firstName: text(c.firstName), lastName: text(c.lastName) }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')

function addDays(now: Date, days: number) {
  return new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString()
}

async function invite(store: PartnerStore, requestId: string, email: string, createdBy: string, now: Date) {
  const token = newToken()
  await store.revokeInvitations(requestId)
  await store.createInvitation({ request_id: requestId, email, token_hash: hashToken(token), created_by: createdBy, expires_at: addDays(now, INVITATION_DAYS) })
  return token
}

/** Contexte du partenaire connecté ; erreur si sa société n'est pas activée comme partenaire. */
export async function requirePartner(store: PartnerStore, userId: string): Promise<PartnerContext> {
  const partner = await store.loadPartner(userId)
  if (!partner?.partnerEnabled) throw new ClientActionError('Votre société n’est pas activée comme partenaire.', 403)
  return partner
}

/**
 * Soumission par un partenaire : le dossier est transmis comme celui d'un client, rattaché à la société
 * du client (par SIREN, avant le matching qui lit son ancienneté), puis une invitation est créée.
 * Idempotent : un dossier déjà soumis ne crée ni rattachement ni nouvelle invitation.
 */
export async function submitAsPartner(
  stores: { partner: PartnerStore; client: ClientStore },
  userId: string,
  requestId: string,
  payload: SubmitPayload,
  client: ClientInput,
  now = new Date(),
): Promise<{ status: 'submitted'; token: string; clientCompanyName: string; partner: PartnerContext } | { status: 'already' }> {
  const partner = await requirePartner(stores.partner, userId)
  if (partner.companySiren && partner.companySiren === client.siren) {
    throw new ClientActionError('Indiquez le SIREN de votre client, pas celui de votre société.', 400)
  }

  const result = await submitRequest(stores.client, userId, requestId, payload)
  if (result === 'already') return { status: 'already' }

  const company = await stores.partner.findOrCreateClientCompany(client.siren)
  await stores.partner.attachRequest(requestId, { company_id: company.id, partner_company_id: partner.companyId, partner_contact_id: partner.contactId })
  const token = await invite(stores.partner, requestId, client.email, partner.contactId, now)
  return { status: 'submitted', token, clientCompanyName: company.name, partner }
}

/** Nouveau lien pour un dossier que le client n'a pas encore rejoint ; les anciens liens ne marchent plus. */
export async function resendInvitation(
  store: PartnerStore,
  userId: string,
  request: { id: string; partner_company_id: string | null; client_joined_at: string | null } | null,
  email: string,
  now = new Date(),
): Promise<string> {
  const partner = await requirePartner(store, userId)
  if (!request || request.partner_company_id !== partner.companyId) throw new ClientActionError('Dossier introuvable.', 404)
  if (request.client_joined_at) throw new ClientActionError('Votre client a déjà rejoint ce dossier.', 409)
  return invite(store, request.id, email, partner.contactId, now)
}

/** État d'un lien, sans rien modifier (page d'invitation). */
export function invitationState(inv: Invitation | null, now = new Date()): 'valid' | 'invalid' | 'expired' | 'accepted' {
  if (!inv || inv.revoked_at) return 'invalid'
  if (inv.accepted_at) return 'accepted'
  if (new Date(inv.expires_at).getTime() < now.getTime()) return 'expired'
  return 'valid'
}

export const sameEmail = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Le client rejoint le dossier : le lien doit être valable et la session ouverte avec l'email invité.
 * Idempotent pour le même compte (double clic, retour arrière). Renvoie l'id du dossier.
 */
export async function acceptInvitation(store: PartnerStore, userId: string, userEmail: string | null, token: string, now = new Date()): Promise<string> {
  const inv = await store.loadInvitation(hashToken(token))
  const state = invitationState(inv, now)
  if (state === 'invalid' || !inv) throw new ClientActionError('Ce lien n’est plus valable. Demandez à votre fournisseur de vous le renvoyer.', 404)
  if (state === 'accepted') {
    if (inv.accepted_by === userId) return inv.request_id
    throw new ClientActionError('Ce lien a déjà été utilisé.', 409)
  }
  if (state === 'expired') throw new ClientActionError('Ce lien a expiré. Demandez à votre fournisseur de vous le renvoyer.', 410)
  if (!sameEmail(inv.email, userEmail)) {
    throw new ClientActionError(`Ce lien est réservé à ${inv.email}. Connectez-vous avec cette adresse.`, 403)
  }

  const at = now.toISOString()
  if (!(await store.markAccepted(inv.id, userId, at))) {
    const again = await store.loadInvitation(hashToken(token))
    if (again?.accepted_by === userId) return inv.request_id
    throw new ClientActionError('Ce lien a déjà été utilisé.', 409)
  }
  await store.handOver(inv.request_id, userId, at)
  return inv.request_id
}

// ─── Tableau de suivi du partenaire ──────────────────────────────────────────

export type PartnerRequestRow = {
  id: string
  status: string
  total_amount: number | string | null
  duration_months: number | null
  created_at: string
  client_joined_at: string | null
  contract_start_date: string | null
  companies: { name: string | null } | null
  offers: { monthly_payment: number | string | null; duration_months: number | null; status: string; selected: boolean | null }[] | null
}

export type PartnerLine = {
  id: string
  clientName: string
  amount: number | null
  monthly: number | null
  /** true si la mensualité est la meilleure offre indicative, pas encore celle choisie par le client */
  monthlyIsIndicative: boolean
  durationMonths: number | null
  statusLabel: string
  awaitingClient: boolean
  contractEnd: string | null
  createdAt: string
}

const toNum = (v: number | string | null | undefined) => (v == null || v === '' ? null : Number(v))

/** Fin du contrat = début + durée (mois calendaires), au format AAAA-MM-JJ. */
export function contractEndDate(start: string | null, months: number | null): string | null {
  if (!start || !months || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return null
  const [y, m, d] = start.split('-').map(Number)
  const end = new Date(Date.UTC(y, m - 1 + months, d))
  // 31 janvier + 1 mois : on s'arrête au dernier jour du mois visé, pas au 3 mars
  if (end.getUTCDate() !== d) end.setUTCDate(0)
  return end.toISOString().slice(0, 10)
}

// Libellés vus par le partenaire : l'avancement, sans le détail interne du circuit
const PARTNER_STATUS: Record<string, string> = {
  [RS.draft]: 'Brouillon',
  [RS.submitted]: 'En étude',
  [RS.no_match]: 'En étude par un conseiller',
  [RS.offers_available]: 'Offres disponibles',
  [RS.offer_selected]: 'Offre choisie par le client',
  [RS.counter_offer]: 'Contre-proposition au client',
  [RS.seela_validated]: 'Transmis au financeur',
  [RS.leaser_confirmed]: 'Accepté, en attente de démarrage',
  [RS.active]: 'Contrat actif',
  [RS.refused]: 'Refusé',
}

const PICKED: string[] = [OS.client_confirmed, OS.seela_validated, OS.leaser_confirmed]

export function partnerLine(r: PartnerRequestRow): PartnerLine {
  const offers = r.offers ?? []
  const picked = offers.find(o => o.selected || PICKED.includes(o.status))
  const best = offers
    .filter(o => o.status !== OS.refused && toNum(o.monthly_payment) != null)
    .sort((a, b) => (toNum(a.monthly_payment) ?? 0) - (toNum(b.monthly_payment) ?? 0))[0]
  const shown = picked ?? best
  const awaitingClient = !r.client_joined_at && r.status !== RS.draft && r.status !== RS.refused
  const statusLabel = awaitingClient && (r.status === RS.offers_available || r.status === RS.submitted || r.status === RS.no_match)
    ? 'En attente du client'
    : PARTNER_STATUS[r.status] ?? r.status
  const durationMonths = shown?.duration_months ?? r.duration_months
  return {
    id: r.id,
    clientName: r.companies?.name ?? 'Client',
    amount: toNum(r.total_amount),
    monthly: toNum(shown?.monthly_payment),
    monthlyIsIndicative: !picked && !!best,
    durationMonths,
    statusLabel,
    awaitingClient,
    contractEnd: r.status === RS.active ? contractEndDate(r.contract_start_date, durationMonths) : null,
    createdAt: r.created_at,
  }
}

/** Date de démarrage saisie par l'équipe : AAAA-MM-JJ réelle, au plus 2 ans en arrière et 1 an en avant. */
export function parseStartDate(v: unknown, today = new Date()): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null
  const day = 24 * 3600 * 1000
  const t = today.getTime()
  if (d.getTime() < t - 730 * day || d.getTime() > t + 366 * day) return null
  return v
}
