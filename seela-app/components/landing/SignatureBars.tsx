'use client'

// Signature « Du montant au loyer » : une dalle d'encre (336² ; 168² sur
// mobile) se découpe en 48 barres mensuelles de même aire, pendant que la
// jauge se remplit et que le chiffre descend de 41 274 € à 982 €.
// Desktop : section de 240 vh avec bloc sticky, progression = scroll relatif
// (jamais de scroll-jacking). Mobile (< 900 px) : pas de sticky, tween de
// 1,9 s déclenché à l'apparition, une seule fois. prefers-reduced-motion :
// état final immédiat. Seuls transform et opacity varient sur les tranches.
import React from 'react'
import { Gauge } from './Gauge'
import { fmt, clamp, easeOut } from './format'
import { useInView, prefersReducedMotion } from './useInView'

const AMOUNT = 41274
const RENT = 982
const MONTHS = 48
const MOBILE_BP = 900

export default function SignatureBars() {
  const ref = React.useRef<HTMLElement>(null)
  const [p, setP] = React.useState(0)
  const [mobile, setMobile] = React.useState(false)
  const played = React.useRef(false)
  const inView = useInView(ref)

  // Desktop : progression pilotée par le scroll (rAF).
  React.useEffect(() => {
    if (prefersReducedMotion()) {
      played.current = true
      const r = requestAnimationFrame(() => setP(1))
      return () => cancelAnimationFrame(r)
    }
    const isMobile = () => window.innerWidth < MOBILE_BP
    let raf = 0
    const update = () => {
      raf = 0
      const el = ref.current
      if (!el || isMobile()) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const total = r.height - vh
      const next = total > 40 ? clamp(-r.top / total) : clamp((vh - r.top) / (vh + r.height))
      setP((prev) => (Math.abs(next - prev) > 0.003 ? next : prev))
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const onResize = () => {
      setMobile(isMobile())
      schedule()
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    const first = requestAnimationFrame(onResize)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(first)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Mobile : tween de 1 900 ms (ease-out) à l'apparition, une fois.
  React.useEffect(() => {
    if (!inView || !mobile || played.current) return
    played.current = true
    const t0 = performance.now()
    const d = 1900
    let raf = 0
    const step = (t: number) => {
      const x = clamp((t - t0) / d)
      setP(easeOut(x))
      if (x < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, mobile])

  const ep = easeOut(p)
  const amount = AMOUNT - (AMOUNT - RENT) * ep
  const S = mobile ? 168 : 336
  const bw = mobile ? 5 : 14
  const gap = mobile ? 2 : 6
  const W = MONTHS * bw + (MONTHS - 1) * gap
  const hs = S / MONTHS
  const bh = (S * S) / (MONTHS * bw)
  const x0 = (W - S) / 2

  const slices: React.CSSProperties[] = []
  for (let i = 0; i < MONTHS; i++) {
    const start = 0.08 + (i / MONTHS) * 0.64
    const t = easeOut(clamp((p - start) / 0.28))
    const dx = (i * (bw + gap) - x0) * t
    const dy = (S - (i + 1) * hs) * t
    const sx = 1 + (bw / S - 1) * t
    const sy = 1 + (bh / hs - 1) * t
    slices.push({
      left: x0,
      top: Number((i * hs).toFixed(2)),
      width: S,
      height: Number(hs.toFixed(3)),
      transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`,
      background: i % 12 === 0 ? 'var(--accent)' : 'var(--ink)',
    })
  }

  const unit = p < 0.55 ? 'le montant du devis, en une fois' : 'par mois, pendant 48 mois'
  const st = (on: boolean) => (on ? 'on' : undefined)

  return (
    <section id="sig" className="sig" aria-label="Du montant au loyer" ref={ref}>
      <div className="sig__pin">
        <div className="wrap sig__wrap">
          <div className="kicker">Du montant au loyer</div>
          <h2 className="display h2 sig__title">Une dépense en une fois devient 48&nbsp;loyers réguliers.</h2>
          <div className="sig__numrow">
            <Gauge value={ep} />
            <div className="sig__num" aria-live="off">
              <span>{fmt(amount)}&nbsp;€</span>
              <small>{unit}</small>
            </div>
          </div>
          <div
            className="sig__stage"
            role="img"
            aria-label="Une barre massive de 41 274 euros se découpe en 48 barres mensuelles de 982 euros"
            style={{ width: W, height: S }}
          >
            {slices.map((style, i) => (
              <div key={i} className="slice" style={style} />
            ))}
            <div className="bars__axis" aria-hidden="true" />
            <div className="months" aria-hidden="true">
              <span>M01</span><span>M12</span><span>M24</span><span>M36</span><span>M48</span>
            </div>
          </div>
          <ol className="sig__steps">
            <li className={st(p < 0.3)}>
              <span className="n">01 · Le montant</span>
              <b>Un devis de 41&nbsp;274 €</b>
              <span className="t">Un seul montant, que vous ne payez pas en une fois.</span>
            </li>
            <li className={st(p >= 0.3 && p < 0.78)}>
              <span className="n">02 · La découpe</span>
              <b>everlease prépare le dossier</b>
              <span className="t">Le montant est découpé en loyers, puis présenté aux financeurs adaptés.</span>
            </li>
            <li className={st(p >= 0.78)}>
              <span className="n">03 · Le rythme</span>
              <b>48 loyers de 982 € / mois</b>
              <span className="t">Un flux régulier, aligné sur votre activité.</span>
            </li>
          </ol>
          <p className="legal sig__legal">Exemple illustratif sur 48 mois, hors assurance et services. Sous réserve d&apos;acceptation du dossier par le financeur.</p>
        </div>
      </div>
    </section>
  )
}
