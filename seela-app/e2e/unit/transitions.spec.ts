import { test, expect } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TransitionError, transitionOffer, transitionRequest } from '../../lib/transitions'

// Faux client Supabase : enregistre l'update et les filtres, renvoie le résultat demandé.
function fakeDb(result: { data: { id: string }[] | null; error: { message: string } | null }) {
  const calls: { table?: string; values?: Record<string, unknown>; filters: [string, unknown][] } = { filters: [] }
  const builder = {
    update(values: Record<string, unknown>) { calls.values = values; return builder },
    eq(col: string, val: unknown) { calls.filters.push([col, val]); return builder },
    select() { return Promise.resolve(result) },
  }
  const db = { from(table: string) { calls.table = table; return builder } } as unknown as SupabaseClient
  return { db, calls }
}

async function statusOf(p: Promise<unknown>) {
  try { await p; return 'ok' } catch (e) { return e instanceof TransitionError ? e.status : 'other' }
}

test('transition autorisée : écrit seulement si le statut lu est toujours en base', async () => {
  const { db, calls } = fakeDb({ data: [{ id: 'o1' }], error: null })
  await transitionOffer(db, 'o1', 'client_confirmed', 'seela_validated', { seela_validated_at: 'now' })
  expect(calls.table).toBe('offers')
  expect(calls.values).toEqual({ status: 'seela_validated', seela_validated_at: 'now' })
  expect(calls.filters).toEqual([['id', 'o1'], ['status', 'client_confirmed']])
})

test('transition interdite → 409 sans aucune écriture', async () => {
  const { db, calls } = fakeDb({ data: [{ id: 'o1' }], error: null })
  expect(await statusOf(transitionOffer(db, 'o1', 'seela_validated', 'seela_validated'))).toBe(409)
  expect(await statusOf(transitionOffer(db, 'o1', 'indicative', 'seela_validated'))).toBe(409)
  expect(calls.table).toBeUndefined()
})

test('ligne modifiée entre-temps (0 ligne) → 409', async () => {
  const { db } = fakeDb({ data: [], error: null })
  expect(await statusOf(transitionRequest(db, 'r1', 'offer_selected', 'seela_validated'))).toBe(409)
})

test('erreur Supabase → 500', async () => {
  const { db } = fakeDb({ data: null, error: { message: 'permission denied' } })
  expect(await statusOf(transitionRequest(db, 'r1', 'seela_validated', 'leaser_confirmed'))).toBe(500)
})

test('le client ne peut pas faire une transition réservée à l’admin', async () => {
  const { db } = fakeDb({ data: [{ id: 'o1' }], error: null })
  expect(await statusOf(transitionOffer(db, 'o1', 'client_confirmed', 'seela_validated', {}, 'client'))).toBe(409)
})
