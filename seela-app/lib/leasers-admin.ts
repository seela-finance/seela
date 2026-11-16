import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeaserRecord } from '@/lib/leaser-conditions'

const LEASER_SELECT = `*, leaser_rate_grid(amount_min, amount_max, duration_months, coefficient_pct, equipment_family, financing_type),
  leaser_eligibility(equipment_family, equipment_type, status, conditions), leaser_financing_types(financing_type)`

/** Tous les leasers avec barème, éligibilité et financements (service role : back-office uniquement). */
export async function loadLeasers(db: SupabaseClient): Promise<LeaserRecord[]> {
  const { data, error } = await db.from('leasers').select(LEASER_SELECT).order('is_active', { ascending: false }).order('name')
  if (error) throw new Error(`Leasers : lecture impossible (${error.message})`)
  // Les leasers de test des parcours automatiques n'encombrent pas le back-office
  return ((data ?? []) as LeaserRecord[]).filter(l => !l.test_user_id)
}

export async function loadLeaser(db: SupabaseClient, id: string): Promise<LeaserRecord | null> {
  const { data, error } = await db.from('leasers').select(LEASER_SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(`Leaser : lecture impossible (${error.message})`)
  return data as LeaserRecord | null
}
