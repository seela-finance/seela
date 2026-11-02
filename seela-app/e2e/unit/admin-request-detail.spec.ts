import { test, expect } from '@playwright/test'
import { buildTimeline, documentPreviewKind, isUuid, type DetailOffer } from '../../lib/admin-request-detail'

const offer = (patch: Partial<DetailOffer>): DetailOffer => ({
  id: 'o1',
  leaser_name: 'BNP Lease',
  monthly_payment: 300,
  duration_months: 36,
  rate: null,
  status: 'indicative',
  selected: false,
  notes: null,
  confirmed_at: null,
  seela_validated_at: null,
  leaser_confirmed_at: null,
  ...patch,
})

test('timeline : création, étapes de l’offre et actions admin, dans l’ordre', () => {
  const t = buildTimeline(
    { created_at: '2026-11-01T09:00:00Z' },
    [offer({ selected: true, confirmed_at: '2026-11-02T10:00:00Z', seela_validated_at: '2026-11-04T10:00:00Z' })],
    [{ id: 'e1', action: 'Note interne', note: 'Appel client', created_at: '2026-11-03T08:00:00Z', adminName: 'Louis' }],
  )
  expect(t.map(i => i.label)).toEqual([
    'Dossier créé',
    'Offre choisie par le client',
    'Note interne',
    'Offre validée et transmise au leaser',
  ])
  expect(t[2]).toMatchObject({ author: 'Louis', detail: 'Appel client' })
  expect(t[3].detail).toBe('BNP Lease')
})

test('timeline : rien d’inventé pour un dossier sans offre ni action', () => {
  expect(buildTimeline({ created_at: '2026-11-01T09:00:00Z' }, [], [])).toHaveLength(1)
})

test('isUuid', () => {
  expect(isUuid('2cfabc4e-1234-4abc-8def-0123456789ab')).toBe(true)
  expect(isUuid('2cfabc4e')).toBe(false)
  expect(isUuid("1' or 1=1")).toBe(false)
  expect(isUuid(undefined)).toBe(false)
})

test('type d’aperçu du document', () => {
  expect(documentPreviewKind('u/1730000000000.pdf')).toBe('pdf')
  expect(documentPreviewKind('u/scan.JPG')).toBe('image')
  expect(documentPreviewKind('u/fichier.docx')).toBeNull()
  expect(documentPreviewKind(null)).toBeNull()
})
