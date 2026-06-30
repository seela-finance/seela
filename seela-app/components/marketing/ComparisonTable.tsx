// Comparison matrix across all financing types. Rendered on each solution page
// (with that solution's column highlighted) and on the hub. Strong GEO surface
// + internal linking to sibling pages.
import Link from 'next/link'
import { COMPARISON_DIMENSIONS, COMPARISON_ROWS, getSolution } from '@/lib/seo/solutions'

export default function ComparisonTable({ highlight }: { highlight?: string }) {
  return (
    <div className="mk-table__wrap">
      <table className="mk-table">
        <thead>
          <tr>
            <th scope="col" className="mk-table__rowhead">Critère</th>
            {COMPARISON_DIMENSIONS.map((slug) => {
              const sol = getSolution(slug)!
              const isHi = slug === highlight
              return (
                <th key={slug} scope="col" className={isHi ? 'mk-table__hi' : undefined}>
                  {isHi ? sol.nav.split(' — ')[0] : (
                    <Link href={`/solutions/${slug}`} className="mk-table__collink">{sol.nav.split(' — ')[0]}</Link>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.dimension}>
              <th scope="row" className="mk-table__rowhead">{row.dimension}</th>
              {COMPARISON_DIMENSIONS.map((slug) => (
                <td key={slug} className={slug === highlight ? 'mk-table__hi' : undefined}>
                  {row.values[slug]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
