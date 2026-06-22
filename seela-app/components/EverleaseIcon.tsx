// Everlease brand mark — the arch icon on a near-black rounded square.
// Geometry from the official brand export (Logos everlease / "Icône _ app").
export default function EverleaseIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="8 26 104 104" fill="none" aria-hidden="true">
      <rect x="8" y="26" width="104" height="104" rx="24" fill="#0E0E0C" />
      <path
        d="M16 100 A44 44 0 0 1 104 100 L67.86 100 L78.29 86.72 Q82 82 77.15 78.47 L64.85 69.53 Q60 66 55.15 69.53 L42.85 78.47 Q38 82 41.71 86.72 L52.14 100 Z"
        fill="#FAFAF9"
      />
    </svg>
  )
}
