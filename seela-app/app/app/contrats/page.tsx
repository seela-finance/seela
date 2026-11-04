import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import RequestsTable from '@/components/RequestsTable'
import { REQUESTS_TABLE_HEADERS } from '@/components/requests-table-headers'
import TopActions from '@/components/TopActions'
import { requestStatusesIn } from '@/lib/status'

export default async function ContratsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: requests } = await supabase
    .from('financing_requests')
    .select('*, supplier_name, document_number, offers(monthly_payment, selected, leaser_name, duration_months), line_items(description, selected, quantity)')
    .eq('user_id', user.id)
    .in('status', requestStatusesIn('contrats'))
    .order('created_at', { ascending: false })

  const allRequests = requests ?? []

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <Sidebar />
      <main style={{ marginLeft: 220 }}>
        {/* Top nav */}
        <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Contrats</span>
          <TopActions />
        </div>

        <div className="px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="ev-display mb-0.5" style={{ fontSize: 24, color: 'var(--ink)' }}>
                Mes contrats
              </h1>
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                {allRequests.length} contrat{allRequests.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/app/nouveau"
              className="ev-btn ev-btn--primary"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Nouveau financement
            </Link>
          </div>

          {allRequests.length === 0 ? (
            <div className="ev-card ev-card--dashed text-center py-16">
              <p className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>Aucun contrat actif pour l&apos;instant.</p>
              <Link
                href="/app/nouveau"
                className="ev-btn ev-btn--primary"
              >
                Créer ma première demande
              </Link>
            </div>
          ) : (
            <div className="ev-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
                    {REQUESTS_TABLE_HEADERS.map((h, i) => (
                      <th
                        key={i}
                        className="ev-kicker px-4 py-3 text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <RequestsTable requests={allRequests} />
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
