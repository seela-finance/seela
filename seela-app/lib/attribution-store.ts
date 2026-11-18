import 'server-only'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ATTRIBUTION_COOKIE, channelLabel, decodeAttribution, type Attribution } from '@/lib/attribution'

/** Source retenue pour ce visiteur (cookie posé par proxy.ts), ou null. */
export async function visitorAttribution(): Promise<Attribution | null> {
  try {
    return decodeAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value)
  } catch {
    return null
  }
}

/** Copie la source sur la société si elle n'en a pas encore : la première source connue reste. Ne lève jamais. */
export async function saveCompanyAttribution(db: SupabaseClient, companyId: string | null | undefined, attribution?: Attribution | null) {
  if (!companyId) return
  try {
    const a = attribution === undefined ? await visitorAttribution() : attribution
    if (!a) return
    const { error } = await db.from('companies')
      .update({ attribution: a, attribution_channel: channelLabel(a) })
      .eq('id', companyId).is('attribution', null)
    if (error) console.error('[attribution]', error.message)
  } catch (err) {
    console.error('[attribution]', err)
  }
}
