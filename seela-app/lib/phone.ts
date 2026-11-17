// Numéros de téléphone : format international pour les liens d'appel (tel:), affichage lisible.

/** « 06 12 34 56 78 », « +33 (0)6 12… », « 0033 6… » → « +33612345678 ». Numéro inexploitable → null. */
export function toE164(raw: string | null | undefined, defaultCountry = '33'): string | null {
  if (!raw) return null
  let s = raw.trim().replace(/\(0\)/g, '').replace(/[^\d+]/g, '')
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  if (!s.startsWith('+')) s = s.startsWith('0') ? `+${defaultCountry}${s.slice(1)}` : `+${defaultCountry}${s}`
  const digits = s.slice(1)
  if (!/^\d{8,15}$/.test(digits)) return null
  return s
}

/** +33612345678 → « +33 6 12 34 56 78 » ; autres pays laissés en format international. */
export function formatPhone(e164: string): string {
  const fr = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164)
  return fr ? `+33 ${fr.slice(1).join(' ')}` : e164
}
