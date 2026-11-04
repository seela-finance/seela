'use client'

import { useEffect, useState, type RefObject } from 'react'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Vrai une fois l'élément apparu (IntersectionObserver, seuil 0,18, une seule
// fois). Sans IntersectionObserver ou en reduced-motion : vrai immédiatement,
// pour sauter à l'état final.
export function useInView<T extends Element>(ref: RefObject<T | null>, threshold = 0.18): boolean {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      const raf = requestAnimationFrame(() => setInView(true))
      return () => cancelAnimationFrame(raf)
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            setInView(true)
            io.disconnect()
          }
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, threshold])
  return inView
}
