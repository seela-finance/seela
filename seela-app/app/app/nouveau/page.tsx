'use client'

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopActions from '@/components/TopActions'
import { MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES } from '@/lib/documents'
import { RS, requestDestination } from '@/lib/status'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  description: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  category?: string | null
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-10">
      <div className="relative flex items-start justify-between">
        {/* Background line */}
        <div className="absolute left-3.5 right-3.5 top-3.5 h-px" style={{ background: 'var(--line)', zIndex: 0 }} />
        {/* Progress line */}
        <div
          className="absolute top-3.5 h-px transition-all duration-500"
          style={{
            background: 'var(--accent)',
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
                  background: active ? 'var(--accent)' : done ? 'var(--ink)' : 'var(--surface)',
                  color: done || active ? '#fff' : 'var(--ink-3)',
                  border: !done && !active ? '1px solid var(--line-strong)' : 'none',
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
                style={{ color: active ? 'var(--ink)' : 'var(--ink-3)', fontWeight: active ? 500 : 400 }}
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
    <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: 'var(--line)' }}>
      {!hideBack && onBack ? (
        <button onClick={onBack} className="ev-btn ev-btn--ghost">
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
          className="ev-btn ev-btn--primary"
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
  requestId,
  hasDocument,
  initialType,
  onNext,
}: {
  requestId: string
  hasDocument: boolean
  initialType: 'devis' | 'facture'
  /** `replaced` : nouveau document, les lignes déjà extraites ne valent plus. */
  onNext: (data: { documentType: 'devis' | 'facture'; requestId: string; replaced: boolean }) => void
}) {
  const supabase = createClient()
  const [documentType, setDocumentType] = useState<'devis' | 'facture'>(initialType)
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
    if (f.size > MAX_DOCUMENT_BYTES) {
      setError('Le fichier est trop volumineux (20 Mo maximum).')
      return
    }
    if (f.type !== 'application/pdf' && f.size > MAX_IMAGE_BYTES) {
      setError('Image trop volumineuse (5 Mo maximum) : envoyez un PDF ou une image plus légère.')
      return
    }
    setFile(f)
    setError(null)
  }

  async function handleUpload() {
    // Sans nouveau fichier : on garde le document déjà déposé et ses lignes
    if (!file) {
      onNext({ documentType, requestId, replaced: false })
      return
    }
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

      if (requestId) {
        // Même brouillon : le serveur remplace le document et retire l'ancien fichier
        const res = await fetch(`/api/requests/${requestId}/draft`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentUrl: publicUrl, documentType }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          await supabase.storage.from('documents').remove([path])
          throw new Error(data.error ?? 'Le document n\'a pas pu être remplacé.')
        }
        onNext({ documentType, requestId, replaced: true })
        return
      }

      const { data: req, error: insertErr } = await supabase
        .from('financing_requests')
        .insert({ user_id: user.id, document_url: publicUrl, document_type: documentType, status: RS.draft })
        .select('id')
        .single()
      if (insertErr) {
        await supabase.storage.from('documents').remove([path])
        throw insertErr
      }

      onNext({ documentType, requestId: req.id, replaced: true })
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
          <path d="M7 1l1.5 4H13l-3.5 2.5L11 12 7 9.5 3 12l1.5-4.5L1 5h4.5L7 1Z" fill="var(--ink-3)" />
        </svg>
        <span className="ev-kicker">Assistant Everlease</span>
      </div>

      <h2 className="ev-display" style={{ fontSize: 28, color: 'var(--ink)', marginBottom: 10 }}>
        Démarrez un nouveau financement.
      </h2>
      <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 28 }}>
        Déposez un devis ou une facture. Everlease en extrait les lignes financables,
        vous pose quelques questions, puis présente votre dossier à des financeurs adaptés.
      </p>

      {/* Type selector */}
      <div className="mb-2">
        <p className="ev-kicker mb-2">
          Type de document
        </p>
        <div className="inline-flex p-1 rounded-full gap-1" style={{ background: 'var(--raised)' }}>
          {([
            { key: 'devis', label: 'Devis — matériel à acheter' },
            { key: 'facture', label: 'Facture — déjà acheté (lease-back)' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setDocumentType(t.key)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: documentType === t.key ? 'var(--ink)' : 'transparent',
                color: documentType === t.key ? '#fff' : 'var(--ink-3)',
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
        className={`ev-card ev-card--dashed ${dragging || file ? 'ev-card--selected' : ''} mt-5 text-center cursor-pointer transition-all`}
        style={{
          padding: '48px 24px',
          background: dragging ? 'var(--accent-soft)' : file ? 'var(--accent-soft)' : 'var(--paper)',
        }}
      >
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: 'var(--surface)' }}>
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <path d="M7 4h10l6 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2Z" stroke="var(--accent)" strokeWidth="1.5" />
                <path d="M17 4v6h6M10 14l3 3 5-5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{file.name}</p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{(file.size / 1024 / 1024).toFixed(1)} Mo · Prêt à analyser</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: 'var(--raised)' }}>
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <path d="M14 18V6M9 11l5-5 5 5" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 20v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {hasDocument ? 'Glissez un autre document pour remplacer le vôtre' : 'Glissez votre devis ici'}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              ou cliquez pour parcourir : PDF jusqu&apos;à 20 Mo, JPG ou PNG jusqu&apos;à 5 Mo
            </p>
            <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => fileRef.current?.click()}
                className="ev-btn ev-btn--ghost ev-btn--sm"
                style={{ background: 'var(--surface)' }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 9V2M4 5l3-3 3 3M1 11v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Parcourir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security badges */}
      <div className="flex items-center gap-1.5 mt-4 flex-wrap">
        {[
          { label: 'Aucune carte ni RIB demandé', lock: true },
          { label: 'Devis ou facture, PDF ou image' },
        ].map((b, i) => (
          <span key={b.label} className="flex items-center gap-1" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
            {i > 0 && <span style={{ color: 'var(--line-strong)' }}>·</span>}
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
        <div className="ev-alert ev-alert--danger mt-4">
          {error}
        </div>
      )}

      <NavButtons
        hideBack
        onNext={handleUpload}
        nextLabel={file || !hasDocument ? 'Analyser le document' : 'Garder ce document'}
        loading={uploading}
        disabled={!file && !hasDocument}
      />
    </div>
  )
}

// ─── Step 2: AI Analysis ──────────────────────────────────────────────────────

type DocumentType = 'devis' | 'facture'

const EMPTY_META: DocumentMeta = { supplier_name: null, supplier_address: null, supplier_siren: null, document_number: null, document_date: null }

function Step2Lines({
  requestId,
  initial,
  documentType,
  onDocumentTypeChange,
  onBack,
  onNext,
}: {
  requestId: string
  /** Lignes déjà chargées (retour depuis une autre étape) : ni lecture ni analyse. */
  initial: { items: LineItem[]; selected: string[]; meta: DocumentMeta } | null
  documentType: DocumentType
  onDocumentTypeChange: (t: DocumentType) => void
  onBack: (items: LineItem[], selected: string[], meta: DocumentMeta) => void
  onNext: (items: LineItem[], selected: string[], meta: DocumentMeta) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [analyzing, setAnalyzing] = useState(!initial)
  const [items, setItems] = useState<LineItem[]>(initial?.items ?? [])
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.selected ?? []))
  const [error, setError] = useState<string | null>(null)
  // Type lu sur le document par l'IA : s'il contredit le choix de l'étape 1, on le signale
  const [detectedType, setDetectedType] = useState<DocumentType | null>(null)
  const analyzed = useRef(!!initial)

  const [meta, setMeta] = useState<DocumentMeta>(initial?.meta ?? EMPTY_META)

  const analyze = useCallback(async () => {
    if (analyzed.current) return
    analyzed.current = true
    try {
      // Lignes déjà enregistrées (reprise d'un brouillon) : aucun appel à l'IA
      const [{ data: existing }, { data: request }] = await Promise.all([
        supabase.from('line_items').select('*').eq('request_id', requestId),
        supabase.from('financing_requests').select('supplier_name, supplier_address, supplier_siren, document_number, document_date').eq('id', requestId).single(),
      ])

      if (existing && existing.length > 0) {
        setItems(existing as LineItem[])
        setSelected(new Set((existing as LineItem[]).filter(i => i.selected).map(i => i.id)))
        if (request) setMeta(request as DocumentMeta)
        return
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Analyse échouée')

      setMeta(data.meta ?? EMPTY_META)
      if (data.document_kind === 'devis' || data.document_kind === 'facture') setDetectedType(data.document_kind)

      const lines: LineItem[] = data.items ?? []
      setItems(lines)
      setSelected(new Set(lines.filter(i => i.selected).map(i => i.id)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse")
    } finally {
      setAnalyzing(false)
    }
  }, [requestId, supabase])

  // TODO(backlog): refacto du chargement au montage (setState synchrone dans l'effet)
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <h2 className="ev-display text-xl mb-1" style={{ color: 'var(--ink)' }}>
        Lignes à financer
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
        Sélectionnez les équipements que vous souhaitez financer
      </p>

      {/* Devis = leasing de matériel neuf, facture = lease-back : un mauvais choix fausse les offres */}
      {!analyzing && detectedType && detectedType !== documentType && (
        <div role="alert" className="ev-alert ev-alert--warning mb-6">
          <p>
            Ce document ressemble à {detectedType === 'facture' ? 'une facture' : 'un devis'}, alors que vous avez indiqué {documentType === 'facture' ? 'une facture' : 'un devis'}.
            {' '}{detectedType === 'facture'
              ? 'Un matériel déjà acheté se finance en lease-back.'
              : 'Un matériel pas encore acheté se finance en leasing.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onDocumentTypeChange(detectedType)}
              className="ev-btn ev-btn--primary ev-btn--sm"
            >
              C&apos;est {detectedType === 'facture' ? 'une facture' : 'un devis'}
            </button>
            <button
              type="button"
              onClick={() => setDetectedType(null)}
              className="ev-btn ev-btn--ghost ev-btn--sm"
            >
              Non, c&apos;est bien {documentType === 'facture' ? 'une facture' : 'un devis'}
            </button>
          </div>
        </div>
      )}

      {analyzing ? (
        <div className="py-16 flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Analyse IA en cours…</p>
        </div>
      ) : error ? (
        <div>
          <div className="ev-alert ev-alert--danger mb-4">{error}</div>
          <button onClick={() => { analyzed.current = false; setAnalyzing(true); setError(null); analyze() }} className="ev-btn ev-btn--ghost ev-btn--sm">
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="ev-alert ev-alert--warning">
          Aucun équipement à financer n&apos;a été trouvé dans ce document. Revenez en arrière pour en déposer un autre.
        </div>
      ) : (
        <>
          {(meta.supplier_name || meta.document_number) && (
            <div className="ev-card ev-card--paper flex items-start gap-4 px-5 py-4 mb-4">
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--raised)' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="var(--ink-3)" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M10 2v4h4" stroke="var(--ink-3)" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {meta.supplier_name && (
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{meta.supplier_name}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {meta.document_number && (
                    <span className="text-xs ev-mono" style={{ color: 'var(--ink-3)' }}>N° {meta.document_number}</span>
                  )}
                  {meta.document_date && (
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{meta.document_date}</span>
                  )}
                  {meta.supplier_siren && (
                    <span className="text-xs ev-mono" style={{ color: 'var(--ink-3)' }}>SIREN {meta.supplier_siren}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>Montant total</p>
                <p className="text-sm font-semibold ev-mono" style={{ color: 'var(--ink)' }}>
                  {fmt(items.reduce((s, i) => s + (i.total_price ?? 0), 0))}
                </p>
              </div>
            </div>
          )}

          <div className="ev-card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ background: 'var(--raised)', borderColor: 'var(--line)' }}>
                  <th className="px-4 py-3 w-10"></th>
                  {/* Sur mobile : description et total, l'essentiel pour choisir */}
                  {[['Description', ''], ['Qté', 'hidden sm:table-cell'], ['Prix unit. HT', 'hidden sm:table-cell'], ['Total HT', 'whitespace-nowrap']].map(([h, cls]) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold ${cls}`} style={{ color: 'var(--ink-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 cursor-pointer transition-colors hover:bg-[var(--paper)]"
                    style={{ borderColor: 'var(--line)', background: i % 2 === 0 ? '#fff' : 'var(--paper)' }}
                    onClick={() => toggle(item.id)}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent)' }}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm" style={{ color: 'var(--ink)' }}>{item.description ?? '—'}</div>
                      {item.category && (
                        <span className="ev-tag mt-1">
                          {item.category}
                        </span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3.5 text-sm ev-mono" style={{ color: 'var(--ink)' }}>{item.quantity ?? '—'}</td>
                    <td className="hidden sm:table-cell px-4 py-3.5 text-sm ev-mono" style={{ color: 'var(--ink)' }}>
                      {item.unit_price != null ? fmt(item.unit_price) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium ev-mono whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                      {item.total_price != null ? fmt(item.total_price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Total sélectionné&nbsp;: <span className="text-base ev-mono">{fmt(total)}</span>
              </div>
            </div>
          )}
        </>
      )}

      <NavButtons
        onBack={() => onBack(items, Array.from(selected), meta)}
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
  initial,
  onBack,
  onNext,
}: {
  totalAmount: number
  initial: { duration: Duration; notes: string; periodicite: Periodicite }
  onBack: (duration: Duration, notes: string, periodicite: Periodicite) => void
  onNext: (duration: Duration, notes: string, periodicite: Periodicite) => void
}) {
  const [duration, setDuration] = useState<Duration>(initial.duration)
  const [periodicite, setPeriodicite] = useState<Periodicite>(initial.periodicite)
  const [notes, setNotes] = useState(initial.notes)

  const monthly = totalAmount * COEFFICIENTS[duration]
  const opt = PERIODICITE_OPTIONS.find(o => o.key === periodicite)!
  const periodAmount = monthly * opt.mult
  const periodLabel = periodicite === 'mensuelle' ? '/mois' : periodicite === 'trimestrielle' ? '/trimestre' : '/an'

  return (
    <div>
      <h2 className="ev-display text-xl mb-1" style={{ color: 'var(--ink)' }}>
        Configuration du financement
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
        Montant total sélectionné : <strong className="ev-mono" style={{ color: 'var(--ink)' }}>{fmt(totalAmount)}</strong>
      </p>

      <div className="mb-8">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>Durée souhaitée</p>
        <div className="flex gap-3 flex-wrap">
          {([24, 36, 48, 60] as Duration[]).map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`ev-card ${duration === d ? 'ev-card--selected' : 'ev-card--interactive'} px-5 py-2.5 text-sm font-medium transition-all`}
              style={{
                background: duration === d ? 'var(--accent-soft)' : 'var(--surface)',
                color: duration === d ? 'var(--accent-ink)' : 'var(--ink)',
              }}
            >
              {d} mois
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>Périodicité de paiement</p>
        <div className="flex flex-col gap-2">
          {PERIODICITE_OPTIONS.map(o => (
            <label
              key={o.key}
              className={`ev-card ${periodicite === o.key ? 'ev-card--selected' : 'ev-card--interactive'} flex items-start gap-3 px-4 py-3 cursor-pointer transition-all`}
              style={{
                background: periodicite === o.key ? 'var(--accent-soft)' : 'var(--surface)',
              }}
            >
              <input
                type="radio"
                name="periodicite"
                value={o.key}
                checked={periodicite === o.key}
                onChange={() => setPeriodicite(o.key)}
                className="mt-0.5 shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{o.label}</p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{o.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Estimate */}
      <div className="ev-card ev-card--paper p-6 mb-8">
        <p className="ev-kicker mb-1">Loyer estimé</p>
        <p className="ev-mono" style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          {fmt(periodAmount)}
          <span className="text-base font-normal ml-1 font-sans" style={{ color: 'var(--ink-3)', letterSpacing: 0 }}>{periodLabel}</span>
        </p>
        {periodicite !== 'mensuelle' && (
          <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
            soit <span className="ev-mono">{fmt(monthly)}</span>/mois équivalent
          </p>
        )}
        <p className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>
          Sur {duration} mois. Estimation indicative, hors assurance et services.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
          Sous réserve d&apos;acceptation du dossier par le financeur.
        </p>
      </div>

      <div>
        <label className="ev-label">
          Remarques <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optionnel)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Informations complémentaires pour votre conseiller Everlease…"
          rows={3}
          className="ev-input"
        />
      </div>

      <NavButtons onBack={() => onBack(duration, notes, periodicite)} onNext={() => onNext(duration, notes, periodicite)} />
    </div>
  )
}

// ─── Step 4: Confirmation ──────────────────────────────────────

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
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = lineItems.filter(i => selectedItems.includes(i.id))
  const totalAmount = items.reduce((s, i) => s + (i.total_price ?? 0), 0)

  // Soumission côté serveur : lignes, total recalculé, statut et matching (le navigateur n'écrit plus le dossier).
  // Un deuxième clic ou un rechargement ne duplique rien (route idempotente).
  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/requests/${requestId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total_price: i.total_price,
            category: i.category ?? null,
          })),
          durationMonths: duration,
          periodicite,
          documentType,
          notes,
          meta,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Erreur lors de la soumission (${res.status})`)
      // Offres déjà calculées (ou dossier déjà soumis) : directement sur la page du dossier
      if (data.status === 'already' || (typeof data.offers === 'number' && data.offers > 0)) {
        router.push(`/app/offres/${requestId}`)
        return
      }
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--danger-soft)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4M12 16h.01" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="ev-display text-xl mb-3" style={{ color: 'var(--ink)' }}>Erreur lors de la soumission</h2>
        <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--danger)' }}>{error}</p>
        <button
          onClick={submit}
          disabled={submitting}
          className="ev-btn ev-btn--primary"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--accent-soft)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="ev-display mb-3" style={{ fontSize: 22, color: 'var(--ink)' }}>
          Votre demande est transmise
        </h2>
        <p className="text-sm mb-2 max-w-sm mx-auto" style={{ color: 'var(--ink-3)', lineHeight: 1.7 }}>
          Aucune offre automatique ne correspond encore à votre {documentType} : un conseiller Everlease étudie votre dossier
          et vous rappelle sous 24 h ouvrées.
        </p>
        <p className="text-xs mb-8" style={{ color: 'var(--ink-3)' }}>Vous retrouverez son avancement dans « Offres ».</p>
        <button
          onClick={() => router.push('/app/offres')}
          className="ev-btn ev-btn--primary"
        >
          Voir mes demandes de financement
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    )
  }

  const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="max-w-md mx-auto py-8">
      <h2 className="ev-display text-xl mb-2 text-center" style={{ color: 'var(--ink)' }}>Transmettre votre demande</h2>
      <p className="text-sm mb-6 text-center" style={{ color: 'var(--ink-3)' }}>
        Vérifiez le récapitulatif : Everlease présente ensuite votre dossier à des financeurs adaptés.
      </p>
      <dl className="ev-card divide-y divide-[var(--line)] mb-6">
        {[
          ['Document', documentType === 'facture' ? 'Facture (lease-back)' : 'Devis (leasing)'],
          ['Lignes financées', String(items.length)],
          ['Montant HT', eur(totalAmount)],
          ['Durée', `${duration} mois`],
          ['Périodicité', periodicite.charAt(0).toUpperCase() + periodicite.slice(1)],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
            <dt style={{ color: 'var(--ink-3)' }}>{label}</dt>
            <dd className={label === 'Montant HT' || label === 'Durée' ? 'font-medium ev-mono' : 'font-medium'} style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
          </div>
        ))}
      </dl>
      <button
        onClick={submit}
        disabled={submitting || items.length === 0}
        className="ev-btn ev-btn--primary ev-btn--full"
      >
        {submitting ? 'Transmission de votre dossier…' : 'Transmettre ma demande'}
      </button>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="py-16 flex justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--accent)' }} />
    </div>
  )
}

function Wizard({ resumeId }: { resumeId: string | null }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [resuming, setResuming] = useState(!!resumeId)

  // Step 1 data
  const [hasDocument, setHasDocument] = useState(false)
  const [documentType, setDocumentType] = useState<'devis' | 'facture'>('devis')
  const [requestId, setRequestId] = useState('')

  // Step 2 data (null tant que les lignes du document ne sont pas chargées)
  const [lines, setLines] = useState<{ items: LineItem[]; selected: string[]; meta: DocumentMeta } | null>(null)

  // Step 3 data
  const [config, setConfig] = useState<{ duration: Duration; notes: string; periodicite: Periodicite }>({ duration: 36, notes: '', periodicite: 'mensuelle' })

  // Reprise d'un brouillon : on repart de l'étape des lignes, sans rien recréer
  useEffect(() => {
    if (!resumeId) return
    let cancelled = false
    createClient()
      .from('financing_requests')
      .select('id, status, document_url, document_type')
      .eq('id', resumeId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (!data) {
          router.replace('/app/nouveau')
          return
        }
        if (data.status !== RS.draft) {
          router.replace(requestDestination(data.id, data.status))
          return
        }
        setRequestId(data.id)
        if (data.document_type === 'facture') setDocumentType('facture')
        setHasDocument(!!data.document_url)
        setStep(data.document_url ? 2 : 1)
        setResuming(false)
      })
    return () => { cancelled = true }
  }, [resumeId, router])

  const totalAmount = (lines?.items ?? [])
    .filter(i => lines?.selected.includes(i.id))
    .reduce((s, i) => s + (i.total_price ?? 0), 0)

  function handleStep1(data: { documentType: 'devis' | 'facture'; requestId: string; replaced: boolean }) {
    // Premier dépôt : l'adresse porte le brouillon, un rechargement le retrouve
    if (!requestId) {
      router.replace(`/app/nouveau?request=${data.requestId}`, { scroll: false })
      return
    }
    setDocumentType(data.documentType)
    setHasDocument(true)
    if (data.replaced) setLines(null)
    setStep(2)
  }

  function keepLines(items: LineItem[], selected: string[], meta: DocumentMeta) {
    setLines({ items, selected, meta })
    if (items.length === 0) return
    // Pour la reprise plus tard : la soumission renvoie de toute façon les lignes choisies
    fetch(`/api/requests/${requestId}/draft`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedIds: selected }),
    }).catch(err => console.error('[nouveau] sélection non enregistrée', err))
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="border-b h-12 flex items-center px-6 shrink-0" style={{ borderColor: 'var(--line)', background: '#fff' }}>
        <Link href="/app/dashboard" className="text-sm transition-colors" style={{ color: 'var(--ink-3)' }}>Tableau de bord</Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mx-1.5">
          <path d="M4 2l4 4-4 4" stroke="var(--line-strong)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Nouveau financement</span>
        <TopActions />
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-10">
        <ProgressBar step={step} total={4} />

        {resuming ? <Spinner /> : (
          <>
            {step === 1 && (
              <Step1Upload requestId={requestId} hasDocument={hasDocument} initialType={documentType} onNext={handleStep1} />
            )}
            {step === 2 && (
              <Step2Lines
                requestId={requestId}
                initial={lines}
                documentType={documentType}
                onDocumentTypeChange={setDocumentType}
                onBack={(items, selected, meta) => { keepLines(items, selected, meta); setStep(1) }}
                onNext={(items, selected, meta) => { keepLines(items, selected, meta); setStep(3) }}
              />
            )}
            {step === 3 && (
              <Step3Config
                totalAmount={totalAmount}
                initial={config}
                onBack={(duration, notes, periodicite) => { setConfig({ duration, notes, periodicite }); setStep(2) }}
                onNext={(duration, notes, periodicite) => { setConfig({ duration, notes, periodicite }); setStep(4) }}
              />
            )}
            {step === 4 && lines && (
              <Step4Confirmation
                requestId={requestId}
                documentType={documentType}
                selectedItems={lines.selected}
                lineItems={lines.items}
                duration={config.duration}
                notes={config.notes}
                periodicite={config.periodicite}
                meta={lines.meta}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// La clé repart de zéro quand l'adresse change de brouillon (lien « Nouveau financement » pendant une reprise).
function WizardFromUrl() {
  const resumeId = useSearchParams().get('request')
  return <Wizard key={resumeId ?? 'new'} resumeId={resumeId} />
}

export default function NouveauPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <WizardFromUrl />
    </Suspense>
  )
}
