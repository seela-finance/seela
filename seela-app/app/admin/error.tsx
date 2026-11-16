'use client'

// Erreur serveur dans le back-office : message lisible et référence à transmettre (logs Vercel).
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-6 py-10 max-w-xl">
      <h1 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Cette page n&apos;a pas pu se charger</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
        Une erreur serveur est survenue. Réessayez ; si elle persiste, transmettez la référence ci-dessous.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs" style={{ color: 'var(--ink-3)' }}>Référence : <span className="ev-mono">{error.digest}</span></p>
      )}
      <button
        type="button"
        onClick={reset}
        className="ev-btn ev-btn--ghost mt-4"
      >
        Réessayer
      </button>
    </div>
  )
}
