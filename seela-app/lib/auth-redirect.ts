// Retour du lien de confirmation d'email (Supabase Auth) : où revenir, où envoyer ensuite, quoi afficher en cas d'échec.
// Sans dépendance serveur : testable.

/**
 * Page de retour du lien de confirmation, sur le site d'où l'on s'inscrit (prod, preview ou local).
 * Sans elle, Supabase renvoie vers l'« adresse du site » réglée dans le projet, qui peut être périmée.
 * L'adresse doit figurer dans les Redirect URLs du projet Supabase.
 */
export function authCallbackUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/auth/callback`
}

/** Après confirmation : l'onboarding tant qu'il n'est pas terminé, sinon le tableau de bord. */
export function afterConfirmPath(onboardingCompleted: boolean | null | undefined): string {
  return onboardingCompleted ? '/app/dashboard' : '/app/onboarding'
}

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Lien expiré, déjà utilisé, ou ouvert dans un autre navigateur que celui de l'inscription
  auth_callback_error:
    'Ce lien de confirmation a expiré ou a été ouvert dans un autre navigateur. Si votre email est déjà confirmé, connectez-vous ci-dessous ; sinon, inscrivez-vous de nouveau pour recevoir un autre lien.',
}

export function authErrorMessage(code: string | null | undefined): string | null {
  return code ? AUTH_ERROR_MESSAGES[code] ?? null : null
}

/**
 * Retour après connexion (lien d'invitation d'un partenaire) : seulement un chemin interne connu,
 * jamais une adresse externe (`//site`, `/\site`, `https://…`) qui ferait de /auth une redirection ouverte.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || next.length > 300) return null
  if (!/^\/(invitation|app)\/[A-Za-z0-9_\-/]+$/.test(next) || next.includes('//')) return null
  return next
}

/** Lien de confirmation d'email qui ramène ensuite à `next` (sinon : onboarding ou tableau de bord). */
export function authCallbackUrlWithNext(origin: string, next: string | null): string {
  const base = authCallbackUrl(origin)
  const safe = safeNext(next)
  return safe ? `${base}?next=${encodeURIComponent(safe)}` : base
}
