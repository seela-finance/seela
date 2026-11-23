'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addToPrepipeAction, saveBatchSegmentAction, type CrmFormState } from '@/app/admin/crm/crm-actions'
import { DEFAULT_FILTER, FLAG_LABEL, filterOutbound, NONE, WARMTH_HINT, WARMTH_LABEL, WARMTHS, type OutboundFilter, type OutboundRow, type Warmth } from '@/lib/crm-outbound'
import { fmtDate } from '@/components/admin/ui'

type Batch = { id: string; label: string; campaignName: string | null; segment: string | null; companies: number }

const HOT: Warmth[] = ['interesse', 'repondu', 'clique']
const PROGRESS_STEPS = [0, 0.33, 0.5, 0.6, 0.75, 1]
const pct = (p: number | null) => (p === null ? '—' : `${Math.round(p * 100)} %`)

export function OutboundPicker({ rows, batches }: { rows: OutboundRow[]; batches: Batch[] }) {
  const router = useRouter()
  const [f, setF] = useState<OutboundFilter>(DEFAULT_FILTER)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<CrmFormState>(null)
  const [pending, startTransition] = useTransition()

  const segments = useMemo(() => [...new Set(batches.map(b => b.segment).filter((s): s is string => !!s))].sort(), [batches])
  const visible = useMemo(() => filterOutbound(rows, f), [rows, f])
  const picked = visible.filter(r => selected.has(r.id))
  const allPicked = visible.length > 0 && picked.length === visible.length
  const warmthCount = (w: Warmth) => filterOutbound(rows, { ...f, warmths: [w] }).length
  const set = (patch: Partial<OutboundFilter>) => setF(prev => ({ ...prev, ...patch }))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function add() {
    const ids = picked.map(r => r.id)
    startTransition(async () => {
      const r = await addToPrepipeAction(ids)
      setResult(r)
      if (r?.ok) { setSelected(new Set()); router.refresh() }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="ev-card p-4 flex flex-col gap-3" aria-label="Filtres">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <div>
            <label htmlFor="f-segment" className="ev-label">Segment</label>
            <select id="f-segment" className="ev-input" value={f.segment} onChange={e => set({ segment: e.target.value })}>
              <option value="">Tous</option>
              {segments.map(s => <option key={s} value={s}>{s}</option>)}
              <option value={NONE}>Sans segment</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-batch" className="ev-label">Batch</label>
            <select id="f-batch" className="ev-input" value={f.batchId} onChange={e => set({ batchId: e.target.value })}>
              <option value="">Tous</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.label}{b.segment ? ` · ${b.segment}` : ''}</option>)}
              <option value={NONE}>Sans batch (jamais dans Lemlist)</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-progress" className="ev-label">Séquence Lemlist au moins à</label>
            <select id="f-progress" className="ev-input" value={f.minProgress} onChange={e => set({ minProgress: Number(e.target.value) })}>
              {PROGRESS_STEPS.map(p => <option key={p} value={p}>{p === 0 ? 'Peu importe' : `${Math.round(p * 100)} %`}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-1.5 pb-2">
            <input type="checkbox" checked={f.withPhone} onChange={e => set({ withPhone: e.target.checked })} style={{ accentColor: 'var(--accent)' }} /> Avec téléphone
          </label>
          <label className="flex items-center gap-1.5 pb-2">
            <input type="checkbox" checked={f.showFlagged} onChange={e => set({ showFlagged: e.target.checked })} style={{ accentColor: 'var(--accent)' }} /> Montrer les écartés
          </label>
          {f !== DEFAULT_FILTER && (
            <button type="button" className="text-xs pb-2.5 hover:opacity-70" style={{ color: 'var(--ink-3)' }} onClick={() => setF(DEFAULT_FILTER)}>Effacer les filtres</button>
          )}
        </div>
        <fieldset className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <legend className="ev-label mb-1">Chaleur (réaction la plus forte dans Lemlist)</legend>
          {WARMTHS.map(w => (
            <label key={w} className="flex items-center gap-1.5" title={WARMTH_HINT[w]}>
              <input type="checkbox" checked={f.warmths.includes(w)} style={{ accentColor: 'var(--accent)' }}
                onChange={e => set({ warmths: e.target.checked ? [...f.warmths, w] : f.warmths.filter(x => x !== w) })} />
              {WARMTH_LABEL[w]} <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{warmthCount(w)}</span>
            </label>
          ))}
        </fieldset>
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Sociétés prospects hors pré-pipe. « Écartés » : pas intéressé, email rejeté ou désinscrit. Le segment vient du dernier batch de la société.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          <span className="ev-mono">{visible.length}</span> société{visible.length > 1 ? 's' : ''} · <span className="ev-mono">{picked.length}</span> choisie{picked.length > 1 ? 's' : ''}
        </p>
        <button type="button" className="ev-btn ev-btn--primary" disabled={!picked.length || pending} onClick={add}>
          {pending ? 'Ajout…' : `Ajouter au pré-pipe (${picked.length})`}
        </button>
      </div>
      {result && (
        <p className={`ev-alert ${result.ok ? 'ev-alert--ok' : 'ev-alert--danger'}`}>
          {result.message}
          {result.ok && <> <Link href="/admin/crm/appels" className="underline">Lancer une session d’appels</Link></>}
        </p>
      )}

      <div className="ev-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th className="px-4 py-2.5 w-8">
                <input type="checkbox" aria-label="Tout choisir" checked={allPicked} disabled={!visible.length} style={{ accentColor: 'var(--accent)' }}
                  onChange={e => setSelected(prev => {
                    const next = new Set(prev)
                    for (const r of visible) { if (e.target.checked) next.add(r.id); else next.delete(r.id) }
                    return next
                  })} />
              </th>
              {['Société', 'Segment · batch', 'Chaleur', 'Séquence', 'Contact', 'Tél.', 'Dernier événement'].map(h => <th key={h} className="ev-kicker px-4 py-2.5 whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 500).map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--line)', background: selected.has(r.id) ? 'var(--raised)' : undefined }}>
                <td className="px-4 py-3">
                  <input type="checkbox" aria-label={`Choisir ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} style={{ accentColor: 'var(--accent)' }} />
                </td>
                <td className="px-4 py-3 text-sm max-w-[240px]">
                  <Link href={`/admin/crm/societes/${r.id}`} className="block truncate font-medium hover:underline" style={{ color: 'var(--ink)' }}>{r.name}</Link>
                  {r.industry && <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>{r.industry}</span>}
                </td>
                <td className="px-4 py-3 text-sm max-w-[220px]">
                  <span className="block truncate" style={{ color: r.segment ? 'var(--ink)' : 'var(--ink-3)' }}>{r.segment ?? 'Sans segment'}</span>
                  <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }} title={r.angle ?? undefined}>{r.batchLabel ?? 'Sans batch'}{r.angle ? ` · ${r.angle}` : ''}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1">
                    <span className={HOT.includes(r.warmth) ? 'ev-tag ev-tag--accent' : 'ev-tag'}>{WARMTH_LABEL[r.warmth]}</span>
                    {r.flags.map(fl => <span key={fl} className="ev-tag ev-tag--danger">{FLAG_LABEL[fl]}</span>)}
                  </span>
                </td>
                <td className="ev-mono px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>{pct(r.progress)}</td>
                <td className="px-4 py-3 text-sm max-w-[200px]">
                  {r.contact
                    ? <>
                      <span className="block truncate" style={{ color: 'var(--ink)' }}>{r.contact.name}</span>
                      {r.contact.title && <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>{r.contact.title}</span>}
                    </>
                    : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                </td>
                <td className="ev-mono px-4 py-3 text-sm whitespace-nowrap" style={{ color: r.phones ? 'var(--ink)' : 'var(--ink-3)' }}>{r.phones}/{r.contacts}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{r.lastEventAt ? fmtDate(r.lastEventAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <p className="px-4 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Aucune société ne correspond à ces filtres.</p>}
        {visible.length > 500 && <p className="px-4 py-3 text-xs" style={{ color: 'var(--ink-3)' }}>500 premières affichées sur {visible.length} : affinez les filtres.</p>}
      </div>

      <details className="ev-card p-4">
        <summary className="text-sm cursor-pointer" style={{ color: 'var(--ink-2)' }}>
          Segments des batches {batches.some(b => !b.segment) && <span className="ev-tag ml-1">{batches.filter(b => !b.segment).length} sans segment</span>}
        </summary>
        <p className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>Le segment du portefeuille (Notion). Il est aussi lu dans la variable Lemlist « segment » des nouvelles campagnes.</p>
        <div className="mt-3 flex flex-col divide-y divide-[var(--line)]">
          {batches.map(b => <BatchSegmentForm key={`${b.id}-${b.segment ?? ''}`} batch={b} />)}
          {!batches.length && <p className="text-sm py-2" style={{ color: 'var(--ink-3)' }}>Aucun batch pour l’instant.</p>}
        </div>
      </details>
    </div>
  )
}

function BatchSegmentForm({ batch }: { batch: Batch }) {
  const [state, submit, pending] = useActionState<CrmFormState, FormData>(saveBatchSegmentAction, null)
  return (
    <form action={submit} className="py-2 flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="batch_id" value={batch.id} />
      <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--ink)' }} title={batch.campaignName ?? undefined}>
        {batch.campaignName ?? batch.label} <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{batch.companies}</span>
      </span>
      <input name="segment" defaultValue={batch.segment ?? ''} placeholder="Segment" aria-label={`Segment de ${batch.label}`} className="ev-input" style={{ width: 220 }} />
      <button type="submit" className="ev-btn ev-btn--ghost ev-btn--sm" disabled={pending}>{pending ? '…' : 'Enregistrer'}</button>
      {state && <span className="text-xs w-full" style={{ color: state.ok ? 'var(--ink-3)' : 'var(--danger)' }}>{state.message}</span>}
    </form>
  )
}
