import { test, expect } from '@playwright/test'
import {
  ClientActionError,
  confirmOffer,
  declineCounterOffer,
  parseSubmitPayload,
  submitRequest,
  totalAmount,
  type ClientStore,
  type SubmitLine,
} from '../../lib/client-workflow'
import { TransitionError } from '../../lib/transitions'
import { canTransitionOffer, canTransitionRequest } from '../../lib/status'

const USER = 'u1'
const body = (patch: Record<string, unknown> = {}) => ({
  lines: [
    { description: 'Serveur', quantity: 2, unit_price: 1500, total_price: 3000, category: 'Informatique' },
    { description: 'Écran', quantity: 1, unit_price: 250.5, total_price: 250.5 },
  ],
  durationMonths: 36,
  periodicite: 'trimestrielle',
  notes: '  Livraison en janvier  ',
  meta: { supplier_name: 'Dell', document_date: '2026-10-30' },
  ...patch,
})

// Base en mémoire avec transitions atomiques comme en prod (acteur client)
function store(init: { requestStatus?: string; owner?: string; offers?: Record<string, string> } = {}) {
  const request = { id: 'r1', status: init.requestStatus ?? 'draft', user_id: init.owner ?? USER, fields: {} as Record<string, unknown> }
  const offers: Record<string, { status: string; selected: boolean }> = Object.fromEntries(
    Object.entries(init.offers ?? {}).map(([id, status]) => [id, { status, selected: false }]),
  )
  let lines: SubmitLine[] = []
  let failLines = false
  const s: ClientStore = {
    loadRequest: async id => (id === 'r1' ? { id, status: request.status, user_id: request.user_id } : null),
    async claimSubmission(_id, fields) {
      if (request.status !== 'draft') throw new TransitionError('modifié', 409)
      request.status = 'submitted'
      request.fields = fields
    },
    async replaceLines(_id, l) {
      if (failLines) throw new Error('db down')
      lines = l
    },
    async revertSubmission() { if (request.status === 'submitted') request.status = 'draft' },
    loadOffer: async id => offers[id]
      ? { offer: { id, status: offers[id].status, request_id: 'r1' }, request: { id: 'r1', status: request.status, user_id: request.user_id }, others: Object.entries(offers).filter(([o]) => o !== id).map(([o, v]) => ({ id: o, status: v.status })) }
      : null,
    async transitionOffer(id, from, to, extra = {}) {
      if (!canTransitionOffer(from, to, 'client') || offers[id].status !== from) throw new TransitionError('x', 409)
      offers[id] = { status: to, selected: extra.selected === undefined ? offers[id].selected : Boolean(extra.selected) }
    },
    async transitionRequest(_id, from, to) {
      if (!canTransitionRequest(from, to, 'client') || request.status !== from) throw new TransitionError('x', 409)
      request.status = to
    },
    async restoreOffer(id, current, values) { if (offers[id].status === current) offers[id].status = String(values.status) },
    async unselectOtherOffers(_r, offerId) { for (const [id, o] of Object.entries(offers)) if (id !== offerId) o.selected = false },
  }
  return { s, request, offers, getLines: () => lines, failLines: () => { failLines = true } }
}

test('payload : total recalculé côté serveur, valeurs nettoyées', () => {
  const p = parseSubmitPayload(body({ total_amount: 1 }))
  expect(totalAmount(p.lines)).toBe(3250.5)
  expect(p.periodicite).toBe('trimestrielle')
  expect(p.notes).toBe('Livraison en janvier')
  expect(p.meta).toMatchObject({ supplier_name: 'Dell', document_date: '2026-10-30', supplier_siren: null })
})

test('payload invalide : aucune ligne, durée hors grille, montant négatif', () => {
  expect(() => parseSubmitPayload(body({ lines: [] }))).toThrow(ClientActionError)
  expect(() => parseSubmitPayload(body({ durationMonths: 12 }))).toThrow('Durée')
  expect(() => parseSubmitPayload(body({ lines: [{ total_price: -5 }] }))).toThrow('invalide')
  expect(parseSubmitPayload(body({ periodicite: 'hebdo', meta: { document_date: 'demain' } }))).toMatchObject({ periodicite: 'mensuelle', meta: { document_date: null } })
})

test('soumission : statut, total et lignes ; un 2e appel ne réécrit rien', async () => {
  const { s, request, getLines } = store()
  expect(await submitRequest(s, USER, 'r1', parseSubmitPayload(body()))).toBe('submitted')
  expect(request.status).toBe('submitted')
  expect(request.fields).toMatchObject({ total_amount: 3250.5, duration_months: 36, periodicite: 'trimestrielle' })
  expect(getLines()).toHaveLength(2)
  expect(await submitRequest(s, USER, 'r1', parseSubmitPayload(body({ lines: [{ total_price: 1 }] })))).toBe('already')
  expect(getLines()).toHaveLength(2)
})

test('type de document : corrigé par le client, sinon celui du brouillon est gardé', async () => {
  expect(parseSubmitPayload(body({ documentType: 'facture' })).documentType).toBe('facture')
  expect(parseSubmitPayload(body({ documentType: 'bon de commande' })).documentType).toBeNull()
  expect(parseSubmitPayload(body()).documentType).toBeNull()

  const corrected = store()
  await submitRequest(corrected.s, USER, 'r1', parseSubmitPayload(body({ documentType: 'facture' })))
  expect(corrected.request.fields).toMatchObject({ document_type: 'facture' })

  const kept = store()
  await submitRequest(kept.s, USER, 'r1', parseSubmitPayload(body()))
  expect(kept.request.fields).not.toHaveProperty('document_type')
})

test('soumission refusée : dossier d’un autre client, montant nul', async () => {
  await expect(submitRequest(store({ owner: 'u2' }).s, USER, 'r1', parseSubmitPayload(body()))).rejects.toMatchObject({ status: 404 })
  await expect(submitRequest(store().s, USER, 'r1', parseSubmitPayload(body({ lines: [{ total_price: 0 }] })))).rejects.toMatchObject({ status: 400 })
})

test('échec d’écriture des lignes : le dossier revient en brouillon', async () => {
  const st = store()
  st.failLines()
  await expect(submitRequest(st.s, USER, 'r1', parseSubmitPayload(body()))).rejects.toThrow('db down')
  expect(st.request.status).toBe('draft')
})

test('confirmer une offre : offre choisie, dossier offer_selected ; une seule par dossier', async () => {
  const st = store({ requestStatus: 'offers_available', offers: { o1: 'indicative', o2: 'indicative' } })
  await confirmOffer(st.s, USER, 'o1')
  expect(st.offers.o1).toEqual({ status: 'client_confirmed', selected: true })
  expect(st.request.status).toBe('offer_selected')
  await expect(confirmOffer(st.s, USER, 'o2')).rejects.toMatchObject({ status: 409 })
  expect(st.offers.o2.status).toBe('indicative')
})

test('confirmer l’offre d’un autre client → 404', async () => {
  const st = store({ requestStatus: 'offers_available', owner: 'u2', offers: { o1: 'indicative' } })
  await expect(confirmOffer(st.s, USER, 'o1')).rejects.toMatchObject({ status: 404 })
})

test('contre-offre : accepter la confirme, refuser renvoie aux autres offres ou en « sans offre »', async () => {
  const accept = store({ requestStatus: 'counter_offer', offers: { o1: 'counter_offer', o2: 'indicative' } })
  await confirmOffer(accept.s, USER, 'o1')
  expect(accept.request.status).toBe('offer_selected')

  const withOthers = store({ requestStatus: 'counter_offer', offers: { o1: 'counter_offer', o2: 'indicative' } })
  await declineCounterOffer(withOthers.s, USER, 'o1')
  expect(withOthers.offers.o1.status).toBe('refused')
  expect(withOthers.request.status).toBe('offers_available')

  const alone = store({ requestStatus: 'counter_offer', offers: { o1: 'counter_offer' } })
  await declineCounterOffer(alone.s, USER, 'o1')
  expect(alone.request.status).toBe('no_match')

  const notCounter = store({ requestStatus: 'offers_available', offers: { o1: 'indicative' } })
  await expect(declineCounterOffer(notCounter.s, USER, 'o1')).rejects.toMatchObject({ status: 409 })
})
