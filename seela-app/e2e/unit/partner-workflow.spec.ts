import { test, expect } from '@playwright/test'
import { ClientActionError, confirmOffer, type ClientStore, type SubmitPayload } from '../../lib/client-workflow'
import {
  acceptInvitation, contractEndDate, hashToken, invitationState, parseClientInput, parseStartDate, partnerLine,
  resendInvitation, submitAsPartner, type Invitation, type PartnerContext, type PartnerRequestRow, type PartnerStore,
} from '../../lib/partner-workflow'
import { safeNext } from '../../lib/auth-redirect'

const NOW = new Date('2026-11-18T10:00:00Z')
const PARTNER: PartnerContext = { contactId: 'ct-p', companyId: 'co-p', companyName: 'BoucheCousue', companySiren: '518981030', partnerEnabled: true }
const PAYLOAD: SubmitPayload = {
  lines: [{ description: 'Switch', quantity: 1, unit_price: 1000, total_price: 1000, category: null, equipment_family: null, equipment_type: null }],
  durationMonths: 48, periodicite: 'mensuelle', documentType: 'devis', notes: null,
  meta: { supplier_name: null, supplier_address: null, supplier_siren: null, document_number: null, document_date: null },
}
const CLIENT = { siren: '123456789', email: 'dg@client.fr', firstName: null, lastName: null }

function partnerStore(over: Partial<PartnerStore> = {}) {
  const calls: Record<string, unknown[]> = {}
  const log = (name: string) => (...args: unknown[]) => { (calls[name] ??= []).push(args); return Promise.resolve() }
  const store: PartnerStore = {
    loadPartner: async () => PARTNER,
    findOrCreateClientCompany: async () => ({ id: 'co-c', name: 'Client SAS' }),
    attachRequest: log('attach') as PartnerStore['attachRequest'],
    revokeInvitations: log('revoke') as PartnerStore['revokeInvitations'],
    createInvitation: log('invite') as PartnerStore['createInvitation'],
    loadInvitation: async () => null,
    markAccepted: async () => true,
    handOver: log('handOver') as PartnerStore['handOver'],
    ...over,
  }
  return { store, calls }
}

function clientStore(status = 'draft', userId = 'u-p'): ClientStore {
  return {
    loadRequest: async () => ({ id: 'r1', status, user_id: userId }),
    claimSubmission: async () => {},
    replaceLines: async () => {},
    revertSubmission: async () => {},
    loadOffer: async () => null,
    transitionOffer: async () => {},
    transitionRequest: async () => {},
    restoreOffer: async () => {},
    unselectOtherOffers: async () => {},
  }
}

const invitation = (over: Partial<Invitation> = {}): Invitation => ({
  id: 'i1', request_id: 'r1', email: 'dg@client.fr', expires_at: '2026-12-18T10:00:00Z',
  accepted_at: null, accepted_by: null, revoked_at: null, ...over,
})

test.describe('saisie du client', () => {
  test('SIREN avec espaces et email en majuscules sont normalisés', () => {
    expect(parseClientInput({ siren: '123 456 789', email: ' DG@Client.FR ' })).toMatchObject({ siren: '123456789', email: 'dg@client.fr' })
  })
  test('SIREN ou email invalide refusés', () => {
    expect(() => parseClientInput({ siren: '12345', email: 'a@b.fr' })).toThrow(ClientActionError)
    expect(() => parseClientInput({ siren: '123456789', email: 'pas-un-email' })).toThrow(ClientActionError)
  })
})

test.describe('envoi par le partenaire', () => {
  test('rattache au client avant le matching et crée une invitation de 30 jours, jeton jamais stocké en clair', async () => {
    const { store, calls } = partnerStore()
    const result = await submitAsPartner({ partner: store, client: clientStore() }, 'u-p', 'r1', PAYLOAD, CLIENT, NOW)
    expect(result.status).toBe('submitted')
    if (result.status !== 'submitted') return
    expect(calls.attach[0]).toEqual(['r1', { company_id: 'co-c', partner_company_id: 'co-p', partner_contact_id: 'ct-p' }])
    const inv = (calls.invite[0] as [Record<string, string>])[0]
    expect(inv.email).toBe('dg@client.fr')
    expect(inv.token_hash).toBe(hashToken(result.token))
    expect(inv.token_hash).not.toBe(result.token)
    expect(inv.expires_at).toBe('2026-12-18T10:00:00.000Z')
  })

  test('une société non activée ne peut pas envoyer de dossier client', async () => {
    const { store } = partnerStore({ loadPartner: async () => ({ ...PARTNER, partnerEnabled: false }) })
    await expect(submitAsPartner({ partner: store, client: clientStore() }, 'u-p', 'r1', PAYLOAD, CLIENT, NOW)).rejects.toMatchObject({ status: 403 })
  })

  test('le SIREN du partenaire lui-même est refusé', async () => {
    const { store } = partnerStore()
    await expect(submitAsPartner({ partner: store, client: clientStore() }, 'u-p', 'r1', PAYLOAD, { ...CLIENT, siren: '518981030' }, NOW))
      .rejects.toMatchObject({ status: 400 })
  })

  test('dossier déjà soumis : ni rattachement ni nouvelle invitation', async () => {
    const { store, calls } = partnerStore()
    const result = await submitAsPartner({ partner: store, client: clientStore('submitted') }, 'u-p', 'r1', PAYLOAD, CLIENT, NOW)
    expect(result.status).toBe('already')
    expect(calls.attach).toBeUndefined()
    expect(calls.invite).toBeUndefined()
  })

  test('renvoi : seulement pour un dossier de sa société que le client n’a pas rejoint ; l’ancien lien est annulé', async () => {
    const { store, calls } = partnerStore()
    await resendInvitation(store, 'u-p', { id: 'r1', partner_company_id: 'co-p', client_joined_at: null }, 'new@client.fr', NOW)
    expect(calls.revoke).toHaveLength(1)
    await expect(resendInvitation(store, 'u-p', { id: 'r1', partner_company_id: 'co-autre', client_joined_at: null }, 'x@y.fr', NOW)).rejects.toMatchObject({ status: 404 })
    await expect(resendInvitation(store, 'u-p', { id: 'r1', partner_company_id: 'co-p', client_joined_at: NOW.toISOString() }, 'x@y.fr', NOW)).rejects.toMatchObject({ status: 409 })
  })
})

test.describe('invitation du client', () => {
  const TOKEN = 'jeton-de-test-suffisamment-long'

  test('le bon email rejoint le dossier : il en devient propriétaire', async () => {
    const { store, calls } = partnerStore({ loadInvitation: async h => (h === hashToken(TOKEN) ? invitation() : null) })
    expect(await acceptInvitation(store, 'u-c', 'DG@client.fr', TOKEN, NOW)).toBe('r1')
    expect((calls.handOver[0] as unknown[]).slice(0, 2)).toEqual(['r1', 'u-c'])
  })

  test('un autre email, un lien expiré, annulé ou inconnu ne donnent rien', async () => {
    const run = (inv: Invitation | null, email = 'dg@client.fr') =>
      acceptInvitation(partnerStore({ loadInvitation: async () => inv }).store, 'u-c', email, TOKEN, NOW)
    await expect(run(invitation(), 'autre@client.fr')).rejects.toMatchObject({ status: 403 })
    await expect(run(invitation({ expires_at: '2026-11-01T00:00:00Z' }))).rejects.toMatchObject({ status: 410 })
    await expect(run(invitation({ revoked_at: '2026-11-10T00:00:00Z' }))).rejects.toMatchObject({ status: 404 })
    await expect(run(null)).rejects.toMatchObject({ status: 404 })
  })

  test('déjà accepté : idempotent pour le même compte, refusé pour un autre', async () => {
    const accepted = invitation({ accepted_at: '2026-11-17T00:00:00Z', accepted_by: 'u-c' })
    const { store, calls } = partnerStore({ loadInvitation: async () => accepted })
    expect(await acceptInvitation(store, 'u-c', 'dg@client.fr', TOKEN, NOW)).toBe('r1')
    expect(calls.handOver).toBeUndefined()
    await expect(acceptInvitation(store, 'u-x', 'dg@client.fr', TOKEN, NOW)).rejects.toMatchObject({ status: 409 })
  })

  test('deux clics simultanés : le second ne transfère pas le dossier une deuxième fois', async () => {
    let reads = 0
    const { store, calls } = partnerStore({
      loadInvitation: async () => (reads++ === 0 ? invitation() : invitation({ accepted_at: 'x', accepted_by: 'u-c' })),
      markAccepted: async () => false,
    })
    expect(await acceptInvitation(store, 'u-c', 'dg@client.fr', TOKEN, NOW)).toBe('r1')
    expect(calls.handOver).toBeUndefined()
  })

  test('état du lien pour la page publique', () => {
    expect(invitationState(invitation(), NOW)).toBe('valid')
    expect(invitationState(invitation({ accepted_at: 'x' }), NOW)).toBe('accepted')
    expect(invitationState(invitation({ expires_at: '2026-01-01T00:00:00Z' }), NOW)).toBe('expired')
    expect(invitationState(null, NOW)).toBe('invalid')
  })
})

test('le partenaire ne confirme pas l’offre à la place du client', async () => {
  const store = {
    ...clientStore(),
    loadOffer: async () => ({
      offer: { id: 'o1', status: 'indicative', request_id: 'r1' },
      request: { id: 'r1', status: 'offers_available', user_id: 'u-p', partner_company_id: 'co-p', client_joined_at: null },
      others: [],
    }),
  }
  await expect(confirmOffer(store, 'u-p', 'o1')).rejects.toMatchObject({ status: 403 })
})

test.describe('suivi du partenaire', () => {
  const row = (over: Partial<PartnerRequestRow> = {}): PartnerRequestRow => ({
    id: 'r1', status: 'offers_available', total_amount: '122652', duration_months: 48, created_at: '2026-11-17T10:00:00Z',
    client_joined_at: null, contract_start_date: null, companies: { name: 'Client SAS' },
    offers: [
      { monthly_payment: '3054', duration_months: 48, status: 'indicative', selected: false },
      { monthly_payment: '2990', duration_months: 48, status: 'refused', selected: false },
    ],
    ...over,
  })

  test('avant le client : meilleure offre indicative non refusée, « En attente du client »', () => {
    const l = partnerLine(row())
    expect(l).toMatchObject({ monthly: 3054, monthlyIsIndicative: true, statusLabel: 'En attente du client', awaitingClient: true, amount: 122652 })
  })

  test('contrat actif : loyer choisi et date de fin', () => {
    const l = partnerLine(row({
      status: 'active', client_joined_at: '2026-11-18T00:00:00Z', contract_start_date: '2026-12-01',
      offers: [{ monthly_payment: '3054', duration_months: 48, status: 'leaser_confirmed', selected: true }],
    }))
    expect(l).toMatchObject({ statusLabel: 'Contrat actif', monthlyIsIndicative: false, contractEnd: '2030-12-01', awaitingClient: false })
  })

  test('fin de contrat : fin de mois respectée', () => {
    expect(contractEndDate('2026-01-31', 1)).toBe('2026-02-28')
    expect(contractEndDate('2026-12-01', 36)).toBe('2029-12-01')
    expect(contractEndDate(null, 36)).toBeNull()
  })

  test('date de démarrage saisie par l’équipe', () => {
    expect(parseStartDate('2026-12-01', NOW)).toBe('2026-12-01')
    expect(parseStartDate('2026-02-30', NOW)).toBeNull()
    expect(parseStartDate('2020-01-01', NOW)).toBeNull()
    expect(parseStartDate('01/12/2026', NOW)).toBeNull()
  })
})

test('retour après connexion : seulement un chemin interne connu', () => {
  expect(safeNext('/invitation/abc_DEF-123')).toBe('/invitation/abc_DEF-123')
  expect(safeNext('/app/offres/1234')).toBe('/app/offres/1234')
  expect(safeNext('//evil.com')).toBeNull()
  expect(safeNext('https://evil.com')).toBeNull()
  expect(safeNext('/invitation//evil.com')).toBeNull()
  expect(safeNext('/auth')).toBeNull()
  expect(safeNext(null)).toBeNull()
})
