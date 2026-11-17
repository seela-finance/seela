// CRM — sociétés (table companies, docs/crm-modele-donnees.md). Fonctions pures : les pages et les
// Server Actions chargent et écrivent, tout se décide ici.

export const LIFECYCLE_STAGES = ['prospect', 'client', 'partenaire', 'exclu'] as const
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]

export const LIFECYCLE_LABEL: Record<LifecycleStage, string> = {
  prospect: 'Prospect',
  client: 'Client',
  partenaire: 'Partenaire',
  exclu: 'Exclu',
}

export const SECTORS = [
  'IT & Informatique', 'Médical & Santé', 'BTP & Construction', 'CHR & Restauration', 'Mobilier & Agencement',
  'Véhicules & Flotte', 'Industrie & Production', 'Audiovisuel', 'Retail & Commerce', 'Télécom & Datacenter',
  'Énergie & Solaire', 'Autre',
] as const

export const COMPANY_VIEWS = ['toutes', 'miennes', 'prospect', 'client', 'partenaire'] as const
export type CompanyView = (typeof COMPANY_VIEWS)[number]

export const VIEW_LABEL: Record<CompanyView, string> = {
  toutes: 'Toutes',
  miennes: 'Mes sociétés',
  prospect: 'Prospects',
  client: 'Clients',
  partenaire: 'Partenaires',
}

export const CRM_PAGE_SIZE = 50

// Messageries grand public : leur domaine ne désigne pas une société
const WEBMAIL = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr',
  'msn.com', 'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr',
  'laposte.net', 'bbox.fr', 'neuf.fr', 'gmx.fr', 'gmx.com', 'proton.me', 'protonmail.com',
])

export type CrmCompanyRow = {
  id: string
  name: string
  siren: string | null
  domain: string | null
  lifecycle_stage: string
  sector: string | null
  owner_id: string | null
  created_at: string
  contacts: { id: string }[] | null
  financing_requests: { id: string; status: string | null }[] | null
}

export type CrmCompany = {
  id: string
  name: string
  siren: string | null
  domain: string | null
  stage: LifecycleStage
  sector: string | null
  ownerId: string | null
  contactCount: number
  requestCount: number
  createdAt: string
}

export function isLifecycleStage(v: unknown): v is LifecycleStage {
  return typeof v === 'string' && (LIFECYCLE_STAGES as readonly string[]).includes(v)
}

export function toCrmCompany(row: CrmCompanyRow): CrmCompany {
  return {
    id: row.id,
    name: row.name,
    siren: row.siren,
    domain: row.domain,
    stage: isLifecycleStage(row.lifecycle_stage) ? row.lifecycle_stage : 'prospect',
    sector: row.sector,
    ownerId: row.owner_id,
    contactCount: row.contacts?.length ?? 0,
    requestCount: (row.financing_requests ?? []).filter(r => r.status && r.status !== 'draft').length,
    createdAt: row.created_at,
  }
}

// ─── Saisie ───────────────────────────────────────────────────────────────────

/** « https://www.Exemple.fr/contact » ou « jean@exemple.fr » → « exemple.fr ». Vide ou invalide → null. */
export function normalizeDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null
  let s = input.trim().toLowerCase()
  if (!s) return null
  if (s.includes('@')) s = s.split('@').pop() ?? ''
  s = s.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:]/)[0]
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : null
}

export function isWebmailDomain(domain: string | null): boolean {
  return !!domain && WEBMAIL.has(domain)
}

export function normalizeSiren(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.replace(/\s/g, '')
  return s || null
}

export class CrmError extends Error {}

export type CompanyInput = { name: string; siren: string | null; domain: string | null; sector: string | null; stage: LifecycleStage }

export function parseCompanyInput(form: { name: unknown; siren: unknown; domain: unknown; sector: unknown; stage: unknown }): CompanyInput {
  const name = typeof form.name === 'string' ? form.name.trim() : ''
  if (!name) throw new CrmError('Indiquez le nom de la société.')
  const siren = normalizeSiren(form.siren)
  if (siren && !/^\d{9}$/.test(siren)) throw new CrmError('Le SIREN doit compter 9 chiffres.')
  const rawDomain = typeof form.domain === 'string' ? form.domain.trim() : ''
  const domain = normalizeDomain(rawDomain)
  if (rawDomain && !domain) throw new CrmError('Le domaine n’est pas valide (exemple : societe.fr).')
  if (isWebmailDomain(domain)) throw new CrmError('Ce domaine est celui d’une messagerie grand public, pas d’une société.')
  const sector = typeof form.sector === 'string' && (SECTORS as readonly string[]).includes(form.sector) ? form.sector : null
  const stage = isLifecycleStage(form.stage) ? form.stage : 'prospect'
  return { name, siren, domain, sector, stage }
}

/** Société déjà connue : même SIREN (bloquant) ou même domaine (à confirmer, un groupe partage un domaine). */
export function findDuplicate(
  input: Pick<CompanyInput, 'siren' | 'domain'>,
  existing: Pick<CrmCompany, 'id' | 'name' | 'siren' | 'domain'>[],
): { kind: 'siren' | 'domain'; company: Pick<CrmCompany, 'id' | 'name'> } | null {
  if (input.siren) {
    const hit = existing.find(c => c.siren === input.siren)
    if (hit) return { kind: 'siren', company: hit }
  }
  if (input.domain) {
    const hit = existing.find(c => c.domain?.toLowerCase() === input.domain)
    if (hit) return { kind: 'domain', company: hit }
  }
  return null
}

// ─── Liste ────────────────────────────────────────────────────────────────────

export type CompanyListParams = { view: CompanyView; query: string; page: number }

export function parseCompanyListParams(sp: Record<string, string | string[] | undefined>): CompanyListParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const view = one(sp.vue)
  const page = Number.parseInt(one(sp.page), 10)
  return {
    view: (COMPANY_VIEWS as readonly string[]).includes(view) ? (view as CompanyView) : 'toutes',
    query: one(sp.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesView(c: CrmCompany, view: CompanyView, me: string): boolean {
  if (view === 'toutes') return true
  if (view === 'miennes') return c.ownerId === me
  return c.stage === view
}

export function matchesQuery(c: CrmCompany, query: string): boolean {
  if (!query) return true
  const q = fold(query)
  const digits = query.replace(/\s/g, '')
  return fold(c.name).includes(q) || (!!c.domain && c.domain.includes(q)) || (/^\d+$/.test(digits) && !!c.siren?.includes(digits))
}

export function listCrmCompanies(all: CrmCompany[], params: CompanyListParams, me: string) {
  const filtered = all
    .filter(c => matchesView(c, params.view, me) && matchesQuery(c, params.query))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pageCount = Math.max(1, Math.ceil(filtered.length / CRM_PAGE_SIZE))
  const page = Math.min(params.page, pageCount)
  const counts = Object.fromEntries(COMPANY_VIEWS.map(v => [v, all.filter(c => matchesView(c, v, me)).length])) as Record<CompanyView, number>
  return { items: filtered.slice((page - 1) * CRM_PAGE_SIZE, page * CRM_PAGE_SIZE), total: filtered.length, page, pageCount, counts }
}
