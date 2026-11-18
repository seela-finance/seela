// Onglet « Partenaires » du back-office : un distributeur par ligne, avec ses dossiers apportés.
// Sans dépendance serveur : testable.
import { RS } from '@/lib/status'

export type PartnerCompanyRow = { id: string; name: string; siren: string | null; created_at: string }
export type PartnerRequestStat = { partner_company_id: string | null; status: string; total_amount: number | string | null; client_joined_at: string | null; created_at: string }
export type PartnerContactRow = { company_id: string | null; user_id: string | null }

export type PartnerSummary = {
  id: string
  name: string
  siren: string | null
  accounts: number
  requests: number
  awaitingClient: number
  activeContracts: number
  /** Montant HT des dossiers ni refusés ni en brouillon */
  volume: number
  /** Montant HT des contrats actifs ou acceptés par le financeur */
  financed: number
  lastRequestAt: string | null
}

const amount = (v: number | string | null) => (v == null || v === '' ? 0 : Number(v) || 0)
const FINANCED: string[] = [RS.leaser_confirmed, RS.active]

export function summarizePartners(companies: PartnerCompanyRow[], requests: PartnerRequestStat[], contacts: PartnerContactRow[]): PartnerSummary[] {
  return companies
    .map(c => {
      const mine = requests.filter(r => r.partner_company_id === c.id && r.status !== RS.draft)
      const live = mine.filter(r => r.status !== RS.refused)
      const last = mine.map(r => r.created_at).sort().at(-1) ?? null
      return {
        id: c.id,
        name: c.name,
        siren: c.siren,
        accounts: contacts.filter(p => p.company_id === c.id && p.user_id).length,
        requests: mine.length,
        awaitingClient: live.filter(r => !r.client_joined_at).length,
        activeContracts: mine.filter(r => r.status === RS.active).length,
        volume: live.reduce((s, r) => s + amount(r.total_amount), 0),
        financed: mine.filter(r => FINANCED.includes(r.status)).reduce((s, r) => s + amount(r.total_amount), 0),
        lastRequestAt: last,
      }
    })
    // Les plus actifs d'abord : dernier dossier, puis nom
    .sort((a, b) => (b.lastRequestAt ?? '').localeCompare(a.lastRequestAt ?? '') || a.name.localeCompare(b.name, 'fr'))
}
