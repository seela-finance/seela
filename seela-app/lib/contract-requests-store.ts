import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContractRequestKind, ContractRequestRow, ContractRequestStatus } from '@/lib/contract-requests'

export const CONTRACT_REQUEST_COLUMNS = 'id, request_id, kind, status, message, answer, created_at, answered_at, closed_at'

/** Demandes d'un dossier, les plus récentes d'abord. Avant la migration : liste vide, rien ne bloque. */
export async function loadContractRequests(db: SupabaseClient, requestId: string): Promise<ContractRequestRow[]> {
  const { data, error } = await db.from('contract_requests').select(CONTRACT_REQUEST_COLUMNS).eq('request_id', requestId).order('created_at', { ascending: false })
  if (error) {
    console.error('[demandes contrat] lecture', error.message)
    return []
  }
  return (data ?? []) as ContractRequestRow[]
}

/** Demandes de plusieurs dossiers (suivi partenaire, liste admin), groupées par dossier. */
export async function loadContractRequestsFor(db: SupabaseClient, requestIds: string[]): Promise<Map<string, ContractRequestRow[]>> {
  const byRequest = new Map<string, ContractRequestRow[]>()
  if (requestIds.length === 0) return byRequest
  const { data, error } = await db.from('contract_requests').select(CONTRACT_REQUEST_COLUMNS).in('request_id', requestIds).order('created_at', { ascending: false })
  if (error) {
    console.error('[demandes contrat] lecture', error.message)
    return byRequest
  }
  for (const row of (data ?? []) as ContractRequestRow[]) byRequest.set(row.request_id, [...(byRequest.get(row.request_id) ?? []), row])
  return byRequest
}

export async function createContractRequest(db: SupabaseClient, values: {
  request_id: string; company_id: string | null; kind: ContractRequestKind; message: string; created_by: string
}): Promise<ContractRequestRow> {
  const { data, error } = await db.from('contract_requests').insert({ ...values, status: 'recue' }).select(CONTRACT_REQUEST_COLUMNS).single()
  if (error) throw new Error(`Demande : enregistrement impossible (${error.message})`)
  return data as ContractRequestRow
}

/** Changement d'état par l'équipe ; une réponse est enregistrée avec son auteur. Null si la demande n'existe plus. */
export async function updateContractRequest(db: SupabaseClient, id: string, patch: {
  status: ContractRequestStatus; answer?: string | null; adminId: string
}): Promise<(ContractRequestRow & { request_id: string }) | null> {
  const now = new Date().toISOString()
  const values: Record<string, unknown> = { status: patch.status, updated_at: now }
  if (patch.answer != null) Object.assign(values, { answer: patch.answer, answered_by: patch.adminId, answered_at: now })
  if (patch.status === 'close') values.closed_at = now
  const { data, error } = await db.from('contract_requests').update(values).eq('id', id).select(CONTRACT_REQUEST_COLUMNS).maybeSingle()
  if (error) throw new Error(`Demande : mise à jour impossible (${error.message})`)
  return (data as ContractRequestRow | null) ?? null
}

export type AdminContractRequestRow = ContractRequestRow & {
  financing_requests: { id: string; status: string; company_id: string | null; companies: { name: string | null } | null } | null
}

/** Toutes les demandes pour l'onglet « Demandes » de l'admin (ouvertes en tête, puis les plus récentes). */
export async function loadAllContractRequests(db: SupabaseClient): Promise<AdminContractRequestRow[]> {
  const { data, error } = await db.from('contract_requests')
    .select(`${CONTRACT_REQUEST_COLUMNS}, financing_requests ( id, status, company_id, companies ( name ) )`)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    console.error('[demandes contrat] liste', error.message)
    return []
  }
  return (data ?? []) as unknown as AdminContractRequestRow[]
}
