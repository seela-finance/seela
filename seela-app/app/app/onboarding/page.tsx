'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'
import { loadAccount, onboardingDone } from '@/lib/account'
import { adoptInvitedCompany, completeOnboarding, invitedCompany, registerSignupLead, saveOnboardingCompany, saveOnboardingContact, type InvitedCompany } from './actions'

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

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-xs mx-auto mb-8">
      {[1, 2, 3].map((n, i) => (
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
        everlease opère actuellement en France.
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
  locked,
}: {
  onBack: () => void
  onNext: (company: CompanyResult) => void
  /** Client invité par un distributeur : la société du dossier, non modifiable */
  locked?: InvitedCompany | null
}) {
  if (locked) return <Step2Locked company={locked} onNext={onNext} />
  return <Step2Search onBack={onBack} onNext={onNext} />
}

function Step2Locked({ company, onNext }: { company: InvitedCompany; onNext: (company: CompanyResult) => void }) {
  const siren = company.siren ?? ''
  const result: CompanyResult = {
    name: company.name, siren, siren_formatted: siren ? `${siren.slice(0, 3)} ${siren.slice(3, 6)} ${siren.slice(6)}` : '',
    legal_form: company.legal_form, naf_code: null, year_created: company.creation_year, address: company.address ?? '',
  }
  return (
    <div>
      <h1 className="ev-display mb-2" style={{ fontSize: 28, color: 'var(--ink)' }}>Votre entreprise</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
        Votre fournisseur a préparé ce dossier pour cette société. Si ce n’est pas la bonne, écrivez-nous à contact@everlease.fr.
      </p>
      <div className="ev-card p-5 mb-6">
        <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{company.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
          {[result.siren_formatted && `SIREN ${result.siren_formatted}`, company.legal_form, company.creation_year && `Créée en ${company.creation_year}`].filter(Boolean).join(' · ')}
        </p>
        {company.address && <p className="text-sm mt-3" style={{ color: 'var(--ink-3)' }}>{company.address}</p>}
      </div>
      <button onClick={() => onNext(result)} className="ev-btn ev-btn--primary ev-btn--lg ev-btn--full">
        Continuer
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

function Step2Search({
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

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [initialized, setInitialized] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [userEmail, setUserEmail] = useState('')
  const [country, setCountry] = useState('FR')
  const [saveError, setSaveError] = useState<string | null>(null)
  // Client invité par un distributeur : la société est celle du dossier, verrouillée à l'étape 2
  const [locked, setLocked] = useState<InvitedCompany | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      setUserEmail(user.email ?? '')

      void registerSignupLead()
      setLocked(await invitedCompany())
      // Inscription déjà terminée : les pièces et le score vivent dans « Mon compte »
      if (onboardingDone(await loadAccount(supabase, user.id))) { router.replace('/app/compte'); return }

      setInitialized(true)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Step handlers ──

  async function handleStep1(value: string) {
    setCountry(value)
    setStep(2)
  }

  async function handleStep2(company: CompanyResult) {
    const res = locked ? await adoptInvitedCompany() : await saveOnboardingCompany({ country, name: company.name, siren: company.siren, legal_form: company.legal_form, naf_code: company.naf_code, year_created: company.year_created, address: company.address })
    if (!res.ok) { setSaveError(res.message); return }
    setSaveError(null)
    setStep(3)
  }

  async function handleStep3(data: { first_name: string; last_name: string; phone: string; role: string }) {
    const res = await saveOnboardingContact(data)
    if (!res.ok) { setSaveError(res.message); return }
    setSaveError(null)
    // Score everlease calculé depuis les données légales, sans bloquer l'arrivée sur le tableau de bord
    fetch('/api/score-seela', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => null)
    const done = await completeOnboarding()
    if (!done.ok) { setSaveError(done.message); return }
    router.push('/app/dashboard')
    router.refresh()
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
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
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
          {saveError && <p className="ev-alert ev-alert--danger mb-4" role="alert">{saveError}</p>}

          {/* Step content */}
          {step === 1 && <Step1Country onNext={handleStep1} />}
          {step === 2 && <Step2Company onBack={() => setStep(1)} onNext={handleStep2} locked={locked} />}
          {step === 3 && <Step3Contact userEmail={userEmail} onBack={() => setStep(2)} onNext={handleStep3} />}
        </div>
      </div>
    </div>
  )
}
