'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
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
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', loginData.user.id)
            .single()
          router.push(profile?.onboarding_completed ? '/app/dashboard' : '/app/onboarding')
          router.refresh()
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email ?? null,
          })
        }

        if (data.session) {
          router.push('/app/onboarding')
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
