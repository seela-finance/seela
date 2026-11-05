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
import { TransitionError } from '../../lib/transitions'
import { canTransitionOffer, canTransitionRequest, type OfferStatus, type RequestStatus } from '../../lib/status'
import type { AdminEvent } from '../../lib/admin-events'

// Base en mémoire : un dossier, ses offres, le profil et les leasers ; transitions atomiques comme en prod.
function setup(opts: { offerStatus?: string; requestStatus?: string; otherOffers?: string[]; referent?: string | null; sendOk?: (e: Email) => boolean; matched?: number } = {}) {
  const offers: Record<string, { status: string; selected: boolean; extra: Record<string, unknown> }> = {
    o1: { status: opts.offerStatus ?? 'client_confirmed', selected: true, extra: {} },
  }
  ;(opts.otherOffers ?? []).forEach((s, i) => { offers[`o${i + 2}`] = { status: s, selected: false, extra: {} } })
  const request = { id: 'r1aaaaaa-0000', status: opts.requestStatus ?? 'offer_selected' }
  const sent: Email[] = []
  const events: AdminEvent[] = []

  const ctx = (): OfferContext => ({
    offer: { id: 'o1', request_id: request.id, leaser_name: 'BNP Lease', monthly_payment: 340, duration_months: 36, status: offers.o1.status },
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
      if (offers[id].status === current) offers[id] = { ...offers[id], status: String(values.status) }
    },
    async restoreRequest(_id, current, status) {
      if (request.status === current) request.status = status
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
  return { deps, offers, request, sent, events }
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
