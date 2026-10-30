import { timingSafeEqual } from 'crypto'

// Vérifie le header `Authorization: Bearer <SEELA_ADMIN_TOKEN>` des routes admin.
// Refuse tout si le token n'est pas configuré (ex. preview Vercel sans la variable),
// sinon `Bearer undefined` passerait.
export function isAdminRequest(req: Request): boolean {
  const token = process.env.SEELA_ADMIN_TOKEN
  if (!token || token.length < 16) return false

  const header = req.headers.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${token}`)
  const received = Buffer.from(header)
  return received.length === expected.length && timingSafeEqual(received, expected)
}
