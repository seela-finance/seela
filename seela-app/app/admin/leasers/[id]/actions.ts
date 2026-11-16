'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminEvent } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/admin-request-detail'
import { LeaserEditError, changedFields, parseConditions, parseEligibility, parseGrid } from '@/lib/leaser-edit'

export type LeaserActionState = { ok: boolean; message: string } | null

const DENIED: LeaserActionState = { ok: false, message: 'Votre rôle ne permet pas de modifier les leasers.' }

// Accès, exécution, message à l'admin ; la fiche et la liste sont rafraîchies.
async function run(leaserId: string, action: () => Promise<string>): Promise<LeaserActionState> {
  if (!isServiceRoleConfigured()) return { ok: false, message: SERVICE_ROLE_MISSING_MESSAGE }
  if (!isUuid(leaserId)) return { ok: false, message: 'Leaser introuvable.' }
  try {
    return { ok: true, message: await action() }
  } catch (err) {
    if (err instanceof LeaserEditError) return { ok: false, message: err.message }
    console.error('[admin leaser]', err)
    return { ok: false, message: 'Écriture impossible, rien n’a été modifié. Réessayez.' }
  } finally {
    revalidatePath(`/admin/leasers/${leaserId}`)
    revalidatePath('/admin/leasers')
  }
}

const formRecord = (form: FormData) => {
  const out: Record<string, string | string[]> = {}
  for (const [key, value] of form.entries()) {
    const v = String(value).slice(0, 5000)
    const prev = out[key]
    out[key] = prev == null ? v : Array.isArray(prev) ? [...prev, v] : [prev, v]
  }
  return out
}

function parseJson(raw: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(raw ?? ''))
  } catch {
    throw new LeaserEditError('Données illisibles : rechargez la page.')
  }
}

export async function saveConditionsAction(_: LeaserActionState, form: FormData): Promise<LeaserActionState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'manage_leasers')) return DENIED
  const leaserId = String(form.get('leaserId') ?? '')
  return run(leaserId, async () => {
    const { patch, financingTypes } = parseConditions(formRecord(form))
    const db = createAdminClient()
    const { data: before, error: readError } = await db.from('leasers').select('*, leaser_financing_types(financing_type)').eq('id', leaserId).maybeSingle()
    if (readError) throw readError
    if (!before) throw new LeaserEditError('Leaser introuvable.')

    const { error } = await db.from('leasers').update(patch).eq('id', leaserId)
    if (error) throw error
    const previousTypes = ((before.leaser_financing_types ?? []) as { financing_type: string }[]).map(f => f.financing_type).sort()
    if (previousTypes.join() !== [...financingTypes].sort().join()) {
      const { error: delError } = await db.from('leaser_financing_types').delete().eq('leaser_id', leaserId)
      if (delError) throw delError
      if (financingTypes.length) {
        const { error: insError } = await db.from('leaser_financing_types').insert(financingTypes.map(financing_type => ({ leaser_id: leaserId, financing_type })))
        if (insError) throw insError
      }
    }

    const diff = changedFields(before, patch)
    if (previousTypes.join() !== [...financingTypes].sort().join()) {
      diff.before.financing_types = previousTypes
      diff.after.financing_types = financingTypes
    }
    if (Object.keys(diff.after).length) await logAdminEvent(admin, { action: 'Leaser modifié', leaserId, before: diff.before, after: diff.after })
    return Object.keys(diff.after).length ? 'Conditions enregistrées.' : 'Aucun changement.'
  })
}

export async function saveGridAction(_: LeaserActionState, form: FormData): Promise<LeaserActionState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'manage_leasers')) return DENIED
  const leaserId = String(form.get('leaserId') ?? '')
  return run(leaserId, async () => {
    const rows = parseGrid(parseJson(form.get('grid')))
    const db = createAdminClient()
    // Seules les lignes génériques (sans famille ni type de financement) sont éditées dans le tableau
    const generic = () => db.from('leaser_rate_grid').select('amount_min, amount_max, duration_months, coefficient_pct').eq('leaser_id', leaserId)
      .is('equipment_family', null).is('financing_type', null)
    const { data: before, error: readError } = await generic()
    if (readError) throw readError

    const { error: delError } = await db.from('leaser_rate_grid').delete().eq('leaser_id', leaserId).is('equipment_family', null).is('financing_type', null)
    if (delError) throw delError
    if (rows.length) {
      const { error } = await db.from('leaser_rate_grid').insert(rows.map(r => ({ ...r, leaser_id: leaserId })))
      if (error) {
        // Remet le barème d'avant : jamais de leaser sans barème à cause d'une saisie refusée
        if (before?.length) await db.from('leaser_rate_grid').insert(before.map(r => ({ ...r, leaser_id: leaserId })))
        throw error
      }
    }
    await logAdminEvent(admin, { action: 'Barème du leaser modifié', leaserId, before: { coefficients: before?.length ?? 0 }, after: { coefficients: rows.length } })
    return `Barème enregistré : ${rows.length} coefficient${rows.length > 1 ? 's' : ''}. Les offres déjà faites ne changent pas.`
  })
}

export async function saveEligibilityAction(_: LeaserActionState, form: FormData): Promise<LeaserActionState> {
  const admin = await requireAdmin()
  if (!can(admin.role, 'manage_leasers')) return DENIED
  const leaserId = String(form.get('leaserId') ?? '')
  return run(leaserId, async () => {
    const rows = parseEligibility(parseJson(form.get('eligibility')))
    const db = createAdminClient()
    const { data: before, error: readError } = await db.from('leaser_eligibility').select('equipment_family, equipment_type, status, conditions').eq('leaser_id', leaserId)
    if (readError) throw readError

    const { error: delError } = await db.from('leaser_eligibility').delete().eq('leaser_id', leaserId)
    if (delError) throw delError
    if (rows.length) {
      const { error } = await db.from('leaser_eligibility').insert(rows.map(r => ({ ...r, leaser_id: leaserId })))
      if (error) {
        if (before?.length) await db.from('leaser_eligibility').insert(before.map(r => ({ ...r, leaser_id: leaserId })))
        throw error
      }
    }
    await logAdminEvent(admin, { action: 'Éligibilité du leaser modifiée', leaserId, before: before ?? [], after: rows })
    return 'Éligibilité enregistrée.'
  })
}
