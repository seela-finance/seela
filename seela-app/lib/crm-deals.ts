// CRM — deals (pipeline commercial) et contacts : listes et saisies. Fonctions pures, testées.
import { CrmError } from '@/lib/crm-companies'
import { PERSONAS } from '@/lib/crm-activities'

export const DEAL_STAGES = ['a_contacter', 'en_conversation', 'rdv_pris', 'proposition', 'a_recontacter', 'signe', 'perdu'] as const
export type DealStage = (typeof DEAL_STAGES)[number]
export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  a_contacter: 'À contacter', en_conversation: 'En conversation', rdv_pris: 'RDV pris', proposition: 'Proposition',
  a_recontacter: 'À recontacter', signe: 'Signé', perdu: 'Perdu',
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export function isDealStage(v: unknown): v is DealStage {
  return typeof v === 'string' && (DEAL_STAGES as readonly string[]).includes(v)
}

// ─── Deal ────────────────────────────────────────────────────────────────────

export type DealInput = {
  name: string; company_id: string; stage: DealStage; amount: number | null
  next_action: string | null; next_action_date: string | null; owner_id: string | null
}

export function parseDealInput(f: Record<string, unknown>, teamIds: string[], companyIds: string[]): DealInput {
  const name = str(f.name)
  if (!name) throw new CrmError('Donnez un nom au deal.')
  const company = str(f.company_id)
  if (!companyIds.includes(company)) throw new CrmError('Choisissez la société du deal.')
  const rawAmount = str(f.amount).replace(/\s/g, '').replace(',', '.')
  const amount = rawAmount ? Number(rawAmount) : null
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new CrmError('Le montant n’est pas valide.')
  const date = str(f.next_action_date)
  if (date && !isDate(date)) throw new CrmError('Date de prochaine action invalide.')
  const owner = str(f.owner_id)
  return {
    name: name.slice(0, 200), company_id: company, stage: isDealStage(f.stage) ? f.stage : 'a_contacter', amount,
    next_action: str(f.next_action) || null, next_action_date: date || null, owner_id: teamIds.includes(owner) ? owner : null,
  }
}

export type DealRow = {
  id: string; name: string; stage: string; amount: number | null; next_action: string | null; next_action_date: string | null
  owner_id: string | null; company_id: string; updated_at: string; companies: { name: string } | null
}

export type PipelineColumn = { stage: DealStage; deals: DealRow[]; total: number }

/** Une colonne par étape, deals les plus récemment modifiés en haut, montant cumulé. */
export function buildPipeline(deals: DealRow[], filter: { mine: boolean; me: string }): PipelineColumn[] {
  const kept = deals.filter(d => !filter.mine || d.owner_id === filter.me)
  return DEAL_STAGES.map(stage => {
    const list = kept.filter(d => (isDealStage(d.stage) ? d.stage : 'a_contacter') === stage).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    return { stage, deals: list, total: list.reduce((s, d) => s + (Number(d.amount) || 0), 0) }
  })
}

// ─── Contacts : liste et fiche ───────────────────────────────────────────────

export const CONTACT_VIEWS = ['tous', 'miens', 'acces_app', 'sans_societe'] as const
export type ContactView = (typeof CONTACT_VIEWS)[number]
export const CONTACT_VIEW_LABEL: Record<ContactView, string> = { tous: 'Tous', miens: 'Mes contacts', acces_app: 'Accès app', sans_societe: 'Sans société' }

export type ContactRow = {
  id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; job_title: string | null
  persona: string | null; user_id: string | null; owner_id: string | null; company_id: string | null; created_at: string; companies: { name: string } | null
}

export const contactName = (c: Pick<ContactRow, 'first_name' | 'last_name' | 'email'>) => [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Sans nom'

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function matchesContactView(c: ContactRow, view: ContactView, me: string): boolean {
  if (view === 'miens') return c.owner_id === me
  if (view === 'acces_app') return !!c.user_id
  if (view === 'sans_societe') return !c.company_id
  return true
}

export function listContacts(all: ContactRow[], view: ContactView, query: string, me: string) {
  const q = fold(query.trim())
  const items = all
    .filter(c => matchesContactView(c, view, me))
    .filter(c => !q || fold([contactName(c), c.email, c.phone, c.job_title, c.companies?.name].filter(Boolean).join(' ')).includes(q))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const counts = Object.fromEntries(CONTACT_VIEWS.map(v => [v, all.filter(c => matchesContactView(c, v, me)).length])) as Record<ContactView, number>
  return { items, counts }
}

export type ContactPatch = {
  first_name: string | null; last_name: string | null; email: string | null; phone: string | null; job_title: string | null
  persona: string | null; linkedin_url: string | null; company_id: string | null; owner_id: string | null
}

export function parseContactPatch(f: Record<string, unknown>, teamIds: string[], companyIds: string[]): ContactPatch {
  const first = str(f.first_name), last = str(f.last_name), email = str(f.email).toLowerCase()
  if (!first && !last && !email) throw new CrmError('Indiquez au moins un nom ou un email.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CrmError('L’email n’est pas valide.')
  const linkedin = str(f.linkedin_url)
  if (linkedin && !/^https?:\/\//.test(linkedin)) throw new CrmError('Le lien LinkedIn doit commencer par https://')
  const company = str(f.company_id), owner = str(f.owner_id), persona = str(f.persona)
  return {
    first_name: first || null, last_name: last || null, email: email || null, phone: str(f.phone) || null, job_title: str(f.job_title) || null,
    persona: (PERSONAS as readonly string[]).includes(persona) ? persona : null, linkedin_url: linkedin || null,
    company_id: companyIds.includes(company) ? company : null, owner_id: teamIds.includes(owner) ? owner : null,
  }
}

// ─── Mes tâches ──────────────────────────────────────────────────────────────

export type TaskBucket = 'retard' | 'aujourdhui' | 'a_venir' | 'sans_date'
export const TASK_BUCKET_LABEL: Record<TaskBucket, string> = { retard: 'En retard', aujourdhui: 'Aujourd’hui', a_venir: 'À venir', sans_date: 'Sans échéance' }

export function groupTasks<T extends { due_date: string | null }>(tasks: T[], today: string): Record<TaskBucket, T[]> {
  const out: Record<TaskBucket, T[]> = { retard: [], aujourdhui: [], a_venir: [], sans_date: [] }
  for (const t of tasks) {
    if (!t.due_date) out.sans_date.push(t)
    else if (t.due_date < today) out.retard.push(t)
    else if (t.due_date === today) out.aujourdhui.push(t)
    else out.a_venir.push(t)
  }
  for (const k of Object.keys(out) as TaskBucket[]) out[k].sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  return out
}
