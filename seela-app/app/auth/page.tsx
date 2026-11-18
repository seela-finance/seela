'use client'
import { track } from '@/lib/track'

import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'
import { authCallbackUrlWithNext, authErrorMessage, safeNext } from '@/lib/auth-redirect'
import { loadAccount, onboardingDone } from '@/lib/account'

type Mode = 'login' | 'signup'

// useSearchParams exige une frontière Suspense pour que la page reste pré-rendue
export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}

function AuthForm() {
  const router = useRouter()
  const supabase = useRef(createClient()).current
  // Retour d'un lien de confirmation expiré ou ouvert ailleurs (app/auth/callback)
  const params = useSearchParams()
  const callbackError = authErrorMessage(params.get('error'))
  // Lien d'invitation d'un partenaire : retour au lien après connexion, email invité pré-rempli
  const next = safeNext(params.get('next'))

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setMessage(null)
    setConfirmPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (loginData.user) {
          router.push(next ?? (onboardingDone(await loadAccount(supabase, loginData.user.id)) ? '/app/dashboard' : '/app/onboarding'))
          router.refresh()
        }
      } else {
        // Le lien de confirmation revient sur ce site (et non sur l'adresse réglée dans Supabase, qui peut être périmée)
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: authCallbackUrlWithNext(window.location.origin, next) } })
        if (error) throw error
        track('inscription')

        if (data.session) {
          router.push(next ?? '/app/onboarding')
          router.refresh()
        } else {
          setMessage('Vérifiez votre email pour confirmer votre compte.')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "ev-input"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo /></Link>
        </div>

        {/* Mode toggle */}
        <div className="flex p-1 mb-6" style={{ background: 'var(--raised)', borderRadius: 'var(--radius)' }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-2 text-sm font-medium transition-colors"
              style={{
                background: mode === m ? 'var(--surface)' : 'transparent',
                color: mode === m ? 'var(--ink)' : 'var(--ink-3)',
                border: `1px solid ${mode === m ? 'var(--line)' : 'transparent'}`,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {m === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="ev-label">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@entreprise.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="ev-label">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className={inputClass}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="ev-label">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className={inputClass}
              />
            </div>
          )}

          {callbackError && !error && !message && (
            <div role="alert" className="ev-alert ev-alert--warning">
              {callbackError}
            </div>
          )}
          {error && (
            <div className="ev-alert ev-alert--danger">
              {error}
            </div>
          )}
          {message && (
            <div className="ev-alert ev-alert--ok">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ev-btn ev-btn--primary ev-btn--full ev-btn--lg mt-1"
          >
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
