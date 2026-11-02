'use client'

// Erreur serveur dans le back-office : message lisible et référence à transmettre (logs Vercel).
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-6 py-10 max-w-xl">
      <h1 className="text-base font-semibold" style={{ color: '#0E0E0C' }}>Cette page n&apos;a pas pu se charger</h1>
      <p className="mt-1 text-sm" style={{ color: '#9A9A93' }}>
        Une erreur serveur est survenue. Réessayez ; si elle persiste, transmettez la référence ci-dessous.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs" style={{ color: '#9A9A93', fontVariantNumeric: 'tabular-nums' }}>Référence : {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-4 h-9 px-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
        style={{ background: '#0E0E0C', color: '#fff' }}
      >
        Réessayer
      </button>
    </div>
  )
}
