'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyResult {
  name: string
  siren: string
  siren_formatted: string
  legal_form: string | null
  naf_code: string | null
  year_created: number | null
  address: string
}

interface ScoreData {
  score: number
  grade: string
  details: {
    anciennete: number
    forme_juridique: number
    chiffre_affaires: number
    resultat: number
    effectif: number
    naf: number
    score_partial: boolean
  }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-xs mx-auto mb-8">
      {[1, 2, 3, 4].map((n, i) => (
        <div key={n} className="flex items-center" style={{ flex: i < 3 ? '1' : 'none' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{
              background: step > n ? 'var(--ink)' : step === n ? 'var(--accent)' : 'var(--raised)',
              border: step < n ? '1px solid var(--line)' : 'none',
            }}
          >
            {step > n ? (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span
                className="text-xs font-semibold"
                style={{ color: step === n ? '#fff' : 'var(--ink-3)' }}
              >
                {n}
              </span>
            )}
          </div>
          {i < 3 && (
            <div
              className="flex-1 h-px mx-1 transition-all"
              style={{ background: step > n ? 'var(--accent)' : 'var(--line)' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Country ──────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'FR', flag: '🇫🇷', label: 'France', enabled: true },
  { code: 'BE', flag: '🇧🇪', label: 'Belgique', enabled: false },
  { code: 'DE', flag: '🇩🇪', label: 'Allemagne', enabled: false },
  { code: 'ES', flag: '🇪🇸', label: 'Espagne', enabled: false },
  { code: 'IT', flag: '🇮🇹', label: 'Italie', enabled: false },
]

function Step1Country({ onNext }: { onNext: (country: string) => void }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('FR')
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const country = COUNTRIES.find(c => c.code === selected)!

  return (
    <div>
      <h1
        className="ev-display mb-2"
        style={{ fontSize: 28, color: 'var(--ink)' }}
      >
        Où est établie votre entreprise ?
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
        Everlease opère actuellement en France.
      </p>

      <label className="ev-label">
        Pays d&apos;établissement
      </label>
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="ev-input text-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left',
            cursor: 'pointer',
            borderColor: open ? 'var(--accent)' : 'var(--line-strong)',
          }}
        >
          <span className="flex items-center gap-2">
            <span>{country.flag}</span>
            <span>{country.label}</span>
          </span>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
          >
            <path d="M4 6l4 4 4-4" stroke="var(--ink-3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            className="ev-card absolute left-0 right-0 top-[calc(100%+4px)] overflow-hidden z-50"
          >
            {COUNTRIES.map(c => (
              <button
                key={c.code}
                disabled={!c.enabled}
                onClick={() => { if (c.enabled) { setSelected(c.code); setOpen(false) } }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors"
                style={{
                  background: c.code === selected && c.enabled ? 'var(--accent-soft)' : '#fff',
                  cursor: c.enabled ? 'pointer' : 'default',
                  opacity: c.enabled ? 1 : 0.7,
                }}
              >
                <span className="flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                  <span>{c.flag}</span>
                  <span>{c.label}</span>
                </span>
                {c.code === selected && c.enabled ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3.5 3.5 5.5-6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : !c.enabled ? (
                  <span className="ev-tag">
                    Bientôt disponible
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onNext(selected)}
        className="ev-btn ev-btn--primary ev-btn--lg ev-btn--full mt-8"
      >
        Continuer
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

// ─── Step 2: Company search ───────────────────────────────────────────────────

function Step2Company({
  onBack,
  onNext,
}: {
  onBack: () => void
  onNext: (company: CompanyResult) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompanyResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<CompanyResult | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search-company?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (selected) return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => search(query), 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [query, selected, search])

  function handleSelect(c: CompanyResult) {
    setSelected(c)
    setResults([])
  }

  function handleReset() {
    setSelected(null)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const showDropdown = !selected && results.length > 0

  return (
    <div>
      <h1
        className="ev-display mb-2"
        style={{ fontSize: 28, color: 'var(--ink)' }}
      >
        Trouvez votre entreprise
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
        Entrez votre SIREN ou le nom de votre société.
      </p>

      {selected ? (
        // Confirmation card
        <div className="ev-card p-5 mb-3">
          <div className="flex items-start gap-3 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'var(--ok-soft)', border: '1px solid var(--ok-soft)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="var(--ok)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{selected.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {[selected.siren_formatted, selected.legal_form, selected.year_created && `Créée en ${selected.year_created}`]
                  .filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          {selected.address && (
            <div className="flex items-start gap-2 pt-3">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                <path d="M7 1C4.79 1 3 2.79 3 5c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4Z" stroke="var(--ink-3)" strokeWidth="1.2" />
                <circle cx="7" cy="5" r="1.5" stroke="var(--ink-3)" strokeWidth="1.2" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{selected.address}</p>
            </div>
          )}
        </div>
      ) : (
        // Search input
        <div className="relative mb-4">
          <div
            className="ev-input"
            style={{ display: 'flex', alignItems: 'center', gap: 12, borderColor: 'var(--accent)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="7" cy="7" r="5.5" stroke="var(--ink-3)" strokeWidth="1.3" />
              <path d="M11 11l3 3" stroke="var(--ink-3)" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Nom de société ou SIREN"
              className="flex-1 text-sm outline-none"
              style={{ background: 'transparent', color: 'var(--ink)' }}
            />
            {searching && (
              <div className="w-4 h-4 rounded-full border-2 border-t-[var(--accent)] animate-spin shrink-0" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--accent)' }} />
            )}
          </div>

          {showDropdown && (
            <div
              className="ev-card absolute left-0 right-0 top-[calc(100%+4px)] overflow-hidden z-50"
            >
              {results.map((c, i) => (
                <button
                  key={c.siren}
                  onClick={() => handleSelect(c)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[var(--raised)]"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid var(--line)' : 'none' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{c.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                      {[c.legal_form, c.address.split(',').slice(-2).join(',').trim(), c.year_created && `Créée en ${c.year_created}`]
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span
                    className="ev-mono text-xs shrink-0 ml-4"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    {c.siren_formatted}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <button
          onClick={handleReset}
          className="text-sm transition-opacity hover:opacity-70 mb-6 block"
          style={{ color: 'var(--ink-3)' }}
        >
          Ce n&apos;est pas mon entreprise ?
        </button>
      )}

      <button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="ev-btn ev-btn--primary ev-btn--lg ev-btn--full"
      >
        Confirmer cette entreprise
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

// ─── Step 3: Contact & Role ───────────────────────────────────────────────────

const ROLES = [
  { key: 'dirigeant', label: 'Dirigeant / Gérant' },
  { key: 'daf', label: 'Directeur Financier (DAF)' },
  { key: 'dg', label: 'Directeur Général' },
  { key: 'office_manager', label: 'Office Manager' },
]

function Step3Contact({
  userEmail,
  onBack,
  onNext,
}: {
  userEmail: string
  onBack: () => void
  onNext: (data: { first_name: string; last_name: string; phone: string; role: string }) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('dirigeant')

  const canContinue = firstName.trim() && lastName.trim() && phone.trim()

  return (
    <div>
      <h1
        className="ev-display mb-2"
        style={{ fontSize: 28, color: 'var(--ink)' }}
      >
        Qui êtes-vous ?
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
        Ces informations permettent au financeur d&apos;identifier le signataire du contrat.
      </p>

      <div className="flex flex-col gap-4">
        {/* First name + Last name */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="ev-label">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Camille"
              className="ev-input"
            />
          </div>
          <div className="flex-1">
            <label className="ev-label">
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Verdier"
              className="ev-input"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="ev-label">
            Téléphone direct
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="06 00 00 00 00"
            className="ev-input"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="ev-label">
            Email professionnel
          </label>
          <div
            className="ev-input"
            style={{ display: 'flex', alignItems: 'center', background: 'var(--raised)' }}
          >
            <span className="flex-1 text-sm" style={{ color: 'var(--ink-3)' }}>{userEmail}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="5" width="10" height="8" rx="1.5" stroke="var(--line-strong)" strokeWidth="1.2" />
              <path d="M5 5V3.5a2 2 0 114 0V5" stroke="var(--line-strong)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Role selector */}
        <div>
          <label className="ev-label">
            Votre rôle dans l&apos;entreprise
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`ev-card ${role === r.key ? 'ev-card--selected' : 'ev-card--interactive'} flex items-center gap-2.5 px-3.5 py-3 text-sm text-left`}
                style={{
                  background: role === r.key ? 'var(--accent-soft)' : undefined,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: role === r.key ? 'var(--accent)' : 'var(--line-strong)' }}
                >
                  {role === r.key && (
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                  )}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => canContinue && onNext({ first_name: firstName, last_name: lastName, phone, role })}
        disabled={!canContinue}
        className="ev-btn ev-btn--primary ev-btn--lg ev-btn--full mt-6"
      >
        Continuer
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

// ─── Step 4: Score Everlease ──────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: 'var(--ok)',
  'B+': 'var(--ok)',
  B: 'var(--warning)',
  'C+': 'var(--warning)',
  C: 'var(--danger)',
}

const GRADE_POSITION: Record<string, number> = {
  C: 10,
  'C+': 30,
  B: 50,
  'B+': 70,
  A: 90,
}

function ScoreCircle({ grade, score }: { grade: string; score: number }) {
  const color = GRADE_COLORS[grade] ?? 'var(--ink-3)'
  return (
    <div className="flex flex-col items-center mb-4">
      <div
        className="w-36 h-36 rounded-full flex items-center justify-center mb-3"
        style={{ border: '3px solid var(--line)', background: 'var(--surface)' }}
      >
        <span className="ev-display" style={{ fontSize: 48, color, lineHeight: 1 }}>
          {grade}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
        Profil Everlease · établi à partir de vos données légales, indicatif
      </p>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const pos = Math.max(2, Math.min(98, score))
  return (
    <div className="mt-4 mb-1">
      <div className="relative h-2 rounded-full overflow-visible" style={{ background: 'var(--line)' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${pos}%`, background: 'var(--accent)' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all"
          style={{
            left: `${pos}%`,
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderColor: 'var(--ink)',
          }}
        />
      </div>
      <div className="flex justify-between mt-3">
        {['D', 'C', 'B', 'A', 'A+'].map(g => (
          <span key={g} className="text-xs" style={{ color: 'var(--ink-3)' }}>{g}</span>
        ))}
      </div>
    </div>
  )
}

function UnlockItem({ label, locked, badge }: { label: string; locked?: boolean; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: locked ? 'var(--raised)' : 'var(--ok-soft)',
            border: locked ? '1px solid var(--line)' : '1px solid var(--ok-soft)',
          }}
        >
          {!locked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5 4-4" stroke="var(--ok)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-sm" style={{ color: locked ? 'var(--ink-3)' : 'var(--ink)' }}>{label}</span>
      </div>
      {badge && (
        <span className="ev-tag ml-2">
          {badge}
        </span>
      )}
    </div>
  )
}

function Step4Score({
  onNext,
  onSkip,
  alreadyCompleted,
}: {
  onNext: () => void
  onSkip: () => void
  alreadyCompleted?: boolean
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState<ScoreData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Bilan upload state
  const [uploading, setUploading] = useState(false)
  const [bilansUploaded, setBilansUploaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function compute() {
      try {
        const res = await fetch('/api/score-seela', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setScore(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de calcul')
      } finally {
        setLoading(false)
      }
    }
    compute()
  }, [])

  async function handleBilanUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') continue
        // Nom assaini : Supabase refuse les accents, et `#` / espaces cassent l'URL publique
        const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-')
        const path = `${user.id}/bilans/${Date.now()}-${safeName}`
        const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file)
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

        // Analyze bilan
        try {
          const analyzeRes = await fetch('/api/analyze-bilan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentUrl: publicUrl, mimeType: 'application/pdf' }),
          })
          if (analyzeRes.ok) {
            const financialData = await analyzeRes.json()
            // Recompute score with extracted data
            const scoreRes = await fetch('/api/score-seela', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ financialOverride: financialData }),
            })
            if (scoreRes.ok) {
              const newScore = await scoreRes.json()
              setScore(newScore)
            }
          }
        } catch {
          // Analysis failed — score stays the same
        }
      }

      await supabase.from('profiles').update({ financial_docs_uploaded: true }).eq('id', user.id)
      setBilansUploaded(true)
    } catch (e) {
      console.error('Bilan upload error:', e)
    } finally {
      setUploading(false)
    }
  }

  const grade = score?.grade ?? 'B'
  const scoreVal = score?.score ?? 0
  const gradeColor = GRADE_COLORS[grade] ?? 'var(--ink-3)'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-[var(--ink)] animate-spin" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--ink)' }} />
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Calcul de votre score Everlease…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{error}</p>
        <button onClick={onSkip} className="text-sm underline" style={{ color: 'var(--ink-3)' }}>
          Continuer sans score
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1
        className="ev-display mb-1"
        style={{ fontSize: 26, color: 'var(--ink)' }}
      >
        Votre profil Everlease
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
        Basé sur les données officielles de votre entreprise.
      </p>

      {/* Score card */}
      <div className="ev-card p-6 mb-5">
        <ScoreCircle grade={grade} score={scoreVal} />
        <ScoreBar score={scoreVal} />
      </div>

      {/* What your score unlocks */}
      <div className="mb-5">
        <p className="ev-kicker mb-3">
          Ce que votre profil permet
        </p>
        <div className="ev-card overflow-hidden">
          <div className="px-4 divide-y divide-[var(--line)]">
            <UnlockItem label="Dossier pré-rempli à partir de vos données légales" />
            <UnlockItem label="Dossier présenté à des financeurs adaptés à votre profil" />
            <UnlockItem label="Bilans joints au dossier pour le financeur" locked={!bilansUploaded} badge={bilansUploaded ? undefined : 'Bilans à importer'} />
          </div>
        </div>
      </div>

      {/* Upload bilans */}
      {!bilansUploaded && (
        <div className="ev-card ev-card--dashed flex items-start gap-4 p-4 mb-6">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'var(--raised)', border: '1px solid var(--line)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M10 2v4h4" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm mb-2" style={{ color: 'var(--ink)', lineHeight: 1.5 }}>
              Uploadez vos <strong>2 derniers bilans</strong> pour compléter votre dossier avant sa présentation aux financeurs
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={e => handleBilanUpload(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="ev-btn ev-btn--ghost ev-btn--sm"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-t-[var(--ink)] animate-spin" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--ink)' }} />
                  Import en cours…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M7 10V3M4 6l3-3 3 3M1 11v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Importer mes bilans
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {bilansUploaded && (
        <div className="ev-alert ev-alert--ok flex items-center gap-2 mb-6">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 4" stroke="var(--ok)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--ok)' }}>
            Bilans importés — dossier mis à jour
          </p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onNext}
        className="ev-btn ev-btn--primary ev-btn--lg ev-btn--full mb-3"
      >
        {alreadyCompleted ? 'Retour au tableau de bord' : 'Accéder à Everlease'}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!alreadyCompleted && (
        <button
          onClick={onSkip}
          className="w-full text-center text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--ink-3)' }}
        >
          Je complèterai mon profil plus tard
        </button>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [initialized, setInitialized] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      setUserEmail(user.email ?? '')
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      if (profile?.onboarding_completed) {
        // Allow revisiting step 4 for bilan upload
        setAlreadyCompleted(true)
        setStep(4)
      }

      setInitialized(true)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Step handlers ──

  async function handleStep1(country: string) {
    await supabase.from('profiles').upsert({ id: userId, country })
    setStep(2)
  }

  async function handleStep2(company: CompanyResult) {
    await supabase.from('profiles').upsert({
      id: userId,
      company_name: company.name,
      siren: company.siren,
      legal_form: company.legal_form,
      naf_code: company.naf_code,
      date_creation: company.year_created,
      supplier_address: company.address,
    })
    setStep(3)
  }

  async function handleStep3(data: { first_name: string; last_name: string; phone: string; role: string }) {
    await supabase.from('profiles').upsert({ id: userId, ...data })
    setStep(4)
  }

  async function handleComplete() {
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId)
    router.push('/app/dashboard')
  }

  async function handleSkip() {
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId)
    router.push('/app/dashboard')
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-[var(--ink)] animate-spin" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--ink)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
      {/* Header */}
      <div className="px-6 py-5 shrink-0">
        <Link href="/" style={{ display: 'inline-block' }}>
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="23" fill="var(--ink)" />
              <path transform="translate(13 9) scale(0.61)" d="M16 100 A44 44 0 0 1 104 100 L67.86 100 L78.29 86.72 Q82 82 77.15 78.47 L64.85 69.53 Q60 66 55.15 69.53 L42.85 78.47 Q38 82 41.71 86.72 L52.14 100 Z" fill="var(--paper)" />
            </svg>
            <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.03em' }}>everlease</span>
          </div>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[480px]">
          {/* Back button */}
          {step > 1 && !alreadyCompleted && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3 | 4)}
              className="ev-btn ev-btn--ghost ev-btn--sm mb-6"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Retour
            </button>
          )}

          {/* Step indicator */}
          <StepIndicator step={step} />

          {/* Step content */}
          {step === 1 && <Step1Country onNext={handleStep1} />}
          {step === 2 && <Step2Company onBack={() => setStep(1)} onNext={handleStep2} />}
          {step === 3 && <Step3Contact userEmail={userEmail} onBack={() => setStep(2)} onNext={handleStep3} />}
          {step === 4 && (
            <Step4Score
              onNext={handleComplete}
              onSkip={handleSkip}
              alreadyCompleted={alreadyCompleted}
            />
          )}
        </div>
      </div>
    </div>
  )
}
