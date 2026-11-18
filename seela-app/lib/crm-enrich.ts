// Enrichissement de téléphone (FullEnrich) : qui on peut enrichir, quel numéro on garde. Fonctions pures, testées.

export const PHONE_CREDITS = 10
export const ENRICH_BATCH = 100

export type EnrichableContact = { id: string; first_name: string | null; last_name: string | null; phone: string | null; linkedin_url: string | null; company_domain: string | null; company_name: string | null }

/** Contacts sans téléphone et identifiables (prénom + nom + société, ou LinkedIn) : seuls ceux-là sont envoyés. */
export function pickEnrichable(contacts: EnrichableContact[]) {
  const missing = contacts.filter(c => !c.phone?.trim())
  const ok = missing.filter(c => (c.linkedin_url?.trim()) || (c.first_name?.trim() && c.last_name?.trim() && (c.company_domain || c.company_name)))
  return { send: ok, unidentifiable: missing.length - ok.length }
}

export function toFullEnrichItem(c: EnrichableContact) {
  return {
    first_name: c.first_name ?? undefined, last_name: c.last_name ?? undefined,
    domain: c.company_domain ?? undefined, company_name: c.company_name ?? undefined,
    linkedin_url: c.linkedin_url ?? undefined, enrich_fields: ['contact.phones'], custom: { contact_id: c.id },
  }
}

type Phone = { number?: string | null; line_status?: string | null; line_type?: string | null }
type Social = { professional_network?: { url?: string | null } | null } | null
export type FullEnrichResult = {
  custom?: Record<string, string> | null
  contact_info?: { most_probable_phone?: Phone | null; phones?: Phone[] | null } | null
  profile?: {
    headline?: string | null; location?: { city?: string | null; country?: string | null } | null; social_profiles?: Social
    employment?: { current?: { title?: string | null; start_at?: string | null; company?: {
      website?: string | null; description?: string | null; year_founded?: number | null; headcount?: number | null; headcount_range?: string | null
      company_type?: string | null; industry?: { main_industry?: string | null } | null; social_profiles?: Social
    } | null } | null } | null
  } | null
}

function pickPhone(r: FullEnrichResult): Phone | null {
  const ci = r.contact_info
  if (ci?.most_probable_phone?.number?.trim()) return ci.most_probable_phone
  return (ci?.phones ?? []).find(p => p.number?.trim() && p.line_status !== 'INACTIVE') ?? null
}

/** Numéro retenu : le mobile le plus probable selon FullEnrich, sinon un numéro actif. null si rien d'exploitable. */
export function bestPhone(r: FullEnrichResult): string | null {
  return pickPhone(r)?.number?.trim() ?? null
}

const t = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const link = (v: unknown) => { const s = t(v, 500); return s ? (/^https?:\/\//i.test(s) ? s : `https://${s}`) : null }

/**
 * Infos renvoyées avec le téléphone (sans coût en plus) → champs du contact et de la société.
 * Le type et le statut de ligne suivent le numéro retenu ; le reste ne remplit que des champs vides (fillEmpty).
 */
export function mapFullEnrichProfile(r: FullEnrichResult) {
  const phone = pickPhone(r)
  const p = r.profile
  const job = p?.employment?.current
  const co = job?.company
  const start = t(job?.start_at, 40)?.match(/^\d{4}-\d{2}(-\d{2})?/)?.[0]
  const year = co?.year_founded
  return {
    line: { phone_line_type: t(phone?.line_type, 20), phone_line_status: t(phone?.line_status, 20) },
    contact: {
      job_title: t(job?.title, 200), headline: t(p?.headline), linkedin_url: link(p?.social_profiles?.professional_network?.url),
      location: [t(p?.location?.city, 100), t(p?.location?.country, 100)].filter(Boolean).join(', ') || null,
      job_started_at: start ? (start.length === 7 ? `${start}-01` : start) : null,
    },
    company: {
      website: link(co?.website), description: t(co?.description, 3000),
      creation_year: Number.isInteger(year) && (year as number) > 1800 && (year as number) <= 2100 ? year as number : null,
      headcount: Number.isInteger(co?.headcount) && (co?.headcount as number) > 0 ? co?.headcount as number : null,
      headcount_bracket: t(co?.headcount_range, 50), company_type: t(co?.company_type, 100),
      lemlist_industry: t(co?.industry?.main_industry, 200), linkedin_url: link(co?.social_profiles?.professional_network?.url),
    },
  }
}

export const FINAL_STATUSES = new Set(['FINISHED', 'CANCELED', 'CREDITS_INSUFFICIENT', 'UNKNOWN'])
