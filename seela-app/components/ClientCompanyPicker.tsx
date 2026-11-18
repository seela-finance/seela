'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type PickedCompany = { name: string; siren: string; siren_formatted: string; legal_form: string | null; address: string; year_created: number | null }

type Suggestion = { siren: string | null; name: string | null } | null

/**
 * Parcours distributeur, étape « Votre client » : recherche de la société cliente au registre (nom ou SIREN),
 * comme à l'onboarding. `suggestion` vient du devis lu par l'IA : un SIREN connu est sélectionné d'office,
 * un nom seul lance la recherche. `excludeSiren` (la société du partenaire) n'est jamais proposé.
 */
export default function ClientCompanyPicker({
  value, onChange, suggestion, excludeSiren,
}: {
  value: PickedCompany | null
  onChange: (company: PickedCompany | null) => void
  suggestion?: Suggestion
  excludeSiren?: string | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PickedCompany[]>([])
  const [searching, setSearching] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggested = useRef(false)

  const search = useCallback(async (q: string): Promise<PickedCompany[]> => {
    if (q.trim().length < 2) return []
    setSearching(true)
    try {
      const res = await fetch(`/api/search-company?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      return ((data.results ?? []) as PickedCompany[]).filter(c => c.siren !== excludeSiren)
    } catch {
      return []
    } finally {
      setSearching(false)
    }
  }, [excludeSiren])

  // Pré-remplissage depuis le devis, une seule fois : le drapeau est posé quand la suggestion est appliquée,
  // pas au départ (en développement, React lance l'effet deux fois et annule le premier passage)
  useEffect(() => {
    if (suggested.current || value || !suggestion) return
    const siren = suggestion.siren && suggestion.siren !== excludeSiren ? suggestion.siren : null
    const name = suggestion.name
    if (!siren && !name) { suggested.current = true; return }
    let cancelled = false
    ;(async () => {
      if (siren) {
        const found = (await search(siren)).find(c => c.siren === siren)
        if (cancelled) return
        if (found) {
          suggested.current = true
          onChange(found)
          setHint('Société lue sur le devis. Vérifiez qu’il s’agit bien de votre client.')
          return
        }
      }
      if (name) {
        const list = await search(name)
        if (cancelled) return
        suggested.current = true
        setQuery(name)
        setResults(list)
        setHint(list.length ? 'Sociétés trouvées d’après le nom lu sur le devis : choisissez la bonne.' : 'Le nom lu sur le devis n’a pas été trouvé au registre : cherchez votre client.')
      } else {
        suggested.current = true
      }
    })()
    return () => { cancelled = true }
  }, [suggestion, excludeSiren, value, onChange, search])

  // Recherche au fil de la saisie
  useEffect(() => {
    if (value) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => setResults(await search(query)), 350)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [query, value, search])

  function reset() {
    onChange(null)
    setQuery('')
    setResults([])
    setHint(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (value) {
    return (
      <div className="ev-card ev-card--paper p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{value.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
              <span className="ev-mono">SIREN {value.siren_formatted}</span>
              {[value.legal_form, value.year_created && `créée en ${value.year_created}`].filter(Boolean).map(v => ` · ${v}`).join('')}
            </p>
            {value.address && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>{value.address}</p>}
          </div>
          <button type="button" onClick={reset} className="text-xs font-medium underline shrink-0" style={{ color: 'var(--ink-2)' }}>Changer</button>
        </div>
        {hint && <p className="text-xs mt-2" style={{ color: 'var(--accent-ink)' }}>{hint}</p>}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="ev-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" stroke="var(--ink-3)" strokeWidth="1.3" />
          <path d="M11 11l3 3" stroke="var(--ink-3)" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id="client-company"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nom de la société ou SIREN"
          autoComplete="off"
          className="flex-1 text-sm outline-none min-w-0"
          style={{ background: 'transparent', color: 'var(--ink)' }}
        />
        {searching && <div className="w-4 h-4 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--accent)' }} />}
      </div>
      {hint && <p className="text-xs mt-1.5" style={{ color: 'var(--ink-3)' }}>{hint}</p>}
      {results.length > 0 && (
        <ul className="ev-card absolute left-0 right-0 top-[calc(100%+4px)] overflow-hidden z-50 divide-y divide-[var(--line)]" role="listbox">
          {results.map(c => (
            <li key={c.siren}>
              <button
                type="button"
                onClick={() => { onChange(c); setResults([]); setHint(null) }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--raised)]"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{c.name}</span>
                  <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>
                    {[c.legal_form, c.address.split(',').slice(-2).join(',').trim()].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="ev-mono text-xs shrink-0" style={{ color: 'var(--ink-3)' }}>{c.siren_formatted}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
