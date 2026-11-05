import Link from 'next/link'

// La voûte : arche pleine dont le passage est découpé par un losange arrondi
// (design system everlease, inchangé en v2). Toujours en encre ou en papier.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="16 56 88 44" aria-hidden="true">
      <path d="M16 100 A44 44 0 0 1 104 100 L67.86 100 L78.29 86.72 Q82 82 77.15 78.47 L64.85 69.53 Q60 66 55.15 69.53 L42.85 78.47 Q38 82 41.71 86.72 L52.14 100 Z" fill="currentColor" />
    </svg>
  )
}

// Lockup : marque + « everlease » en minuscules, Inter 600, base de l'arche
// sur la ligne de base du texte.
export default function Brand() {
  return (
    <Link className="brand" href="/" aria-label="everlease, accueil">
      <BrandMark className="brand__mark" />
      <span>everlease</span>
    </Link>
  )
}
