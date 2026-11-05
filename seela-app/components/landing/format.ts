// Typographie française des montants : espace fine insécable pour les
// milliers (U+202F), identique côté serveur et navigateur (pas de
// dépendance à l'ICU de l'environnement, donc pas d'écart d'hydratation).
export function fmt(n: number): string {
  const s = String(Math.round(Math.abs(n)))
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return n < 0 ? `-${grouped}` : grouped
}

export const clamp = (x: number) => Math.max(0, Math.min(1, x))
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
