'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
              background: step >= n ? '#1A1A18' : '#F5F5F4',
              border: step < n ? '1px solid #E5E5E3' : 'none',
            }}
          >
            {step > n ? (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span
                className="text-xs font-semibold"
                style={{ color: step === n ? '#FAFAF9' : '#9A9A93' }}
              >
                {n}
              </span>
            )}
          </div>
          {i < 3 && (
            <div
              className="flex-1 h-px mx-1 transition-all"
              style={{ background: step > n ? '#1A1A18' : '#E5E5E3' }}
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
        className="font-semibold mb-2"
        style={{ fontSize: 28, color: '#1A1A18', letterSpacing: '-0.6px', lineHeight: 1.2 }}
      >
        Où est établie votre entreprise ?
      </h1>
      <p className="text-sm mb-8" style={{ color: '#9A9A93' }}>
        Seela opère actuellement en France.
      </p>

      <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A18' }}>
        Pays d&apos;établissement
      </label>
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all"
          style={{
            background: '#fff',
            borderColor: open ? '#1A1A18' : '#E5E5E3',
            color: '#1A1A18',
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
            <path d="M4 6l4 4 4-4" stroke="#9A9A93" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+4px)] rounded-xl border overflow-hidden z-50"
            style={{ background: '#fff', borderColor: '#E5E5E3', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          >
            {COUNTRIES.map(c => (
              <button
                key={c.code}
                disabled={!c.enabled}
                onClick={() => { if (c.enabled) { setSelected(c.code); setOpen(false) } }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors"
                style={{
                  background: c.code === selected && c.enabled ? '#F5F5FF' : '#fff',
                  cursor: c.enabled ? 'pointer' : 'default',
                  opacity: c.enabled ? 1 : 0.7,
                }}
              >
                <span className="flex items-center gap-2" style={{ color: '#1A1A18' }}>
                  <span>{c.flag}</span>
                  <span>{c.label}</span>
                </span>
                {c.code === selected && c.enabled ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3.5 3.5 5.5-6" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : !c.enabled ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#F5F5F4', color: '#9A9A93' }}
                  >
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
        className="w-full mt-8 py-3.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
        style={{ background: '#1A1A18', color: '#fff' }}
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
        className="font-semibold mb-2"
        style={{ fontSize: 28, color: '#1A1A18', letterSpacing: '-0.6px', lineHeight: 1.2 }}
      >
        Trouvez votre entreprise
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9A9A93' }}>
        Entrez votre SIREN ou le nom de votre société.
      </p>

      {selected ? (
        // Confirmation card
        <div
          className="rounded-xl border p-5 mb-3"
          style={{ background: '#fff', borderColor: '#E5E5E3' }}
        >
          <div className="flex items-start gap-3 pb-4 border-b" style={{ borderColor: '#F5F5F4' }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: '#1A1A18' }}>{selected.name}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                {[selected.siren_formatted, selected.legal_form, selected.year_created && `Créée en ${selected.year_created}`]
                  .filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          {selected.address && (
            <div className="flex items-start gap-2 pt-3">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                <path d="M7 1C4.79 1 3 2.79 3 5c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4Z" stroke="#9A9A93" strokeWidth="1.2" />
                <circle cx="7" cy="5" r="1.5" stroke="#9A9A93" strokeWidth="1.2" />
              </svg>
              <p className="text-sm" style={{ color: '#9A9A93' }}>{selected.address}</p>
            </div>
          )}
        </div>
      ) : (
        // Search input
        <div className="relative mb-4">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
            style={{ background: '#fff', borderColor: '#4F46E5' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="7" cy="7" r="5.5" stroke="#9A9A93" strokeWidth="1.3" />
              <path d="M11 11l3 3" stroke="#9A9A93" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Nom de société ou SIREN"
              className="flex-1 text-sm outline-none"
              style={{ background: 'transparent', color: '#1A1A18' }}
            />
            {searching && (
              <div className="w-4 h-4 rounded-full border-2 border-t-[#4F46E5] animate-spin shrink-0" style={{ borderColor: '#E5E5E3', borderTopColor: '#4F46E5' }} />
            )}
          </div>

          {showDropdown && (
            <div
              className="absolute left-0 right-0 top-[calc(100%+4px)] rounded-xl border overflow-hidden z-50"
              style={{ background: '#fff', borderColor: '#E5E5E3', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            >
              {results.map((c, i) => (
                <button
                  key={c.siren}
                  onClick={() => handleSelect(c)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[#FAFAF9]"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid #F5F5F4' : 'none' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>{c.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9A9A93' }}>
                      {[c.legal_form, c.address.split(',').slice(-2).join(',').trim(), c.year_created && `Créée en ${c.year_created}`]
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span
                    className="text-xs font-mono shrink-0 ml-4"
                    style={{ color: '#9A9A93', letterSpacing: '0.05em' }}
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
          style={{ color: '#9A9A93' }}
        >
          Ce n&apos;est pas mon entreprise ?
        </button>
      )}

      <button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="w-full py-3.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
        style={{
          background: selected ? '#1A1A18' : '#F5F5F4',
          color: selected ? '#fff' : '#9A9A93',
          cursor: selected ? 'pointer' : 'default',
        }}
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

  const inputStyle = {
    background: '#fff',
    border: '1px solid #E5E5E3',
    borderRadius: 10,
    color: '#1A1A18',
    fontSize: 14,
  }

  const canContinue = firstName.trim() && lastName.trim() && phone.trim()

  return (
    <div>
      <h1
        className="font-semibold mb-2"
        style={{ fontSize: 28, color: '#1A1A18', letterSpacing: '-0.6px', lineHeight: 1.2 }}
      >
        Qui êtes-vous ?
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9A9A93', lineHeight: 1.6 }}>
        Ces informations permettent au leaser d&apos;identifier le signataire du contrat.
      </p>

      <div className="flex flex-col gap-4">
        {/* First name + Last name */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Camille"
              className="w-full px-3.5 py-2.5 outline-none text-sm"
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Verdier"
              className="w-full px-3.5 py-2.5 outline-none text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Téléphone direct
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="06 00 00 00 00"
            className="w-full px-3.5 py-2.5 outline-none text-sm"
            style={inputStyle}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Email professionnel
          </label>
          <div
            className="flex items-center px-3.5 py-2.5"
            style={{ ...inputStyle, background: '#FAFAF9' }}
          >
            <span className="flex-1 text-sm" style={{ color: '#9A9A93' }}>{userEmail}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="5" width="10" height="8" rx="1.5" stroke="#D1D1CE" strokeWidth="1.2" />
              <path d="M5 5V3.5a2 2 0 114 0V5" stroke="#D1D1CE" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Role selector */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Votre rôle dans l&apos;entreprise
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-sm transition-all text-left"
                style={{
                  background: role === r.key ? '#F0F0FF' : '#fff',
                  borderColor: role === r.key ? '#4F46E5' : '#E5E5E3',
                  color: '#1A1A18',
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: role === r.key ? '#4F46E5' : '#D1D1CE' }}
                >
                  {role === r.key && (
                    <div className="w-2 h-2 rounded-full" style={{ background: '#4F46E5' }} />
                  )}
                </div>
                <span className="text-sm font-medium" style={{ color: '#1A1A18' }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => canContinue && onNext({ first_name: firstName, last_name: lastName, phone, role })}
        disabled={!canContinue}
        className="w-full mt-6 py-3.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: '#1A1A18', color: '#fff' }}
      >
        Continuer
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

// ─── Step 4: Score Seela ──────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: '#16A34A',
  'B+': '#65A30D',
  B: '#CA8A04',
  'C+': '#EA580C',
  C: '#DC2626',
}

const GRADE_POSITION: Record<string, number> = {
  C: 10,
  'C+': 30,
  B: 50,
  'B+': 70,
  A: 90,
}

function ScoreCircle({ grade, score }: { grade: string; score: number }) {
  const color = GRADE_COLORS[grade] ?? '#9A9A93'
  return (
    <div className="flex flex-col items-center mb-4">
      <div
        className="w-36 h-36 rounded-full flex items-center justify-center mb-3"
        style={{ border: `3px solid ${color}`, background: '#fff' }}
      >
        <span style={{ fontSize: 48, fontWeight: 700, color, letterSpacing: '-1px', lineHeight: 1 }}>
          {grade}
        </span>
      </div>
      <p className="text-xs" style={{ color: '#9A9A93' }}>
        Score Seela · Basé sur vos données légales
      </p>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const pos = Math.max(2, Math.min(98, score))
  return (
    <div className="mt-4 mb-1">
      <div className="relative h-2 rounded-full overflow-visible" style={{
        background: 'linear-gradient(to right, #DC2626 0%, #EF4444 15%, #F97316 30%, #EAB308 50%, #84CC16 68%, #22C55E 82%, #16A34A 100%)'
      }}>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all"
          style={{
            left: `${pos}%`,
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderColor: '#1A1A18',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        />
      </div>
      <div className="flex justify-between mt-3">
        {['D', 'C', 'B', 'A', 'A+'].map(g => (
          <span key={g} className="text-xs" style={{ color: '#9A9A93' }}>{g}</span>
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
            background: locked ? '#F5F5F4' : '#F0FDF4',
            border: locked ? '1px solid #E5E5E3' : '1px solid #BBF7D0',
          }}
        >
          {!locked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5 4-4" stroke="#16A34A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-sm" style={{ color: locked ? '#9A9A93' : '#1A1A18' }}>{label}</span>
      </div>
      {badge && (
        <span
          className="text-xs px-2 py-0.5 rounded-full ml-2"
          style={{ background: '#F5F5F4', color: '#9A9A93' }}
        >
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
        const path = `${user.id}/bilans/${Date.now()}-${file.name}`
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
  const gradeColor = GRADE_COLORS[grade] ?? '#9A9A93'
  const isHighGrade = grade === 'A' || grade === 'B+'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-[#1A1A18] animate-spin" style={{ borderColor: '#E5E5E3', borderTopColor: '#1A1A18' }} />
        <p className="text-sm" style={{ color: '#9A9A93' }}>Calcul de votre score Seela…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm mb-4" style={{ color: '#DC2626' }}>{error}</p>
        <button onClick={onSkip} className="text-sm underline" style={{ color: '#9A9A93' }}>
          Continuer sans score
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1
        className="font-semibold mb-1"
        style={{ fontSize: 26, color: '#1A1A18', letterSpacing: '-0.5px', lineHeight: 1.2 }}
      >
        Votre profil Seela
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9A9A93' }}>
        Basé sur les données officielles de votre entreprise.
      </p>

      {/* Score card */}
      <div className="rounded-2xl border p-6 mb-5" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
        <ScoreCircle grade={grade} score={scoreVal} />
        <ScoreBar score={scoreVal} />
      </div>

      {/* What your score unlocks */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9A9A93', letterSpacing: '0.08em' }}>
          Ce que votre score débloque
        </p>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
          <div className="px-4 divide-y" style={{ borderColor: '#F5F5F4' }}>
            <UnlockItem label="Accès à 3 leasers partenaires" />
            <UnlockItem label={isHighGrade ? 'Financement jusqu\'à 150 000 €' : 'Financement jusqu\'à 50 000 €'} />
            {!isHighGrade && (
              <UnlockItem label="Accès complet" locked badge="Score B+ requis" />
            )}
            {isHighGrade && (
              <>
                <UnlockItem label="Accès à 8 leasers" locked badge="Score A requis" />
                <UnlockItem label="Financement jusqu'à 200 000 €" locked badge="Score A requis" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload bilans */}
      {!bilansUploaded && (
        <div
          className="flex items-start gap-4 p-4 rounded-xl mb-6"
          style={{ background: '#F5F5F4', border: '1px solid #E5E5E3' }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#fff', border: '1px solid #E5E5E3' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="#9A9A93" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M10 2v4h4" stroke="#9A9A93" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm mb-2" style={{ color: '#1A1A18', lineHeight: 1.5 }}>
              Uploadez vos <strong>2 derniers bilans</strong> pour améliorer votre score et accéder à plus d&apos;offres
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
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all hover:border-[#1A1A18] disabled:opacity-50"
              style={{ background: '#fff', color: '#1A1A18', borderColor: '#E5E5E3', borderRadius: 8 }}
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-t-[#1A1A18] animate-spin" style={{ borderColor: '#E5E5E3', borderTopColor: '#1A1A18' }} />
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
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6"
          style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 4" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-medium" style={{ color: '#15803D' }}>
            Bilans importés — score mis à jour
          </p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2 mb-3"
        style={{ background: '#1A1A18', color: '#fff' }}
      >
        {alreadyCompleted ? 'Retour au tableau de bord' : 'Accéder à Seela'}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!alreadyCompleted && (
        <button
          onClick={onSkip}
          className="w-full text-center text-sm transition-opacity hover:opacity-70"
          style={{ color: '#9A9A93' }}
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF9' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-[#1A1A18] animate-spin" style={{ borderColor: '#E5E5E3', borderTopColor: '#1A1A18' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF9' }}>
      {/* Header */}
      <div className="px-6 py-5 shrink-0">
        <a href="/" style={{ display: 'inline-block' }}>
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="23" fill="#1A1A18" />
              <path d="M50 14 L65 35 L86 50 L65 65 L50 86 L35 65 L14 50 L35 35 Z" fill="#FAFAF9" />
            </svg>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#1A1A18', letterSpacing: '-0.5px' }}>seela</span>
          </div>
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[480px]">
          {/* Back button */}
          {step > 1 && !alreadyCompleted && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3 | 4)}
              className="flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
              style={{ color: '#9A9A93' }}
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
