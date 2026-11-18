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

export const LINE_TYPE_LABEL: Record<string, string> = { MOBILE: 'Mobile', LANDLINE: 'Fixe', VOIP: 'VoIP' }

/** « depuis 3 mois », « depuis 2 ans » à partir d'une date de prise de poste. */
export function sinceLabel(date: string | null, now: Date): string | null {
  if (!date) return null
  const months = (now.getFullYear() - Number(date.slice(0, 4))) * 12 + (now.getMonth() + 1 - Number(date.slice(5, 7)))
  if (!Number.isFinite(months) || months < 0) return null
  if (months < 1) return 'depuis moins d’un mois'
  if (months < 24) return `depuis ${months} mois`
  return `depuis ${Math.floor(months / 12)} ans`
}
