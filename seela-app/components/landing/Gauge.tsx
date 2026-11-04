// La jauge est la forme signature : un arc gris `line`, un arc cobalt qui se
// remplit, une aiguille encre qui tourne de -90° à +90°. `value` de 0 à 1.
const ARC = 251.4

export function Gauge({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(1, value))
  const off = (ARC * (1 - v)).toFixed(1)
  const deg = Math.round(-90 + 180 * v)
  return (
    <div className={className ? `gauge ${className}` : 'gauge'} aria-hidden="true">
      <svg viewBox="0 0 200 118">
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#DCDEE1" strokeWidth="12" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#1F3BFF" strokeWidth="12" strokeLinecap="round" style={{ strokeDasharray: ARC, strokeDashoffset: off }} />
        <g style={{ transformOrigin: '100px 100px', transform: `rotate(${deg}deg)` }}>
          <line x1="100" y1="100" x2="100" y2="40" stroke="#141517" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="100" r="9" fill="#141517" />
        </g>
      </svg>
    </div>
  )
}

// Petite jauge (16px) des boutons : l'arc se remplit au survol et au focus
// (CSS `.btn .g .arc`). Blanche sur cobalt et sur encre.
export function BtnGauge() {
  return (
    <svg className="g" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 11.5 A6 6 0 0 1 13.5 11.5" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" />
      <path className="arc" d="M2.5 11.5 A6 6 0 0 1 13.5 11.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
