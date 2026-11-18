// Mesure d'audience et entonnoir (PostHog, hébergement UE) : sans cookie ni stockage dans le navigateur.
// Sans clé (NEXT_PUBLIC_POSTHOG_KEY), en test ou sur le back-office : rien n'est chargé ni envoyé.
import posthog from 'posthog-js'

let started = false

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''

/** Démarre PostHog une seule fois. Les envois passent par /ingest (même domaine, voir next.config.ts). */
export function startAnalytics(): boolean {
  if (started) return true
  if (!POSTHOG_KEY || typeof window === 'undefined') return false
  posthog.init(POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    // Aucun cookie ni localStorage : pas de bandeau de consentement nécessaire pour cette mesure
    persistence: 'memory',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    session_recording: { maskAllInputs: true },
  })
  started = true
  return true
}

/** Étape de l'entonnoir (inscription, devis déposé, dossier transmis, offre choisie…). Ne lève jamais. */
export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  try {
    if (started) posthog.capture(event, properties)
  } catch {
    // La mesure ne doit jamais gêner le parcours
  }
}

/** Relie la visite au compte connecté (identifiant interne seulement, jamais l'email). */
export function identify(userId: string) {
  try {
    if (started) posthog.identify(userId)
  } catch {
    // idem
  }
}
