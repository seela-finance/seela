'use client'

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'

// Menu latéral fixe à partir de 768 px ; en dessous, barre du haut et menu coulissant.
// Le contenu principal se place avec la classe `.app-main` (globals.css).
export default function ResponsiveNav({ brand, children }: { brand: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Choisir un lien referme le menu
  function closeOnLink(e: MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest('a')) setOpen(false)
  }

  return (
    <>
      <div
        className="md:hidden fixed top-0 inset-x-0 h-12 z-30 flex items-center justify-between pl-4 pr-2"
        style={{ background: '#fff', borderBottom: '1px solid #E5E5E3' }}
      >
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          className="w-10 h-10 flex items-center justify-center rounded-lg"
          style={{ color: '#0E0E0C' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(14, 14, 12, 0.4)' }}
        />
      )}

      <aside
        onClick={closeOnLink}
        className={`fixed left-0 top-0 h-dvh flex flex-col z-50 transition-transform md:visible md:translate-x-0 ${open ? 'translate-x-0' : 'invisible -translate-x-full'}`}
        style={{ width: 220, background: '#FFFFFF', borderRight: '1px solid #E5E5E3' }}
      >
        {children}
      </aside>
    </>
  )
}
