import { test, expect } from '@playwright/test'
import { documentPath } from '../../lib/documents'

const BASE = 'https://abc.supabase.co'
const OWNER = '11111111-1111-1111-1111-111111111111'
const url = (path: string) => `${BASE}/storage/v1/object/public/documents/${path}`

test.beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = BASE
})

test('extrait le chemin d’un document du propriétaire', () => {
  expect(documentPath(url(`${OWNER}/1730000000000.pdf`), OWNER)).toBe(`${OWNER}/1730000000000.pdf`)
  expect(documentPath(url(`${OWNER}/bilans/1-bilan%202024.pdf`), OWNER)).toBe(`${OWNER}/bilans/1-bilan 2024.pdf`)
})

test('refuse le document d’un autre compte', () => {
  expect(documentPath(url(`22222222-2222-2222-2222-222222222222/a.pdf`), OWNER)).toBeNull()
})

test('refuse les remontées de dossier et séparateurs encodés', () => {
  expect(documentPath(url(`${OWNER}/../22222222-2222-2222-2222-222222222222/a.pdf`), OWNER)).toBeNull()
  expect(documentPath(url(`${OWNER}/%2e%2e/22222222-2222-2222-2222-222222222222/a.pdf`), OWNER)).toBeNull()
  expect(documentPath(url(`${OWNER}%2F..%2Fother/a.pdf`), OWNER)).toBeNull()
})

test('refuse une autre origine, une URL invalide ou un propriétaire vide', () => {
  expect(documentPath(`https://evil.example/storage/v1/object/public/documents/${OWNER}/a.pdf`, OWNER)).toBeNull()
  expect(documentPath('pas une url', OWNER)).toBeNull()
  expect(documentPath(42, OWNER)).toBeNull()
  expect(documentPath(url(`${OWNER}/a.pdf`), '')).toBeNull()
})
