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
          router.push(profile?.onboarding_completed ? '/dashboard' : '/onboarding')
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
          router.push('/onboarding')
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

  const inputClass = "w-full px-3.5 py-2.5 border text-sm outline-none transition-colors rounded-lg"
  const inputStyle = { background: '#fff', borderColor: '#E5E5E3', color: '#1A1A18', border: '1px solid #E5E5E3' }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#FAFAF9' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo /></Link>
        </div>

        {/* Mode toggle */}
        <div className="flex p-1 mb-6" style={{ background: '#F5F5F4', borderRadius: 10 }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-2 text-sm font-medium transition-all"
              style={{
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#1A1A18' : '#9A9A93',
                borderRadius: 8,
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@entreprise.com"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
              style={inputStyle}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                style={inputStyle}
              />
            </div>
          )}

          {error && (
            <div className="text-sm px-3.5 py-3 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {error}
            </div>
          )}
          {message && (
            <div className="text-sm px-3.5 py-3 rounded-lg" style={{ background: '#F0FDF4', color: '#16A34A' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-40 mt-1 rounded-lg"
            style={{ background: '#1A1A18', color: '#fff' }}
          >
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte →'}
          </button>
        </form>
      </div>
    </div>
  )
}
