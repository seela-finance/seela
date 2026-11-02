import { test, expect } from '@playwright/test'
import {
  ADMIN_PAGE_SIZE,
  lastActionAt,
  listAdminRequests,
  matchesSearch,
  parseAdminListParams,
  sinceLabel,
  toAdminRequest,
  type AdminListParams,
  type AdminRequestRow,
} from '../../lib/admin-requests'

const NOW = new Date('2026-11-10T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

function row(id: string, status: string, patch: Partial<AdminRequestRow> = {}): AdminRequestRow {
  return {
    id,
    status,
    total_amount: 10000,
    duration_months: 36,
    created_at: daysAgo(10),
    updated_at: null,
    profiles: { company_name: 'Hôtel du Lac', siren: '123456789' },
    offers: [],
    ...patch,
  }
}

const TODO: AdminListParams = { tab: 'todo', status: null, query: '', page: 1 }

test('« À traiter » : un dossier offer_selected depuis 3 jours passe en tête', () => {
  const requests = [
    row('aaaaaaaa-0000', 'submitted', { created_at: daysAgo(1) }),
    row('bbbbbbbb-0000', 'offer_selected', {
      created_at: daysAgo(8),
      offers: [{ leaser_name: 'BNP Lease', monthly_payment: 340, duration_months: 36, selected: true, confirmed_at: daysAgo(3) }],
    }),
    row('cccccccc-0000', 'no_match', { created_at: daysAgo(2) }),
  ].map(toAdminRequest)

  const { items } = listAdminRequests(requests, TODO)
  expect(items.map(r => r.id)).toEqual(['bbbbbbbb-0000', 'cccccccc-0000', 'aaaaaaaa-0000'])
  expect(items[0].leaserName).toBe('BNP Lease')
  expect(items[0].monthly).toBe(340)
})

test('« À traiter » exclut brouillons, offres disponibles et contrats actifs', () => {
  const requests = ['draft', 'offers_available', 'active', 'refused', 'leaser_confirmed', 'seela_validated']
    .map((s, i) => toAdminRequest(row(`${i}0000000-0000`, s)))
  expect(listAdminRequests(requests, TODO).items.map(r => r.status)).toEqual(['seela_validated'])
})

test('« Tous » : filtre de statut et plus récents en tête', () => {
  const requests = [
    row('aaaaaaaa-0000', 'active', { created_at: daysAgo(5) }),
    row('bbbbbbbb-0000', 'draft', { created_at: daysAgo(1) }),
    row('cccccccc-0000', 'active', { created_at: daysAgo(2) }),
  ].map(toAdminRequest)
  const all: AdminListParams = { tab: 'all', status: null, query: '', page: 1 }
  expect(listAdminRequests(requests, all).items.map(r => r.id)).toEqual(['bbbbbbbb-0000', 'cccccccc-0000', 'aaaaaaaa-0000'])
  expect(listAdminRequests(requests, { ...all, status: 'active' }).items.map(r => r.id)).toEqual(['cccccccc-0000', 'aaaaaaaa-0000'])
})

test('recherche par SIREN, raison sociale (sans accents) et référence', () => {
  const r = toAdminRequest(row('2cfabc4e-1234', 'submitted', { profiles: { company_name: 'Hôtel du Lac', siren: '123 456 789' } }))
  expect(matchesSearch(r, '123456789')).toBe(true)
  expect(matchesSearch(r, '123 456')).toBe(true)
  expect(matchesSearch(r, 'hotel du')).toBe(true)
  expect(matchesSearch(r, 'C-2CFA-BC4E')).toBe(true)
  expect(matchesSearch(r, '2cfa')).toBe(true)
  expect(matchesSearch(r, 'boulangerie')).toBe(false)
  expect(matchesSearch(r, '99')).toBe(false)
})

test('dernière action : la plus récente des dates du dossier et de ses offres', () => {
  const r = row('aaaaaaaa-0000', 'seela_validated', {
    created_at: daysAgo(10),
    updated_at: daysAgo(9),
    offers: [{ leaser_name: 'X', monthly_payment: 1, duration_months: 36, selected: true, confirmed_at: daysAgo(6), seela_validated_at: daysAgo(4) }],
  })
  expect(lastActionAt(r)).toBe(daysAgo(4))
})

test('pagination par 50, page hors limites ramenée à la dernière', () => {
  const requests = Array.from({ length: ADMIN_PAGE_SIZE + 5 }, (_, i) =>
    toAdminRequest(row(`${String(i).padStart(8, '0')}-0000`, 'submitted', { created_at: daysAgo(i) })),
  )
  const first = listAdminRequests(requests, TODO)
  expect(first.items).toHaveLength(ADMIN_PAGE_SIZE)
  expect(first.pageCount).toBe(2)
  const last = listAdminRequests(requests, { ...TODO, page: 9 })
  expect(last.page).toBe(2)
  expect(last.items).toHaveLength(5)
})

test('paramètres d’URL : valeurs inconnues → défauts', () => {
  expect(parseAdminListParams({})).toEqual({ tab: 'todo', status: null, query: '', page: 1 })
  expect(parseAdminListParams({ tab: 'all', status: 'active', q: 'lac', page: '3' })).toEqual({ tab: 'all', status: 'active', query: 'lac', page: 3 })
  expect(parseAdminListParams({ tab: 'x', status: 'nope', page: '-2' })).toEqual({ tab: 'todo', status: null, query: '', page: 1 })
})

test('libellé de dernière action', () => {
  expect(sinceLabel(daysAgo(0), NOW)).toBe("aujourd'hui")
  expect(sinceLabel(daysAgo(1), NOW)).toBe('hier')
  expect(sinceLabel(daysAgo(3), NOW)).toBe('il y a 3 j')
  expect(sinceLabel(daysAgo(90), NOW)).toBe('il y a 3 mois')
})
