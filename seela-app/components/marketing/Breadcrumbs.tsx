// Visible breadcrumb trail. Pair with breadcrumbSchema() for the JSON-LD.
import Link from 'next/link'

export default function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mk-crumbs">
      {items.map((it, i) => {
        const last = i === items.length - 1
        return (
          <span key={i} className="mk-crumbs__seg">
            {it.path && !last ? (
              <Link href={it.path} className="mk-crumbs__link">{it.name}</Link>
            ) : (
              <span aria-current={last ? 'page' : undefined} className="mk-crumbs__current">{it.name}</span>
            )}
            {!last && <span className="mk-crumbs__sep">/</span>}
          </span>
        )
      })}
    </nav>
  )
}
