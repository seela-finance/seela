import { test, expect } from '@playwright/test'
import { ClientActionError } from '../../lib/client-workflow'
import { analyzeDraft, parseAnalysis, removeDraft, replaceDocument, saveSelection, type Draft, type DraftStore, type SavedLine } from '../../lib/draft-workflow'
import { RS } from '../../lib/status'

const USER = 'u1'
const SUPABASE = 'https://projet.supabase.co'
const url = (name: string, owner = USER) => `${SUPABASE}/storage/v1/object/public/documents/${owner}/${name}`
const META = { supplier_name: 'Dell', supplier_address: null, supplier_siren: null, document_number: 'D1', document_date: null }
const LINE: SavedLine = { id: 'l1', description: 'Serveur', quantity: 1, unit_price: 100, total_price: 100, category: null, selected: true }

test.beforeAll(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE })

function makeStore(draft: Partial<Draft> | null = {}, lines: SavedLine[] = []) {
  const calls: string[] = []
  const row = draft && { id: 'r1', status: RS.draft as string, user_id: USER, document_url: url('a.pdf'), ...draft }
  const store: DraftStore = {
    loadDraft: async () => row,
    loadContent: async () => ({ lines, meta: META }),
    saveAnalysis: async (_id, saved) => { calls.push('saveAnalysis'); return saved.map((l, i) => ({ ...l, id: `n${i}` })) },
    setSelection: async (_id, ids) => { calls.push(`select:${ids.join()}`) },
    swapDocument: async () => { calls.push('swap'); return true },
    deleteDraft: async () => { calls.push('delete'); return true },
    removeFile: async p => { calls.push(`remove:${p}`) },
  }
  return { store, calls }
}

const rejects = async (p: Promise<unknown>, status: number) => {
  const err = await p.catch(e => e)
  expect(err).toBeInstanceOf(ClientActionError)
  expect((err as ClientActionError).status).toBe(status)
}

test('des lignes déjà enregistrées évitent tout appel à l’IA', async () => {
  const { store, calls } = makeStore({}, [LINE])
  let ai = 0
  const res = await analyzeDraft(store, USER, 'r1', async () => { ai++; return {} })
  expect(ai).toBe(0)
  expect(calls).toEqual([])
  expect(res.items).toEqual([LINE])
  expect(res.meta).toEqual(META)
})

test('la première analyse enregistre lignes et fournisseur', async () => {
  const { store, calls } = makeStore()
  const res = await analyzeDraft(store, USER, 'r1', async documentUrl => {
    expect(documentUrl).toBe(url('a.pdf'))
    return { document_kind: 'facture', items: [{ description: 'Serveur', total_price: 100 }] }
  })
  expect(calls).toEqual(['saveAnalysis'])
  expect(res.document_kind).toBe('facture')
  expect(res.items[0].id).toBe('n0')
})

test('une analyse sans ligne n’enregistre rien : le client peut réessayer', async () => {
  const { store, calls } = makeStore()
  const res = await analyzeDraft(store, USER, 'r1', async () => ({ items: [] }))
  expect(res.items).toEqual([])
  expect(calls).toEqual([])
})

test('l’IA n’est jamais appelée pour le dossier d’un autre, déjà transmis ou sans document', async () => {
  const noAi = async () => { throw new Error('IA appelée') }
  await rejects(analyzeDraft(makeStore({ user_id: 'autre' }).store, USER, 'r1', noAi), 404)
  await rejects(analyzeDraft(makeStore(null).store, USER, 'r1', noAi), 404)
  await rejects(analyzeDraft(makeStore({ status: RS.submitted }).store, USER, 'r1', noAi), 409)
  await rejects(analyzeDraft(makeStore({ document_url: null }).store, USER, 'r1', noAi), 400)
})

test('parseAnalysis ne reprend que des valeurs valides et décoche les lignes sans montant', () => {
  const { lines, meta, documentKind } = parseAnalysis({
    document_kind: 'avoir',
    document_date: '12 mars',
    supplier: { name: '  Dell  ', siren: 123 },
    items: [
      { description: 'Serveur', quantity: '2', total_price: 100 },
      { description: 'Sans prix', total_price: null },
      { description: 'Remise', total_price: -10 },
    ],
  })
  expect(documentKind).toBeNull()
  expect(meta).toMatchObject({ supplier_name: 'Dell', supplier_siren: null, document_date: null })
  expect(lines.map(l => l.selected)).toEqual([true, false, false])
  expect(lines[0].quantity).toBeNull()
  expect(parseAnalysis(null).lines).toEqual([])
})

test('la sélection est contrôlée et réservée au propriétaire', async () => {
  const { store, calls } = makeStore()
  await saveSelection(store, USER, 'r1', ['l1', 'l2'])
  expect(calls).toEqual(['select:l1,l2'])
  await rejects(saveSelection(store, USER, 'r1', 'l1'), 400)
  await rejects(saveSelection(store, USER, 'r1', [1]), 400)
  await rejects(saveSelection(makeStore({ user_id: 'autre' }).store, USER, 'r1', []), 404)
})

test('changer de document garde le dossier et retire l’ancien fichier', async () => {
  const { store, calls } = makeStore()
  await replaceDocument(store, USER, 'r1', url('b.pdf'), 'facture')
  expect(calls).toEqual(['swap', `remove:${USER}/a.pdf`])
})

test('un document hors du dossier du client, ou un type inconnu, est refusé', async () => {
  const { store, calls } = makeStore()
  await rejects(replaceDocument(store, USER, 'r1', url('b.pdf', 'autre'), 'devis'), 400)
  await rejects(replaceDocument(store, USER, 'r1', 'https://example.com/b.pdf', 'devis'), 400)
  await rejects(replaceDocument(store, USER, 'r1', url('b.pdf'), 'bon'), 400)
  expect(calls).toEqual([])
})

test('un dossier soumis entre-temps n’est ni remplacé ni supprimé', async () => {
  const { store } = makeStore()
  await rejects(replaceDocument({ ...store, swapDocument: async () => false }, USER, 'r1', url('b.pdf'), 'devis'), 409)
  await rejects(removeDraft({ ...store, deleteDraft: async () => false }, USER, 'r1'), 409)
  await rejects(removeDraft(makeStore({ status: RS.active }).store, USER, 'r1'), 409)
  await rejects(removeDraft(makeStore({ user_id: 'autre' }).store, USER, 'r1'), 404)
})

test('supprimer retire le dossier puis le fichier ; un fichier récalcitrant ne bloque pas', async () => {
  const { store, calls } = makeStore()
  await removeDraft(store, USER, 'r1')
  expect(calls).toEqual(['delete', `remove:${USER}/a.pdf`])
  await removeDraft({ ...store, removeFile: async () => { throw new Error('storage') } }, USER, 'r1')
})
