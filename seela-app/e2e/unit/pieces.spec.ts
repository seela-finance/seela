import { test, expect } from '@playwright/test'
import {
  isYoungCompany, missingForTransmission, pieceChecklist, pieceProgress, requiredPieces, sensitiveDocsToPurge, type PieceDoc,
} from '../../lib/pieces'

const NOV = new Date('2026-11-24T10:00:00Z')
const MARCH = new Date('2026-03-10T10:00:00Z')
const OLD = { creation_year: 2015 }
const YOUNG = { creation_year: 2026 }

const doc = (kind: string, status: string, over: Partial<PieceDoc> = {}): PieceDoc => ({
  id: `${kind}-${status}-${over.created_at ?? '1'}`, kind, status, path: `u/pieces/${kind}.pdf`, file_name: `${kind}.pdf`,
  review_note: null, created_at: over.created_at ?? '2026-11-01T00:00:00Z', reviewed_at: null, deleted_at: null, ...over,
})

test('pièces requises : Kbis + liasse, situation intermédiaire passé le 30 juin, statuts + prévisionnel pour une jeune société', () => {
  expect(requiredPieces(OLD, 'dossier', MARCH)).toEqual(['kbis', 'liasse'])
  expect(requiredPieces(OLD, 'dossier', NOV)).toEqual(['kbis', 'liasse', 'situation'])
  expect(requiredPieces(YOUNG, 'dossier', NOV)).toEqual(['kbis', 'statuts', 'previsionnel'])
  expect(requiredPieces({ creation_year: 2025 }, 'dossier', NOV)).toEqual(['kbis', 'statuts', 'previsionnel'])
  expect(requiredPieces(OLD, 'contrat', NOV)).toEqual(['identite', 'rib'])
  expect(isYoungCompany({ creation_year: null }, NOV)).toBe(false)
})

test('checklist : dernier dépôt par nature, un refus rouvre la pièce, une dispense compte comme fournie', () => {
  const docs = [
    doc('kbis', 'refusee', { created_at: '2026-11-01T00:00:00Z', review_note: 'Périmé' }),
    doc('kbis', 'en_verification', { created_at: '2026-11-02T00:00:00Z' }),
    doc('liasse', 'validee'),
    doc('situation', 'dispensee', { path: null }),
  ]
  const rows = pieceChecklist(OLD, docs, 'dossier', NOV)
  expect(rows.map(r => [r.kind, r.status])).toEqual([['kbis', 'en_verification'], ['liasse', 'validee'], ['situation', 'dispensee']])
  expect(missingForTransmission(OLD, docs, NOV)).toEqual(['kbis'])
  expect(pieceProgress(OLD, docs, 'dossier', NOV)).toEqual({ done: 2, total: 3 })
})

test('transmission : tout manque sans dépôt ; rien ne manque quand tout est validé ; un fichier effacé ne compte plus', () => {
  expect(missingForTransmission(OLD, [], NOV)).toEqual(['kbis', 'liasse', 'situation'])
  const all = [doc('kbis', 'validee'), doc('liasse', 'validee'), doc('situation', 'validee')]
  expect(missingForTransmission(OLD, all, NOV)).toEqual([])
  expect(missingForTransmission(OLD, [doc('kbis', 'validee', { deleted_at: '2026-11-20T00:00:00Z' })], MARCH)).toEqual(['kbis', 'liasse'])
})

test('purge : pièces sensibles 30 jours après la décision du financeur, jamais tant qu’un dossier est en cours', () => {
  const co = () => 'c1'
  const docs = [doc('identite', 'validee'), doc('rib', 'validee'), doc('kbis', 'validee')]
  const decidedLongAgo = [{ company_id: 'c1', status: 'leaser_confirmed', updated_at: '2026-10-01T00:00:00Z' }]
  expect(sensitiveDocsToPurge(docs, co, decidedLongAgo, NOV).map(d => d.kind)).toEqual(['identite', 'rib'])
  const decidedRecently = [{ company_id: 'c1', status: 'refused', updated_at: '2026-11-10T00:00:00Z' }]
  expect(sensitiveDocsToPurge(docs, co, decidedRecently, NOV)).toEqual([])
  const stillOpen = [...decidedLongAgo, { company_id: 'c1', status: 'submitted', updated_at: '2026-11-20T00:00:00Z' }]
  expect(sensitiveDocsToPurge(docs, co, stillOpen, NOV)).toEqual([])
  expect(sensitiveDocsToPurge(docs, co, [], NOV)).toEqual([])
})
