import { test, expect } from '@playwright/test'
import {
  REQUEST_STATUSES,
  REQUEST_STATUS,
  OFFER_STATUSES,
  OFFER_STATUS,
  REQUEST_TRANSITIONS,
  OFFER_TRANSITIONS,
  RS,
  OS,
  requestStatusInfo,
  requestDestination,
  requestStatusesIn,
  canTransitionRequest,
  canTransitionOffer,
  requestTimeline,
} from '../../lib/status'

const ID = '00000000-0000-0000-0000-000000000001'

test.describe('Statuts de dossier', () => {
  test('chaque statut a un libellé et une page', () => {
    for (const s of REQUEST_STATUSES) {
      expect(REQUEST_STATUS[s].label.length).toBeGreaterThan(0)
      expect(requestDestination(ID, s)).toMatch(/^\/app\//)
    }
  })

  test('un brouillon mène au flow, jamais à la fiche contrat', () => {
    expect(requestDestination(ID, RS.draft)).toBe('/app/nouveau')
  })

  test('seuls leaser_confirmed et active mènent à la fiche contrat', () => {
    const toContract = REQUEST_STATUSES.filter(s => requestDestination(ID, s).startsWith('/app/contrats/'))
    expect(toContract.sort()).toEqual([RS.active, RS.leaser_confirmed].sort())
    expect(requestStatusesIn('contrats').sort()).toEqual([RS.active, RS.leaser_confirmed].sort())
  })

  test('statut inconnu : « En cours », gris, jamais la fiche contrat', () => {
    for (const s of ['selected', 'fulfilled', 'xyz', null, undefined]) {
      expect(requestStatusInfo(s).label).toBe('En cours')
      expect(requestDestination(ID, s)).toBe(`/app/offres/${ID}`)
    }
  })

  test('transitions cohérentes', () => {
    for (const [from, ts] of Object.entries(REQUEST_TRANSITIONS)) {
      for (const t of ts) {
        expect(REQUEST_STATUSES).toContain(t.to)
        expect(t.by.length).toBeGreaterThan(0)
        expect(t.to).not.toBe(from)
      }
    }
    expect(REQUEST_TRANSITIONS.active).toEqual([])
    expect(REQUEST_TRANSITIONS.refused).toEqual([])
  })

  test('le client ne peut pas activer ni valider lui-même un dossier', () => {
    for (const from of REQUEST_STATUSES) {
      expect(canTransitionRequest(from, RS.active, 'client')).toBe(false)
      expect(canTransitionRequest(from, RS.seela_validated, 'client')).toBe(false)
      expect(canTransitionRequest(from, RS.leaser_confirmed, 'client')).toBe(false)
    }
    expect(canTransitionRequest(RS.offers_available, RS.offer_selected, 'client')).toBe(true)
    expect(canTransitionRequest(RS.offer_selected, RS.seela_validated, 'admin')).toBe(true)
    expect(canTransitionRequest('selected', RS.active, 'admin')).toBe(false)
  })
})

test.describe("Statuts d'offre", () => {
  test('chaque statut a un libellé', () => {
    for (const s of OFFER_STATUSES) expect(OFFER_STATUS[s].label.length).toBeGreaterThan(0)
  })

  test('transitions cohérentes', () => {
    for (const ts of Object.values(OFFER_TRANSITIONS)) {
      for (const t of ts) expect(OFFER_STATUSES).toContain(t.to)
    }
    expect(canTransitionOffer(OS.indicative, OS.client_confirmed, 'client')).toBe(true)
    expect(canTransitionOffer(OS.indicative, OS.seela_validated, 'client')).toBe(false)
    expect(canTransitionOffer(OS.counter_offer, OS.client_confirmed, 'client')).toBe(true)
    expect(canTransitionOffer(OS.client_confirmed, OS.seela_validated, 'admin')).toBe(true)
  })
})

test.describe('Timeline client', () => {
  test('leaser_confirmed : 4 étapes faites, démarrage en cours', () => {
    const states = requestTimeline(RS.leaser_confirmed).map(s => s.state)
    expect(states).toEqual(['done', 'done', 'done', 'done', 'current'])
  })

  test('active : tout est fait', () => {
    expect(requestTimeline(RS.active).every(s => s.state === 'done')).toBe(true)
  })

  test('statut hors parcours : rien de coché', () => {
    expect(requestTimeline('xyz').every(s => s.state === 'todo')).toBe(true)
  })
})
