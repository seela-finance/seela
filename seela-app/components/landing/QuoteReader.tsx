'use client'

// Démonstration « lecture du devis » : un devis fictif lu ligne à ligne
// (6 lignes, 9 pas sur 4 s), déclenché à l'apparition, rejouable ; l'état
// final reste affiché. Données fictives en constante, badge « Exemple
// illustratif » obligatoire (porté par la section). prefers-reduced-motion :
// lignes cochées et loyer affichés d'emblée.
import React from 'react'
import Link from 'next/link'
import { BtnGauge } from './Gauge'
import { fmt } from './format'
import { useInView, prefersReducedMotion } from './useInView'

const LINES = [
  { label: 'Four mixte 10 niveaux × 1', sub: 'Cuisson', amount: 16900, ok: true },
  { label: 'Chambre froide positive × 1', sub: 'Froid', amount: 11200, ok: true },
  { label: 'Lave-vaisselle à capot × 1', sub: 'Plonge', amount: 6284, ok: true },
  { label: 'Caisse tactile et PC de gestion × 1', sub: 'Informatique', amount: 2890, ok: true },
  { label: 'Tables et chaises de salle × 26', sub: 'Mobilier', amount: 4000, ok: true },
  { label: 'Installation et mise en service', sub: 'Prestation de service', amount: 1600, ok: false },
]
const STEPS_MS = [700, 1200, 1700, 2200, 2700, 3200, 3700, 4000]
const END = 9

export default function QuoteReader() {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const [demo, setDemo] = React.useState(0)
  const timers = React.useRef<number[]>([])
  const started = React.useRef(false)

  const clear = React.useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }, [])
  const run = React.useCallback(() => {
    clear()
    setDemo(1)
    STEPS_MS.forEach((ms, i) => {
      timers.current.push(window.setTimeout(() => setDemo(i + 2), ms))
    })
  }, [clear])

  React.useEffect(() => {
    if (!inView || started.current) return
    started.current = true
    // Différé d'un tick : l'état change depuis un callback, pas dans l'effet.
    timers.current.push(window.setTimeout(prefersReducedMotion() ? () => setDemo(END) : run, 0))
  }, [inView, run])

  React.useEffect(() => clear, [clear])

  const replay = () => {
    clear()
    setDemo(0)
    timers.current.push(window.setTimeout(run, 60))
  }

  const rows = LINES.map((l, i) => ({ ...l, isLit: demo >= i + 2 }))
  const kept = rows.filter((r) => r.isLit && r.ok)
  const lit = kept.length
  const total = kept.reduce((sum, r) => sum + r.amount, 0)
  const scanClass = demo === 0 ? '' : demo >= 8 ? ' done' : ' run'
  const status = demo === 0 ? 'En attente' : demo >= 8 ? 'Lecture terminée' : 'Lecture en cours'

  return (
    <div className="demo__grid" ref={ref}>
      <div className="doc" aria-label="Devis d'exemple lu ligne par ligne">
        <div className={`scan${scanClass}`} aria-hidden="true" />
        <div className="doc__head">
          <div>
            <div className="doc__title">Devis n°&nbsp;2026-0417 · Cuisine de restaurant</div>
            <div className="small muted">Fournisseur fictif · 6 lignes · HT</div>
          </div>
          <span className={demo >= 8 ? 'tag tag--ok' : 'tag'}>{status}</span>
        </div>
        {rows.map((l) => (
          <div key={l.label} className={`row${l.isLit ? (l.ok ? ' lit' : ' off') : ''}`}>
            <div className={`chk${l.isLit ? (l.ok ? ' on' : ' no') : ''}`} aria-hidden="true">
              {l.isLit && l.ok && (
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.6 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              {l.isLit && !l.ok && (
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              )}
            </div>
            <div>
              <div className="lbl">{l.label}</div>
              <div className="sub">{l.sub}</div>
            </div>
            <div className={`amt${l.isLit && !l.ok ? ' strike' : ''}`}>{fmt(l.amount)}&nbsp;€</div>
          </div>
        ))}
        <div className="doc__foot">
          <span>Montants HT, hors assurance et services.</span>
          <button className="btn btn--ghost btn--sm" type="button" onClick={replay}>Rejouer</button>
        </div>
      </div>
      <div className="result">
        <div className="total">
          <div className="kicker">Total finançable</div>
          <div className="total__num mono">{fmt(total)}&nbsp;€</div>
          <div className="small muted" style={{ marginTop: 6 }}>{lit} lignes retenues sur 6 · installation exclue</div>
          <div className="total__sep" />
          <div className={demo >= END ? 'rent' : 'rent hid'}>
            <span className="muted">environ</span><b>982&nbsp;€</b><span className="muted">/ mois sur 48 mois</span>
          </div>
          <p className="legal" style={{ margin: '10px 0 0' }}>Hors assurance et services. Sous réserve d&apos;acceptation du dossier par le financeur.</p>
        </div>
        <p className="lede" style={{ fontSize: 17 }}>Four, froid, plonge, caisse, mobilier&nbsp;: l&apos;IA lit chaque ligne, écarte ce qui n&apos;est pas finançable (ici, l&apos;installation) et prépare un dossier propre. Un expert vérifie le montage avant toute présentation.</p>
        <div className="cta-row" style={{ marginTop: 4 }}>
          <Link className="btn btn--primary" href="/auth"><BtnGauge />Déposer mon devis</Link>
        </div>
        <div className="assur">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          Aucune carte ni RIB demandé.
        </div>
      </div>
    </div>
  )
}
