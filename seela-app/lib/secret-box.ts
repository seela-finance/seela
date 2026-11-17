import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// Chiffrement AES-256-GCM des secrets stockés en base (mots de passe des boîtes mail).
// Format : v1.<iv>.<tag>.<données>, en base64url. La clé (32 octets, base64) vit dans EMAIL_ENCRYPTION_KEY.

function key(): Buffer {
  const raw = process.env.EMAIL_ENCRYPTION_KEY
  const k = raw ? Buffer.from(raw, 'base64') : null
  if (!k || k.length !== 32) throw new Error('EMAIL_ENCRYPTION_KEY absente ou invalide (32 octets en base64)')
  return k
}

export const isSecretBoxConfigured = () => {
  try { key(); return true } catch { return false }
}

export function seal(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv, cipher.getAuthTag(), data].map(p => (typeof p === 'string' ? p : p.toString('base64url'))).join('.')
}

export function open(sealed: string): string {
  const [v, iv, tag, data] = sealed.split('.')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Secret illisible')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}
