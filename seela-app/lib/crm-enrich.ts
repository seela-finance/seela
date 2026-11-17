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
export type FullEnrichResult = { custom?: Record<string, string> | null; contact_info?: { most_probable_phone?: Phone | null; phones?: Phone[] | null } | null }

/** Numéro retenu : le mobile le plus probable selon FullEnrich, sinon un numéro actif. null si rien d'exploitable. */
export function bestPhone(r: FullEnrichResult): string | null {
  const ci = r.contact_info
  const mp = ci?.most_probable_phone?.number?.trim()
  if (mp) return mp
  const active = (ci?.phones ?? []).find(p => p.number?.trim() && p.line_status !== 'INACTIVE')
  return active?.number?.trim() ?? null
}

export const FINAL_STATUSES = new Set(['FINISHED', 'CANCELED', 'CREDITS_INSUFFICIENT', 'UNKNOWN'])
