import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PrepipeCompany = {
  id: string; name: string; domain: string | null; lead_status: string | null; lead_channel: string | null; lead_signal: string | null
  lead_entered_at: string | null; lead_next_date: string | null; lead_exit_reason: string | null; owner_id: string | null
  contacts: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null }[] | null
  attempts: number; lastCallAt: string | null
}

/** Sociétés du pré-pipe avec leurs contacts, le nombre d'appels depuis l'entrée et la date du dernier appel. */
export async function loadPrepipe(db: SupabaseClient): Promise<PrepipeCompany[]> {
  const { data, error } = await db.from('companies')
    .select('id, name, domain, lead_status, lead_channel, lead_signal, lead_entered_at, lead_next_date, lead_exit_reason, owner_id, contacts ( id, first_name, last_name, email, phone )')
    .not('lead_status', 'is', null).limit(5000)
  if (error) throw error
  const companies = (data ?? []) as Omit<PrepipeCompany, 'attempts' | 'lastCallAt'>[]
  const calls: { company_id: string; occurred_at: string }[] = []
  const ids = companies.map(c => c.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { data: rows } = await db.from('crm_activities').select('company_id, occurred_at').eq('type', 'call').in('company_id', ids.slice(i, i + 200)).limit(20000)
    calls.push(...((rows ?? []) as typeof calls))
  }
  const byCompany = new Map<string, string[]>()
  for (const c of calls) byCompany.set(c.company_id, [...(byCompany.get(c.company_id) ?? []), c.occurred_at])
  return companies.map(c => {
    const all = byCompany.get(c.id) ?? []
    const since = all.filter(at => !c.lead_entered_at || at >= c.lead_entered_at)
    return { ...c, attempts: since.length, lastCallAt: all.sort().at(-1) ?? null }
  })
}

/** Premier contact joignable par téléphone (sinon le premier contact). */
export function primaryContact(c: Pick<PrepipeCompany, 'contacts'>) {
  const list = c.contacts ?? []
  return list.find(p => p.phone) ?? list[0] ?? null
}
