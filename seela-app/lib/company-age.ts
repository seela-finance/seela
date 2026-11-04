// Ancienneté d'une société pour le matching (`leasers.anciennete_min_mois`).
// On ne connaît que l'année de création (profiles.date_creation) : on retient la
// borne basse (créée le 31 décembre de cette année) pour ne jamais surestimer l'âge.

const LEGACY_BRACKET_MONTHS: Record<string, number> = { '< 2 ans': 0, '2 – 5 ans': 24, '> 5 ans': 60 }

export function companyAgeMonths(
  profile: { date_creation?: number | null; age_bracket?: string | null } | null,
  now: Date = new Date(),
): number {
  const year = profile?.date_creation
  if (typeof year === 'number' && Number.isInteger(year) && year > 1800 && year <= now.getFullYear()) {
    return Math.max(0, (now.getFullYear() - year) * 12 + now.getMonth() + 1 - 12)
  }
  // Ancien champ de tranche, s'il a été renseigné
  const bracket = profile?.age_bracket ? LEGACY_BRACKET_MONTHS[profile.age_bracket] : undefined
  if (bracket !== undefined) return bracket
  // Inconnue : on ne suppose rien (seuls les leasers sans ancienneté minimale restent)
  return 0
}
