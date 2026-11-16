import { test, expect } from '@playwright/test'
import { afterConfirmPath, authCallbackUrl, authErrorMessage } from '../../lib/auth-redirect'

test('le lien de confirmation revient sur le site d’inscription', () => {
  expect(authCallbackUrl('https://www.everlease.fr')).toBe('https://www.everlease.fr/auth/callback')
  expect(authCallbackUrl('https://seela-git-develop-everlease.vercel.app/')).toBe('https://seela-git-develop-everlease.vercel.app/auth/callback')
  expect(authCallbackUrl('http://localhost:3000')).toBe('http://localhost:3000/auth/callback')
})

test('après confirmation : onboarding tant qu’il n’est pas terminé', () => {
  expect(afterConfirmPath(false)).toBe('/app/onboarding')
  expect(afterConfirmPath(null)).toBe('/app/onboarding')
  expect(afterConfirmPath(true)).toBe('/app/dashboard')
})

test('message du lien expiré ; code inconnu ignoré', () => {
  expect(authErrorMessage('auth_callback_error')).toMatch(/expiré ou a été ouvert dans un autre navigateur/)
  expect(authErrorMessage('autre')).toBeNull()
  expect(authErrorMessage(null)).toBeNull()
})
