'use client'

// Image slot for the sector pages. Renders a real <img> when a source is set,
// and falls back to a styled placeholder (alt + sourcing hint) if no source is
// given OR the image fails to load (file not added yet). This lets us ship the
// expected src paths now and have stock photos appear automatically once the
// matching files are dropped into /public/secteurs — no code change needed.
//
// The <img> (with alt) is present in the SSR HTML, so SEO sees it; the error
// fallback only swaps to the placeholder client-side.
import React from 'react'
import type { Photo } from '@/lib/seo/sectors'

function IconImage({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5L5 20" />
    </svg>
  )
}

export default function ImageSlot({
  photo,
  src,
  ratio = '16 / 9',
  rounded = true,
}: {
  photo: Photo
  /** Expected image path; overrides photo.src. Falls back to placeholder on error. */
  src?: string
  ratio?: string
  rounded?: boolean
}) {
  const [failed, setFailed] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)
  const effectiveSrc = src ?? photo.src

  // Catch images that already errored before hydration (the onError handler
  // isn't attached yet during the initial paint) — otherwise a missing file
  // would leave a broken <img> instead of the placeholder.
  React.useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setFailed(true)
  }, [])

  if (effectiveSrc && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={effectiveSrc}
        alt={photo.alt}
        onError={() => setFailed(true)}
        className={`mk-img${rounded ? ' mk-img--rounded' : ''}`}
        style={{ aspectRatio: ratio, width: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }

  return (
    <div
      className={`mk-imgslot${rounded ? ' mk-imgslot--rounded' : ''}`}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={photo.alt}
    >
      <div className="mk-imgslot__inner">
        <span className="mk-imgslot__ic"><IconImage /></span>
        <span className="mk-imgslot__alt">{photo.alt}</span>
        <span className="mk-imgslot__hint">{photo.hint}</span>
      </div>
    </div>
  )
}
