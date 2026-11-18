// Onglet « Acquisition » du back-office : quel canal apporte des leads, des dossiers et des contrats.
// Le canal vient de l'attribution (lib/attribution.ts) ou, à défaut, de l'origine de la société dans le CRM.
// Sans dépendance serveur : testable.
import { RS } from '@/lib/status'

export type AcquisitionCompany = {
  id: string
  source: string | null
  lead_channel: string | null
  attribution_channel: string | null
  partner_enabled: boolean | null
  created_at: string
}
export type AcquisitionRequest = { company_id: string | null; status: string; total_amount: number | string | null }

export type ChannelRow = {
  channel: string
  leads: number
  /** Sociétés ayant déposé au moins un dossier (hors brouillon) */
  withRequest: number
  requests: number
  /** Dossiers transmis à un financeur ou plus loin */
  transmitted: number
  /** Dossiers acceptés par le financeur ou contrats actifs */
  accepted: number
  financed: number
  /** Leads devenus clients : au moins un dossier accepté */
  clients: number
  /** Part des leads devenus clients (au moins un dossier accepté), en %, une décimale */
  conversion: number | null
  /** Campagnes (liens tagués) du canal, mêmes indicateurs */
  campaigns: ChannelRow[]
}

export const PERIODS = { '30': 30, '90': 90, '365': 365, tout: null } as const
export type PeriodKey = keyof typeof PERIODS
export const PERIOD_LABEL: Record<PeriodKey, string> = { '30': '30 derniers jours', '90': '3 derniers mois', '365': '12 derniers mois', tout: 'Depuis le début' }

export function parsePeriod(v: unknown): PeriodKey {
  return typeof v === 'string' && v in PERIODS ? (v as PeriodKey) : '90'
}

/** Date de début de la période (ISO), ou null pour tout l'historique. */
export function periodStart(key: PeriodKey, now = new Date()): string | null {
  const days = PERIODS[key]
  return days == null ? null : new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString()
}

const TRANSMITTED: string[] = [RS.seela_validated, RS.leaser_confirmed, RS.active]
const ACCEPTED: string[] = [RS.leaser_confirmed, RS.active]
// Comptes de test et sociétés partenaires (distributeurs) : ce ne sont pas des leads
const EXCLUDED_SOURCES = ['E2E']

/** Canal d'une société, et sa campagne s'il y en a une (« Lemlist · chr-novembre » → Lemlist / chr-novembre). */
export function channelOf(c: Pick<AcquisitionCompany, 'source' | 'lead_channel' | 'attribution_channel'>): { channel: string; campaign: string | null } {
  if (c.attribution_channel) {
    const [channel, ...rest] = c.attribution_channel.split(' · ')
    return { channel, campaign: rest.length ? rest.join(' · ') : null }
  }
  if (c.source === 'Partenaire distributeur') return { channel: 'Partenaire distributeur', campaign: null }
  if (c.source?.toLowerCase() === 'lemlist' || c.lead_channel === 'outbound') return { channel: 'Prospection outbound', campaign: null }
  return { channel: 'Non renseigné', campaign: null }
}

const amount = (v: number | string | null) => (v == null || v === '' ? 0 : Number(v) || 0)

function measure(channel: string, companies: AcquisitionCompany[], byCompany: Map<string, AcquisitionRequest[]>): Omit<ChannelRow, 'campaigns'> {
  let withRequest = 0, requests = 0, transmitted = 0, accepted = 0, financed = 0, clients = 0
  for (const c of companies) {
    const rs = byCompany.get(c.id) ?? []
    if (rs.length) withRequest++
    requests += rs.length
    transmitted += rs.filter(r => TRANSMITTED.includes(r.status)).length
    const ok = rs.filter(r => ACCEPTED.includes(r.status))
    accepted += ok.length
    financed += ok.reduce((s, r) => s + amount(r.total_amount), 0)
    if (ok.length) clients++
  }
  return {
    channel,
    leads: companies.length,
    withRequest, requests, transmitted, accepted, financed, clients,
    conversion: companies.length ? Math.round((clients / companies.length) * 1000) / 10 : null,
  }
}

/** Une ligne par canal (leads de la période), triée par nombre de leads ; « Non renseigné » en dernier. */
export function summarizeAcquisition(companies: AcquisitionCompany[], requests: AcquisitionRequest[], since: string | null): ChannelRow[] {
  const leads = companies.filter(c =>
    !c.partner_enabled && !EXCLUDED_SOURCES.includes(c.source ?? '') && (!since || c.created_at >= since))

  const byCompany = new Map<string, AcquisitionRequest[]>()
  for (const r of requests) {
    if (!r.company_id || r.status === RS.draft) continue
    byCompany.set(r.company_id, [...(byCompany.get(r.company_id) ?? []), r])
  }

  const groups = new Map<string, AcquisitionCompany[]>()
  for (const c of leads) {
    const { channel } = channelOf(c)
    groups.set(channel, [...(groups.get(channel) ?? []), c])
  }

  return [...groups.entries()]
    .map(([channel, list]) => {
      const camps = new Map<string, AcquisitionCompany[]>()
      for (const c of list) {
        const { campaign } = channelOf(c)
        if (campaign) camps.set(campaign, [...(camps.get(campaign) ?? []), c])
      }
      return {
        ...measure(channel, list, byCompany),
        campaigns: [...camps.entries()].map(([name, l]) => ({ ...measure(name, l, byCompany), campaigns: [] })).sort((a, b) => b.leads - a.leads),
      }
    })
    .sort((a, b) => Number(a.channel === 'Non renseigné') - Number(b.channel === 'Non renseigné') || b.leads - a.leads || a.channel.localeCompare(b.channel, 'fr'))
}

/** Ligne « Total » de l'onglet. */
export function totalRow(rows: ChannelRow[]): ChannelRow {
  const sum = (k: 'leads' | 'withRequest' | 'requests' | 'transmitted' | 'accepted' | 'financed' | 'clients') => rows.reduce((s, r) => s + r[k], 0)
  const leads = sum('leads')
  const clients = sum('clients')
  return {
    channel: 'Total', leads, withRequest: sum('withRequest'), requests: sum('requests'), transmitted: sum('transmitted'),
    accepted: sum('accepted'), financed: sum('financed'), clients, conversion: leads ? Math.round((clients / leads) * 1000) / 10 : null, campaigns: [],
  }
}
