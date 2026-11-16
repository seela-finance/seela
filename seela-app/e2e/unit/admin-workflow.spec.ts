import { test, expect } from '@playwright/test'
import {
  addRequestNote,
  canRerunMatching,
  recordLeaserDecision,
  refuseRequest,
  rerunMatching,
  validateAndTransmit,
  WorkflowError,
  type Email,
  type OfferContext,
  type WorkflowDeps,
  type WorkflowStore,
} from '../../lib/admin-workflow'
import { addManualOffer, canAddManualOffer, canCounterOffer, parseAmount, parseCounterOffer, parseManualOffer, proposeCounterOffer } from '../../lib/admin-offers'
import { TransitionError } from '../../lib/transitions'
import { canTransitionOffer, canTransitionRequest, type OfferStatus, type RequestStatus } from '../../lib/status'
import type { AdminEvent } from '../../lib/admin-events'

// Base en mémoire : un dossier, ses offres, le profil et les leasers ; transitions atomiques comme en prod.
function setup(opts: { offerStatus?: string; requestStatus?: string; otherOffers?: string[]; referent?: string | null; sendOk?: (e: Email) => boolean; matched?: number; insertFails?: boolean } = {}) {
  const offers: Record<string, { status: string; selected: boolean; extra: Record<string, unknown> }> = {
    o1: { status: opts.offerStatus ?? 'client_confirmed', selected: true, extra: {} },
  }
  ;(opts.otherOffers ?? []).forEach((s, i) => { offers[`o${i + 2}`] = { status: s, selected: false, extra: {} } })
  const request = { id: 'r1aaaaaa-0000', status: opts.requestStatus ?? 'offer_selected' }
  const sent: Email[] = []
  const events: AdminEvent[] = []
  const inserted: Record<string, unknown>[] = []

  const ctx = (): OfferContext => ({
    offer: { id: 'o1', request_id: request.id, leaser_name: 'BNP Lease', public_name: 'Financeur A · Banque', monthly_payment: 340, duration_months: 36, status: offers.o1.status },
    request: { id: request.id, status: request.status, user_id: 'u1', total_amount: 12000, document_url: 'doc', line_items: [{ description: 'Serveur', quantity: 2, selected: true }] },
    profile: { company_name: 'Hôtel du Lac', siren: '123456789', email: 'client@hotel.fr' },
    leaser: { referent_email: opts.referent === undefined ? 'partenaires@bnp.fr' : opts.referent, referent_name: 'Équipe BNP' },
  })

  const store: WorkflowStore = {
    loadOffer: async id => (id === 'o1' ? ctx() : null),
    loadRequest: async id => (id === request.id ? { request: { id: request.id, status: request.status, user_id: 'u1' }, profile: { company_name: 'Hôtel du Lac', email: 'client@hotel.fr' } } : null),
    countOtherActiveOffers: async () => Object.entries(offers).filter(([id, o]) => id !== 'o1' && o.status !== 'refused').length,
    async transitionOffer(id, from, to: OfferStatus, extra = {}) {
      if (!canTransitionOffer(from, to, 'admin')) throw new TransitionError('interdite', 409)
      if (offers[id].status !== from) throw new TransitionError('modifié', 409)
      offers[id] = { ...offers[id], status: to, extra: { ...offers[id].extra, ...extra } }
    },
    async transitionRequest(_id, from, to: RequestStatus) {
      if (!canTransitionRequest(from, to, 'admin')) throw new TransitionError('interdite', 409)
      if (request.status !== from) throw new TransitionError('modifié', 409)
      request.status = to
    },
    async restoreOffer(id, current, values) {
      if (offers[id].status === current) offers[id] = { ...offers[id], status: String(values.status), extra: { ...offers[id].extra, ...values } }
    },
    async restoreRequest(_id, current, status) {
      if (request.status === current) request.status = status
    },
    async insertOffer(values) {
      if (opts.insertFails) throw new Error('écriture')
      inserted.push(values)
      return 'Financeur B · Banque'
    },
    async runMatching() {
      request.status = opts.matched ? 'offers_available' : 'no_match'
      return { offers: opts.matched ?? 0 }
    },
  }

  const deps: WorkflowDeps = {
    store,
    send: async e => { sent.push(e); return { success: opts.sendOk ? opts.sendOk(e) : true } },
    log: async e => { events.push(e) },
    documentLink: async () => 'https://signed.example/doc',
    adminEmail: 'louis@everlease.fr',
    now: () => new Date('2026-11-02T10:00:00Z'),
  }
  return { deps, offers, request, sent, events, inserted }
}

test('valider : statuts, email au référent avec l’admin en copie, email client, journal', async () => {
  const { deps, offers, request, sent, events } = setup()
  await validateAndTransmit(deps, 'o1', 'Client fidèle')
  expect(offers.o1.status).toBe('seela_validated')
  expect(offers.o1.extra.seela_validated_at).toBe('2026-11-02T10:00:00.000Z')
  expect(request.status).toBe('seela_validated')
  expect(sent.map(e => e.to)).toEqual(['partenaires@bnp.fr', 'client@hotel.fr'])
  expect(sent[0].cc).toBe('louis@everlease.fr')
  expect(sent[0].html).toContain('Client fidèle')
  expect(sent[0].html).toContain('https://signed.example/doc')
  expect(events.map(e => e.action)).toEqual(['Email envoyé', 'Offre validée et transmise au leaser', 'Email envoyé'])
})

test('double clic : la deuxième validation échoue sans aucun email', async () => {
  const { deps, sent } = setup()
  await validateAndTransmit(deps, 'o1', '')
  const before = sent.length
  await expect(validateAndTransmit(deps, 'o1', '')).rejects.toBeInstanceOf(WorkflowError)
  expect(sent.length).toBe(before)
})

test('échec d’envoi au leaser : statuts inchangés, erreur, pas d’email client', async () => {
  const { deps, offers, request, sent, events } = setup({ sendOk: e => e.to !== 'partenaires@bnp.fr' })
  await expect(validateAndTransmit(deps, 'o1', '')).rejects.toThrow("n'a pas pu partir")
  expect(offers.o1.status).toBe('client_confirmed')
  expect(request.status).toBe('offer_selected')
  expect(sent.map(e => e.to)).toEqual(['partenaires@bnp.fr'])
  expect(events.map(e => e.action)).toEqual(["Échec d'envoi d'email"])
})

test('leaser sans email référent : rien ne change', async () => {
  const { deps, offers, sent } = setup({ referent: null })
  await expect(validateAndTransmit(deps, 'o1', '')).rejects.toThrow('Aucun email référent')
  expect(offers.o1.status).toBe('client_confirmed')
  expect(sent).toHaveLength(0)
})

test('réponse leaser : acceptation → leaser_confirmed et email « financement confirmé »', async () => {
  const { deps, offers, request, sent } = setup({ offerStatus: 'seela_validated', requestStatus: 'seela_validated' })
  await recordLeaserDecision(deps, 'o1', 'confirmed', '')
  expect(offers.o1.status).toBe('leaser_confirmed')
  expect(request.status).toBe('leaser_confirmed')
  expect(sent[0].subject).toContain('Financement confirmé')
})

test('réponse leaser : refus → autres offres disponibles, sinon sans offre ; motif obligatoire', async () => {
  const withOthers = setup({ offerStatus: 'seela_validated', requestStatus: 'seela_validated', otherOffers: ['indicative'] })
  await expect(recordLeaserDecision(withOthers.deps, 'o1', 'refused', ' ')).rejects.toThrow('motif')
  await recordLeaserDecision(withOthers.deps, 'o1', 'refused', 'Secteur exclu')
  expect(withOthers.offers.o1.status).toBe('refused')
  expect(withOthers.request.status).toBe('offers_available')

  const alone = setup({ offerStatus: 'seela_validated', requestStatus: 'seela_validated', otherOffers: ['refused'] })
  await recordLeaserDecision(alone.deps, 'o1', 'refused', 'Score insuffisant')
  expect(alone.request.status).toBe('no_match')
  expect(alone.events.find(e => e.action === 'Offre refusée par le leaser')?.note).toBe('Score insuffisant')
})

test('réponse leaser sur une offre non transmise : refusée', async () => {
  const { deps } = setup()
  await expect(recordLeaserDecision(deps, 'o1', 'confirmed', '')).rejects.toBeInstanceOf(WorkflowError)
})

test('refuser le dossier : motif obligatoire, email seulement avec un message', async () => {
  const silent = setup({ requestStatus: 'no_match' })
  await expect(refuseRequest(silent.deps, 'r1aaaaaa-0000', '', '')).rejects.toThrow('motif')
  await refuseRequest(silent.deps, 'r1aaaaaa-0000', 'Hors cible', '')
  expect(silent.request.status).toBe('refused')
  expect(silent.sent).toHaveLength(0)

  const told = setup({ requestStatus: 'offers_available' })
  await refuseRequest(told.deps, 'r1aaaaaa-0000', 'Hors cible', 'Nous ne pouvons pas financer ce matériel.')
  expect(told.sent[0].to).toBe('client@hotel.fr')
  expect(told.sent[0].html).toContain('Nous ne pouvons pas financer ce matériel.')
  expect(told.sent[0].html).not.toContain('Hors cible')
})

test('un contrat actif ne peut pas être refusé', async () => {
  const { deps } = setup({ requestStatus: 'active' })
  await expect(refuseRequest(deps, 'r1aaaaaa-0000', 'x', '')).rejects.toBeInstanceOf(WorkflowError)
})

test('relance du matching : sans offre, le dossier repasse par submitted et le journal le note', async () => {
  const { deps, request, sent, events } = setup({ requestStatus: 'no_match', matched: 2 })
  expect(await rerunMatching(deps, 'r1aaaaaa-0000')).toEqual({ offers: 2 })
  expect(request.status).toBe('offers_available')
  expect(sent).toHaveLength(0)
  expect(events[0]).toMatchObject({ action: 'Matching relancé', note: '2 nouvelles offres', before: { request: 'no_match' } })
})

test('relance du matching : possible sur un dossier resté submitted, sans nouvelle offre le journal le dit', async () => {
  const { deps, request, events } = setup({ requestStatus: 'submitted' })
  expect(await rerunMatching(deps, 'r1aaaaaa-0000')).toEqual({ offers: 0 })
  expect(request.status).toBe('no_match')
  expect(events[0].note).toBe('Aucune nouvelle offre')
})

test('relance du matching : refusée une fois les offres présentées au client', async () => {
  for (const status of ['offers_available', 'offer_selected', 'seela_validated', 'active', 'refused']) {
    expect(canRerunMatching(status)).toBe(false)
    const { deps, events } = setup({ requestStatus: status, matched: 1 })
    await expect(rerunMatching(deps, 'r1aaaaaa-0000')).rejects.toBeInstanceOf(WorkflowError)
    expect(events).toHaveLength(0)
  }
})

test('note interne : ajoutée au journal, vide refusée, aucun email', async () => {
  const { deps, sent, events } = setup()
  await addRequestNote(deps, 'r1aaaaaa-0000', '  Rappeler lundi  ')
  expect(events).toEqual([{ action: 'Note interne', requestId: 'r1aaaaaa-0000', note: 'Rappeler lundi' }])
  expect(sent).toHaveLength(0)
  await expect(addRequestNote(deps, 'r1aaaaaa-0000', '   ')).rejects.toBeInstanceOf(WorkflowError)
  await expect(addRequestNote(deps, 'inconnu', 'Note')).rejects.toBeInstanceOf(WorkflowError)
})

// ── Offre manuelle et contre-proposition (#34) ───────────────────────

const MANUAL = { leaserName: 'Financeur libre', monthlyPayment: '410,50', durationMonths: '48', periodicite: 'trimestrielle', rate: '', fraisDossier: '150', depotGarantie: '', conditions: ' 1er loyer majoré ' }

test('parseAmount lit les montants saisis à la française', () => {
  expect(parseAmount('1 234,50 €')).toBe(1234.5)
  expect(parseAmount('410')).toBe(410)
  expect(parseAmount('')).toBeNull()
  expect(parseAmount('abc')).toBeNaN()
})

test('offre manuelle : champs contrôlés, le vide devient null', () => {
  expect(parseManualOffer(MANUAL)).toEqual({
    leaserName: 'Financeur libre', monthlyPayment: 410.5, durationMonths: 48, periodicite: 'trimestrielle',
    rate: null, fraisDossier: 150, depotGarantie: null, conditions: '1er loyer majoré',
  })
  expect(() => parseManualOffer({ ...MANUAL, leaserName: ' ' })).toThrow(WorkflowError)
  expect(() => parseManualOffer({ ...MANUAL, monthlyPayment: '0' })).toThrow(/Loyer/)
  expect(() => parseManualOffer({ ...MANUAL, monthlyPayment: '' })).toThrow(/Loyer/)
  expect(() => parseManualOffer({ ...MANUAL, durationMonths: '37' })).toThrow(/Durée/)
  expect(() => parseManualOffer({ ...MANUAL, fraisDossier: '-5' })).toThrow(/Frais/)
  expect(() => parseManualOffer({ ...MANUAL, rate: '45' })).toThrow(/Taux/)
  expect(parseManualOffer({ ...MANUAL, periodicite: 'hebdo' }).periodicite).toBe('mensuelle')
})

test('offre manuelle sur un dossier sans offre : offre écrite, dossier en offres disponibles, email client', async () => {
  const { deps, request, inserted, sent, events } = setup({ requestStatus: 'no_match' })
  await addManualOffer(deps, request.id, parseManualOffer(MANUAL))
  expect(request.status).toBe('offers_available')
  expect(inserted).toEqual([expect.objectContaining({ leaser_name: 'Financeur libre', monthly_payment: 410.5, source: 'manual', status: 'indicative', total_cost: 19704 })])
  expect(sent.map(e => e.to)).toEqual(['client@hotel.fr'])
  expect(sent[0].subject).toContain('Nouvelle offre disponible')
  expect(sent[0].html).toContain("Sous réserve d'acceptation du dossier par le financeur")
  expect(events.map(e => e.action)).toEqual(['Offre manuelle ajoutée', 'Email envoyé'])
})

test('offre manuelle : dossier encore transmis accepté, dossier déjà engagé refusé', async () => {
  const submitted = setup({ requestStatus: 'submitted' })
  await addManualOffer(submitted.deps, submitted.request.id, parseManualOffer(MANUAL))
  expect(submitted.request.status).toBe('offers_available')

  const open = setup({ requestStatus: 'offers_available' })
  await addManualOffer(open.deps, open.request.id, parseManualOffer(MANUAL))
  expect(open.inserted).toHaveLength(1)

  for (const status of ['offer_selected', 'seela_validated', 'active', 'refused', 'draft']) {
    expect(canAddManualOffer(status)).toBe(false)
    const { deps, request, inserted, sent } = setup({ requestStatus: status })
    await expect(addManualOffer(deps, request.id, parseManualOffer(MANUAL))).rejects.toBeInstanceOf(WorkflowError)
    expect(inserted).toHaveLength(0)
    expect(sent).toHaveLength(0)
  }
})

test('offre manuelle : si l’écriture échoue, le dossier reprend son statut et rien ne part', async () => {
  const { deps, request, sent } = setup({ requestStatus: 'no_match', insertFails: true })
  await expect(addManualOffer(deps, request.id, parseManualOffer(MANUAL))).rejects.toThrow('écriture')
  expect(request.status).toBe('no_match')
  expect(sent).toHaveLength(0)
})

const COUNTER = { monthlyPayment: '380', durationMonths: '48', rate: '', conditions: '', clientMessage: 'Le financeur demande 48 mois.' }

test('contre-proposition : anciennes conditions gardées, dossier en contre-proposition, email avec l’ancien loyer barré', async () => {
  const { deps, offers, request, sent, events } = setup({ offerStatus: 'client_confirmed', requestStatus: 'offer_selected' })
  await proposeCounterOffer(deps, 'o1', parseCounterOffer(COUNTER))
  expect(offers.o1.status).toBe('counter_offer')
  expect(offers.o1.extra).toMatchObject({
    previous_terms: { monthly_payment: 340, duration_months: 36, rate: null, conditions: null },
    monthly_payment: 380, duration_months: 48, client_message: 'Le financeur demande 48 mois.', source: 'counter_offer',
  })
  expect(request.status).toBe('counter_offer')
  expect(sent[0].subject).toContain('Contre-proposition')
  expect(sent[0].html).toMatch(/line-through">340\s€/)
  expect(sent[0].html).toContain('Le financeur demande 48 mois.')
  expect(events.map(e => e.action)).toEqual(['Contre-proposition envoyée au client', 'Email envoyé'])
})

test('contre-proposition possible sur une offre indicative ou transmise, pas sur une offre close', () => {
  expect(canCounterOffer('indicative', 'offers_available')).toBe(true)
  expect(canCounterOffer('seela_validated', 'seela_validated')).toBe(true)
  expect(canCounterOffer('leaser_confirmed', 'leaser_confirmed')).toBe(false)
  expect(canCounterOffer('refused', 'offers_available')).toBe(false)
  // Une seule contre-proposition à la fois
  expect(canCounterOffer('indicative', 'counter_offer')).toBe(false)
})

test('contre-proposition identique, ou dossier changé entre-temps : refusée, offre restaurée', async () => {
  const same = setup()
  await expect(proposeCounterOffer(same.deps, 'o1', parseCounterOffer({ ...COUNTER, monthlyPayment: '340', durationMonths: '36' }))).rejects.toThrow(/identiques/)

  const raced = setup({ offerStatus: 'client_confirmed', requestStatus: 'offer_selected' })
  const original = raced.deps.store.transitionRequest
  raced.deps.store.transitionRequest = async () => { throw new TransitionError('modifié', 409) }
  await expect(proposeCounterOffer(raced.deps, 'o1', parseCounterOffer(COUNTER))).rejects.toBeInstanceOf(TransitionError)
  raced.deps.store.transitionRequest = original
  expect(raced.offers.o1.status).toBe('client_confirmed')
  expect(raced.offers.o1.extra).toMatchObject({ previous_terms: null, monthly_payment: 340, duration_months: 36, client_message: null })
  expect(raced.sent).toHaveLength(0)
})

test('les emails au client ne citent jamais le leaser, seulement le nom public de l’offre', async () => {
  const validated = setup()
  await validateAndTransmit(validated.deps, 'o1', '')
  expect(validated.sent[0].to).toBe('partenaires@bnp.fr') // l'email au leaser, lui, lui est adressé
  expect(validated.sent[1].html).not.toContain('BNP')
  expect(validated.sent[1].html).toContain('Financeur A · Banque')

  const decided = setup({ offerStatus: 'seela_validated', requestStatus: 'seela_validated' })
  await recordLeaserDecision(decided.deps, 'o1', 'confirmed', '')
  expect(decided.sent.every(e => !`${e.subject}${e.html}`.includes('BNP'))).toBe(true)

  const manual = setup({ requestStatus: 'no_match' })
  await addManualOffer(manual.deps, manual.request.id, parseManualOffer({ ...MANUAL, leaserName: 'Grenke' }))
  expect(manual.sent[0].html).not.toContain('Grenke')
  expect(manual.sent[0].html).toContain('Financeur B · Banque')

  const counter = setup()
  await proposeCounterOffer(counter.deps, 'o1', parseCounterOffer(COUNTER))
  expect(counter.sent[0].html).not.toContain('BNP')
})
