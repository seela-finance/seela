'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopActions from '@/components/TopActions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  description: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  category?: string
  selected?: boolean
}

interface DocumentMeta {
  supplier_name: string | null
  supplier_address: string | null
  supplier_siren: string | null
  document_number: string | null
  document_date: string | null
}

type Duration = 24 | 36 | 48 | 60
type Periodicite = 'mensuelle' | 'trimestrielle' | 'annuelle'

// ─── Constants ───────────────────────────────────────────────────────────────

const COEFFICIENTS: Record<Duration, number> = { 24: 0.048, 36: 0.034, 48: 0.027, 60: 0.023 }


const STEP_LABELS = [
  'Document',
  'Équipements',
  'Configuration',
  'Confirmation',
]

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'Informatique': { bg: '#DBEAFE', color: '#1E40AF' },
  'Mobilier': { bg: '#FEF3C7', color: '#92400E' },
  'Véhicule': { bg: '#D1FAE5', color: '#065F46' },
  'Médical': { bg: '#EDE9FE', color: '#5B21B6' },
  'Industrie': { bg: '#FFEDD5', color: '#9A3412' },
  'Téléphonie': { bg: '#CFFAFE', color: '#164E63' },
  'Audiovisuel': { bg: '#FCE7F3', color: '#9D174D' },
  'Autre': { bg: '#F0F0EE', color: '#9A9A93' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function genId() {
  return Math.random().toString(36).slice(2)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-10">
      <div className="relative flex items-start justify-between">
        {/* Background line */}
        <div className="absolute left-3.5 right-3.5 top-3.5 h-px" style={{ background: '#E5E5E3', zIndex: 0 }} />
        {/* Progress line */}
        <div
          className="absolute top-3.5 h-px transition-all duration-500"
          style={{
            background: '#1A1A18',
            left: '14px',
            width: `calc(${((step - 1) / (total - 1)) * 100}% - 28px * ${(step - 1) / (total - 1)})`,
            zIndex: 1,
          }}
        />
        {STEP_LABELS.map((label, i) => {
          const done = i + 1 < step
          const active = i + 1 === step
          return (
            <div key={i} className="relative flex flex-col items-center gap-2" style={{ zIndex: 2, flex: 1 }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                style={{
                  background: done || active ? '#1A1A18' : '#F5F5F4',
                  color: done || active ? '#FAFAF9' : '#9A9A93',
                  border: !done && !active ? '1px solid #E5E5E3' : 'none',
                }}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i + 1}
              </div>
              <span
                className="text-xs hidden sm:block text-center"
                style={{ color: active ? '#1A1A18' : '#9A9A93', fontWeight: active ? 500 : 400 }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Continuer',
  loading = false,
  disabled = false,
  hideBack = false,
}: {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  loading?: boolean
  disabled?: boolean
  hideBack?: boolean
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: '#E5E5E2' }}>
      {!hideBack && onBack ? (
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors hover:text-[#1A1A18]" style={{ color: '#9A9A93' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>
      ) : <div />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={disabled || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: '#4F46E5', color: '#fff', borderRadius: 8 }}
        >
          {loading ? 'Chargement…' : nextLabel}
          {!loading && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function Step1Upload({
  onNext,
}: {
  onNext: (data: { file: File; documentType: 'devis' | 'facture'; documentUrl: string; requestId: string }) => void
}) {
  const supabase = createClient()
  const [documentType, setDocumentType] = useState<'devis' | 'facture'>('devis')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) {
      setError('Format non supporté. Utilisez PDF, JPG ou PNG.')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('Le fichier est trop volumineux (max 20 Mo).')
      return
    }
    setFile(f)
    setError(null)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

      const { data: req, error: insertErr } = await supabase
        .from('financing_requests')
        .insert({ user_id: user.id, document_url: publicUrl, document_type: documentType, status: 'draft' })
        .select('id')
        .single()
      if (insertErr) throw insertErr

      onNext({ file, documentType, documentUrl: publicUrl, requestId: req.id })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {/* Assistant label */}
      <div className="flex items-center gap-1.5 mb-5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1l1.5 4H13l-3.5 2.5L11 12 7 9.5 3 12l1.5-4.5L1 5h4.5L7 1Z" fill="#4F46E5" />
        </svg>
        <span style={{ color: '#4F46E5', fontSize: 13, fontWeight: 500 }}>Assistant Seela</span>
      </div>

      <h2 style={{ fontSize: 28, fontWeight: 600, color: '#1A1A18', letterSpacing: '-0.6px', marginBottom: 10 }}>
        Démarrez un nouveau financement.
      </h2>
      <p style={{ fontSize: 15, color: '#9A9A93', lineHeight: 1.6, marginBottom: 28 }}>
        Déposez un devis ou une facture. Seela en extrait les lignes financables,
        vous pose quelques questions, puis consulte ses partenaires leasers.
      </p>

      {/* Type selector */}
      <div className="mb-2">
        <p className="text-xs font-medium mb-2" style={{ color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Type de document
        </p>
        <div className="inline-flex p-1 rounded-xl gap-1" style={{ background: '#F5F5F4' }}>
          {([
            { key: 'devis', label: 'Devis — matériel à acheter' },
            { key: 'facture', label: 'Facture — déjà acheté (lease-back)' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setDocumentType(t.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: documentType === t.key ? '#1A1A18' : 'transparent',
                color: documentType === t.key ? '#fff' : '#9A9A93',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => fileRef.current?.click()}
        className="mt-5 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragging ? '#4F46E5' : file ? '#4F46E5' : '#E5E5E3'}`,
          borderRadius: 12,
          padding: '48px 24px',
          background: dragging ? '#EEF2FF' : file ? '#EEF2FF' : '#FAFAF9',
        }}
      >
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1" style={{ background: '#EEF2FF' }}>
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <path d="M7 4h10l6 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2Z" stroke="#4F46E5" strokeWidth="1.5" />
                <path d="M17 4v6h6M10 14l3 3 5-5" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-medium text-sm" style={{ color: '#1A1A18' }}>{file.name}</p>
            <p className="text-xs" style={{ color: '#9A9A93' }}>{(file.size / 1024 / 1024).toFixed(1)} Mo · Prêt à analyser</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1" style={{ background: '#F5F5F4' }}>
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <path d="M14 18V6M9 11l5-5 5 5" stroke="#9A9A93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 20v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="#9A9A93" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>Glissez votre devis ici</p>
            <p className="text-xs" style={{ color: '#9A9A93' }}>
              ou cliquez pour parcourir — PDF, JPG, PNG jusqu&apos;à 25 Mo
            </p>
            <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ background: '#fff', color: '#1A1A18', borderColor: '#E5E5E3', borderRadius: 8 }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 9V2M4 5l3-3 3 3M1 11v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Parcourir
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ background: '#fff', color: '#9A9A93', borderColor: '#E5E5E3', borderRadius: 8 }}
                onClick={() => {}}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M5.5 8.5a3 3 0 004.24 0l2-2a3 3 0 00-4.24-4.24l-1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8.5 5.5a3 3 0 00-4.24 0l-2 2a3 3 0 004.24 4.24l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Coller un lien
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security badges */}
      <div className="flex items-center gap-1.5 mt-4 flex-wrap">
        {[
          { label: 'Documents chiffrés au repos', lock: true },
          { label: 'ISO 27001' },
          { label: "Vos données ne quittent jamais l'UE" },
        ].map((b, i) => (
          <span key={b.label} className="flex items-center gap-1" style={{ color: '#9A9A93', fontSize: 12 }}>
            {i > 0 && <span style={{ color: '#D1D1CE' }}>·</span>}
            {b.lock ? (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4 5V3.5a2 2 0 114 0V5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span>{b.label}</span>
          </span>
        ))}
      </div>

      {error && (
        <div className="mt-4 text-sm px-4 py-3 rounded-xl" style={{ background: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <NavButtons
        hideBack
        onNext={handleUpload}
        nextLabel="Analyser le document"
        loading={uploading}
        disabled={!file}
      />
    </div>
  )
}

// ─── Step 2: AI Analysis ──────────────────────────────────────────────────────

function Step2Lines({
  requestId,
  documentUrl,
  mimeType,
  onBack,
  onNext,
}: {
  requestId: string
  documentUrl: string
  mimeType: string
  onBack: () => void
  onNext: (items: LineItem[], selected: string[], meta: DocumentMeta) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [analyzing, setAnalyzing] = useState(true)
  const [items, setItems] = useState<LineItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const analyzed = useRef(false)

  const [meta, setMeta] = useState<DocumentMeta>({ supplier_name: null, supplier_address: null, supplier_siren: null, document_number: null, document_date: null })

  const analyze = useCallback(async () => {
    if (analyzed.current) return
    analyzed.current = true
    try {
      // Check DB first — avoid re-calling Claude unnecessarily
      const { data: existing } = await supabase
        .from('line_items')
        .select('*')
        .eq('request_id', requestId)

      if (existing && existing.length > 0) {
        const withIds: LineItem[] = existing.map((i: LineItem) => ({ ...i }))
        setItems(withIds)
        const autoSelected = new Set(
          withIds
            .filter(i => i.selected && i.total_price != null && i.total_price > 0)
            .map(i => i.id)
        )
        setSelected(autoSelected)
        return
      }

      // Fresh analysis
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentUrl, mimeType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analyse échouée')

      // Store supplier + document metadata
      const parsedMeta: DocumentMeta = {
        supplier_name: data.supplier?.name ?? null,
        supplier_address: data.supplier?.address ?? null,
        supplier_siren: data.supplier?.siren ?? null,
        document_number: data.document_number ?? null,
        document_date: data.document_date ?? null,
      }
      setMeta(parsedMeta)

      const withIds: LineItem[] = (data.items || []).map((i: Omit<LineItem, 'id'>) => ({ ...i, id: genId() }))
      setItems(withIds)
      const autoSelected = new Set(
        withIds.filter(i => i.total_price != null && i.total_price > 0).map(i => i.id)
      )
      setSelected(autoSelected)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse")
    } finally {
      setAnalyzing(false)
    }
  }, [requestId, documentUrl, mimeType, supabase])

  useEffect(() => { analyze() }, [analyze])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const total = items
    .filter(i => selected.has(i.id))
    .reduce((s, i) => s + (i.total_price ?? 0), 0)

  return (
    <div>
      <h2 className="font-semibold text-xl mb-1" style={{ color: '#1A1A18', letterSpacing: '-0.3px' }}>
        Lignes à financer
      </h2>
      <p className="text-sm mb-8" style={{ color: '#9A9A93' }}>
        Sélectionnez les équipements que vous souhaitez financer
      </p>

      {analyzing ? (
        <div className="py-16 flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-t-[#1A1A18] animate-spin" style={{ borderColor: '#E5E5E2', borderTopColor: '#1A1A18' }} />
          <p className="text-sm" style={{ color: '#9A9A93' }}>Analyse IA en cours…</p>
        </div>
      ) : error ? (
        <div>
          <div className="text-sm px-4 py-3 rounded-xl mb-4" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</div>
          <button onClick={() => { analyzed.current = false; setAnalyzing(true); setError(null); analyze() }} className="text-sm underline" style={{ color: '#1A1A18' }}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          {(meta.supplier_name || meta.document_number) && (
            <div className="flex items-start gap-4 px-5 py-4 rounded-xl border mb-4" style={{ background: '#FAFAF9', borderColor: '#E5E5E2' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#E5E5E3' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="#9A9A93" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M10 2v4h4" stroke="#9A9A93" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {meta.supplier_name && (
                  <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>{meta.supplier_name}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {meta.document_number && (
                    <span className="text-xs" style={{ color: '#9A9A93' }}>N° {meta.document_number}</span>
                  )}
                  {meta.document_date && (
                    <span className="text-xs" style={{ color: '#9A9A93' }}>{meta.document_date}</span>
                  )}
                  {meta.supplier_siren && (
                    <span className="text-xs" style={{ color: '#9A9A93' }}>SIREN {meta.supplier_siren}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs mb-0.5" style={{ color: '#9A9A93' }}>Montant total</p>
                <p className="text-sm font-semibold" style={{ color: '#1A1A18' }}>
                  {fmt(items.reduce((s, i) => s + (i.total_price ?? 0), 0))}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E5E5E2' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ background: '#F0F0EE', borderColor: '#E5E5E2' }}>
                  <th className="px-4 py-3 w-10"></th>
                  {['Description', 'Qté', 'Prix unit. HT', 'Total HT'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#9A9A93' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 cursor-pointer transition-colors hover:bg-[#F8F8F6]"
                    style={{ borderColor: '#E5E5E2', background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}
                    onClick={() => toggle(item.id)}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#1A1A18' }}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm" style={{ color: '#1A1A18' }}>{item.description ?? '—'}</div>
                      {item.category && (() => {
                        const c = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS['Autre']
                        return (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.color }}>
                            {item.category}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: '#1A1A18' }}>{item.quantity ?? '—'}</td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: '#1A1A18' }}>
                      {item.unit_price != null ? fmt(item.unit_price) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium" style={{ color: '#1A1A18' }}>
                      {item.total_price != null ? fmt(item.total_price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected.size > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="text-sm font-semibold" style={{ color: '#1A1A18' }}>
                Total sélectionné&nbsp;: <span className="text-base">{fmt(total)}</span>
              </div>
            </div>
          )}
        </>
      )}

      <NavButtons
        onBack={onBack}
        onNext={() => onNext(items, Array.from(selected), meta)}
        disabled={selected.size === 0 || analyzing}
      />
    </div>
  )
}

// ─── Step 3: Configuration ────────────────────────────────────────────────────

const PERIODICITE_OPTIONS: { key: Periodicite; label: string; sub: string; mult: number }[] = [
  { key: 'mensuelle',      label: 'Mensuelle',      sub: 'Prélèvement le même jour chaque mois', mult: 1 },
  { key: 'trimestrielle',  label: 'Trimestrielle',  sub: 'Un paiement tous les 3 mois',          mult: 3 },
  { key: 'annuelle',       label: 'Annuelle',        sub: 'Un seul paiement par an',               mult: 12 },
]

function Step3Config({
  totalAmount,
  onBack,
  onNext,
}: {
  totalAmount: number
  onBack: () => void
  onNext: (duration: Duration, notes: string, periodicite: Periodicite) => void
}) {
  const [duration, setDuration] = useState<Duration>(36)
  const [periodicite, setPeriodicite] = useState<Periodicite>('mensuelle')
  const [notes, setNotes] = useState('')

  const monthly = totalAmount * COEFFICIENTS[duration]
  const opt = PERIODICITE_OPTIONS.find(o => o.key === periodicite)!
  const periodAmount = monthly * opt.mult
  const periodLabel = periodicite === 'mensuelle' ? '/mois' : periodicite === 'trimestrielle' ? '/trimestre' : '/an'

  return (
    <div>
      <h2 className="font-semibold text-xl mb-1" style={{ color: '#1A1A18', letterSpacing: '-0.3px' }}>
        Configuration du financement
      </h2>
      <p className="text-sm mb-8" style={{ color: '#9A9A93' }}>
        Montant total sélectionné : <strong style={{ color: '#1A1A18' }}>{fmt(totalAmount)}</strong>
      </p>

      <div className="mb-8">
        <p className="text-sm font-medium mb-3" style={{ color: '#1A1A18' }}>Durée souhaitée</p>
        <div className="flex gap-3 flex-wrap">
          {([24, 36, 48, 60] as Duration[]).map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className="px-5 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{
                background: duration === d ? '#1A1A18' : '#fff',
                color: duration === d ? '#FAFAF9' : '#1A1A18',
                borderColor: duration === d ? '#1A1A18' : '#E5E5E2',
              }}
            >
              {d} mois
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium mb-3" style={{ color: '#1A1A18' }}>Périodicité de paiement</p>
        <div className="flex flex-col gap-2">
          {PERIODICITE_OPTIONS.map(o => (
            <label
              key={o.key}
              className="flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
              style={{
                borderColor: periodicite === o.key ? '#1A1A18' : '#E5E5E2',
                background: periodicite === o.key ? '#F5F5F4' : '#fff',
              }}
            >
              <input
                type="radio"
                name="periodicite"
                value={o.key}
                checked={periodicite === o.key}
                onChange={() => setPeriodicite(o.key)}
                className="mt-0.5 shrink-0"
                style={{ accentColor: '#1A1A18' }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>{o.label}</p>
                <p className="text-xs" style={{ color: '#9A9A93' }}>{o.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Estimate */}
      <div className="p-6 rounded-2xl border mb-8" style={{ background: '#F0F0EE', borderColor: '#E5E5E2' }}>
        <p className="text-xs font-medium mb-1" style={{ color: '#9A9A93' }}>Loyer estimé</p>
        <p className="font-semibold" style={{ fontSize: '2rem', color: '#1A1A18', letterSpacing: '-1px' }}>
          {fmt(periodAmount)}
          <span className="text-base font-normal ml-1" style={{ color: '#9A9A93' }}>{periodLabel}</span>
        </p>
        {periodicite !== 'mensuelle' && (
          <p className="text-xs mt-1" style={{ color: '#9A9A93' }}>
            soit {fmt(monthly)}/mois équivalent
          </p>
        )}
        <p className="text-xs mt-2" style={{ color: '#9A9A93' }}>
          Sur {duration} mois — estimation indicative
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A18' }}>
          Remarques <span style={{ color: '#9A9A93', fontWeight: 400 }}>(optionnel)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Informations complémentaires pour votre conseiller Seela…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#1A1A18] resize-none transition-colors"
          style={{ background: '#fff', borderColor: '#E5E5E2', color: '#1A1A18' }}
        />
      </div>

      <NavButtons onBack={onBack} onNext={() => onNext(duration, notes, periodicite)} />
    </div>
  )
}

// ─── Step 4: Confirmation (auto-submit) ──────────────────────────────────────

function Step4Confirmation({
  requestId,
  documentType,
  selectedItems,
  lineItems,
  duration,
  notes,
  periodicite,
  meta,
}: {
  requestId: string
  documentType: 'devis' | 'facture'
  selectedItems: string[]
  lineItems: LineItem[]
  duration: Duration
  notes: string
  periodicite: Periodicite
  meta: DocumentMeta
}) {
  const router = useRouter()
  const supabase = createClient()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitted_ref = useRef(false)

  const items = lineItems.filter(i => selectedItems.includes(i.id))
  const totalAmount = items.reduce((s, i) => s + (i.total_price ?? 0), 0)

  const submit = useCallback(async () => {
    if (submitted_ref.current) return
    submitted_ref.current = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const lineItemsData = items.map(i => ({
        request_id: requestId,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        category: i.category ?? null,
        selected: true,
      }))
      const { error: liErr } = await supabase.from('line_items').insert(lineItemsData)
      if (liErr) {
        if (liErr.message?.includes('category')) {
          const { error: liErr2 } = await supabase.from('line_items').insert(
            lineItemsData.map(({ category: _c, ...rest }) => rest)
          )
          if (liErr2) throw liErr2
        } else {
          throw liErr
        }
      }

      const { error: upErr } = await supabase
        .from('financing_requests')
        .update({
          status: 'submitted',
          total_amount: totalAmount,
          duration_months: duration,
          notes: notes || null,
          periodicite,
          supplier_name: meta.supplier_name,
          supplier_address: meta.supplier_address,
          supplier_siren: meta.supplier_siren,
          document_number: meta.document_number,
          document_date: meta.document_date,
        })
        .eq('id', requestId)
      if (upErr) throw upErr

      setSubmitted(true)

      // Fire-and-forget: run matching in background
      fetch('/api/match-leasers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      }).catch(err => console.error('[match-leasers]', err))
    } catch (err: unknown) {
      submitted_ref.current = false
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    }
  }, [requestId, items, totalAmount, duration, notes, supabase])

  useEffect(() => { submit() }, [submit])

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#FEF2F2' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4M12 16h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="font-semibold text-xl mb-3" style={{ color: '#1A1A18' }}>Erreur lors de la soumission</h2>
        <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: '#DC2626' }}>{error}</p>
        <button
          onClick={() => { submitted_ref.current = false; setError(null); submit() }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ background: '#1A1A18', color: '#FAFAF9' }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#EEF2FF' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-semibold mb-3" style={{ fontSize: 22, color: '#1A1A18', letterSpacing: '-0.4px' }}>
          Votre demande est transmise
        </h2>
        <p className="text-sm mb-2 max-w-sm mx-auto" style={{ color: '#9A9A93', lineHeight: 1.7 }}>
          Seela est en train d&apos;obtenir des offres de financement pour votre {documentType}.
          Vous serez notifié dès que les offres sont disponibles.
        </p>
        <p className="text-xs mb-8" style={{ color: '#9A9A93' }}>Délai estimé : 24 à 48h ouvrées</p>
        <button
          onClick={() => router.push('/offres')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ background: '#1A1A18', color: '#FAFAF9' }}
        >
          Voir mes demandes de financement
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="w-10 h-10 rounded-full border-2 border-t-[#1A1A18] animate-spin mx-auto mb-6" style={{ borderColor: '#E5E5E2', borderTopColor: '#1A1A18' }} />
      <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>Transmission de votre dossier…</p>
      <p className="text-xs mt-1" style={{ color: '#9A9A93' }}>Quelques secondes</p>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function NouveauPage() {
  const [step, setStep] = useState(1)

  // Step 1 data
  const [documentUrl, setDocumentUrl] = useState('')
  const [documentMime, setDocumentMime] = useState('')
  const [documentType, setDocumentType] = useState<'devis' | 'facture'>('devis')
  const [requestId, setRequestId] = useState('')

  // Step 2 data
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [docMeta, setDocMeta] = useState<DocumentMeta>({ supplier_name: null, supplier_address: null, supplier_siren: null, document_number: null, document_date: null })

  // Step 3 data
  const [duration, setDuration] = useState<Duration>(36)
  const [notes, setNotes] = useState('')
  const [periodicite, setPeriodicite] = useState<Periodicite>('mensuelle')

  const totalAmount = lineItems
    .filter(i => selectedItems.includes(i.id))
    .reduce((s, i) => s + (i.total_price ?? 0), 0)

  function handleStep1(data: { file: File; documentType: 'devis' | 'facture'; documentUrl: string; requestId: string }) {
    setDocumentUrl(data.documentUrl)
    setDocumentMime(data.file.type)
    setDocumentType(data.documentType)
    setRequestId(data.requestId)
    setStep(2)
  }

  function handleStep2(items: LineItem[], selected: string[], meta: DocumentMeta) {
    setLineItems(items)
    setSelectedItems(selected)
    setDocMeta(meta)
    setStep(3)
  }

  function handleStep3(dur: Duration, n: string, p: Periodicite) {
    setDuration(dur)
    setNotes(n)
    setPeriodicite(p)
    setStep(4)
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="border-b h-12 flex items-center px-6 shrink-0" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <Link href="/dashboard" className="text-sm transition-colors" style={{ color: '#9A9A93' }}>Tableau de bord</Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mx-1.5">
          <path d="M4 2l4 4-4 4" stroke="#D1D1CE" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium" style={{ color: '#1A1A18' }}>Nouveau financement</span>
        <TopActions />
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-10">
        <ProgressBar step={step} total={4} />

        {step === 1 && <Step1Upload onNext={handleStep1} />}
        {step === 2 && (
          <Step2Lines
            requestId={requestId}
            documentUrl={documentUrl}
            mimeType={documentMime}
            onBack={() => setStep(1)}
            onNext={handleStep2}
          />
        )}
        {step === 3 && (
          <Step3Config
            totalAmount={totalAmount}
            onBack={() => setStep(2)}
            onNext={handleStep3}
          />
        )}
        {step === 4 && (
          <Step4Confirmation
            requestId={requestId}
            documentType={documentType}
            selectedItems={selectedItems}
            lineItems={lineItems}
            duration={duration}
            notes={notes}
            periodicite={periodicite}
            meta={docMeta}
          />
        )}
      </div>
    </div>
  )
}
