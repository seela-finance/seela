import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import RequestsTable from '@/components/RequestsTable'
import TopActions from '@/components/TopActions'

export default async function ContratsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: requests } = await supabase
    .from('financing_requests')
    .select('*, supplier_name, document_number, offers(monthly_payment, selected, leaser_name, duration_months), line_items(description, selected, quantity)')
    .eq('user_id', user.id)
    .in('status', ['leaser_confirmed', 'active'])
    .order('created_at', { ascending: false })

  const allRequests = requests ?? []

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF9' }}>
      <Sidebar />
      <main style={{ marginLeft: 220 }}>
        {/* Top nav */}
        <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
          <span className="text-sm font-medium" style={{ color: '#1A1A18' }}>Contrats</span>
          <TopActions />
        </div>

        <div className="px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-semibold mb-0.5" style={{ fontSize: 24, color: '#1A1A18', letterSpacing: '-0.4px' }}>
                Mes contrats
              </h1>
              <p className="text-sm" style={{ color: '#9A9A93' }}>
                {allRequests.length} contrat{allRequests.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/nouveau"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#4F46E5', color: '#fff', borderRadius: 8 }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Nouveau financement
            </Link>
          </div>

          {allRequests.length === 0 ? (
            <div
              className="text-center py-16 rounded-xl border border-dashed"
              style={{ borderColor: '#E5E5E3' }}
            >
              <p className="text-sm mb-4" style={{ color: '#9A9A93' }}>Aucun contrat actif pour l&apos;instant.</p>
              <Link
                href="/nouveau"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#1A1A18', color: '#FAFAF9', borderRadius: 8 }}
              >
                Créer ma première demande
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E5E3', borderRadius: 12 }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #E5E5E3' }}>
                    {['Référence', 'Actif financé', 'Leaser', 'Mensualité', 'Échéances', 'Prochaine', 'Statut'].map((h, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left"
                        style={{ fontSize: 11, fontWeight: 500, color: '#9A9A93', textTransform: 'uppercase', letterSpacing: '0.06em' }}
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
