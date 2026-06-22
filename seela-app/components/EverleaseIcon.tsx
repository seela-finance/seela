// Everlease brand mark — the arch icon on a near-black rounded square.
// Geometry from the official brand export (Logos everlease / "Icône _ app").
// The arch is scaled to ~54% of the square and balanced vertically (apex ~43%,
// base ~70%) to match the official app-icon proportions.
export default function EverleaseIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect width="100" height="100" rx="23" fill="#0E0E0C" />
      <path
        transform="translate(13 9) scale(0.61)"
        d="M16 100 A44 44 0 0 1 104 100 L67.86 100 L78.29 86.72 Q82 82 77.15 78.47 L64.85 69.53 Q60 66 55.15 69.53 L42.85 78.47 Q38 82 41.71 86.72 L52.14 100 Z"
        fill="#FAFAF9"
      />
    </svg>
  )
}
