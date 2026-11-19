import { timingSafeEqual } from 'node:crypto'

/** Vrai si l'en-tête `Authorization` vaut exactement `Bearer <secret>` (comparaison à temps constant). */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}
