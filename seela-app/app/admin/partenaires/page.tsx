import Link from 'next/link'
import { requireCapability } from '@/lib/admin'
import { can } from '@/lib/admin-roles'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { summarizePartners, type PartnerCompanyRow, type PartnerContactRow, type PartnerRequestStat, type PartnerSummary } from '@/lib/partner-admin'
import { eur, fmtDate, Section } from '@/components/admin/ui'

const HEADERS = ['Partenaire', 'Comptes', 'Dossiers', 'En attente du client', 'Contrats actifs', 'Volume en cours', 'Financé', 'Dernier dossier']

// Distributeurs partenaires (parcours distributeur) : activés depuis la fiche société du CRM.
export default async function AdminPartenairesPage() {
  const admin = await requireCapability('view')
  if (!isServiceRoleConfigured()) return <p className="ev-alert ev-alert--danger m-6">{SERVICE_ROLE_MISSING_MESSAGE}</p>

  let partners: PartnerSummary[] = []
  let failed = false
  try {
    const db = createAdminClient()
    const { data: companies, error } = await db.from('companies').select('id, name, siren, created_at').eq('partner_enabled', true)
    if (error) throw error
    const ids = (companies ?? []).map(c => c.id as string)
    const [{ data: requests, error: rErr }, { data: contacts, error: cErr }] = ids.length
      ? await Promise.all([
          db.from('financing_requests').select('partner_company_id, status, total_amount, client_joined_at, created_at').in('partner_company_id', ids),
          db.from('contacts').select('company_id, user_id').in('company_id', ids),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]
    if (rErr || cErr) throw rErr ?? cErr
    partners = summarizePartners(
      (companies ?? []) as PartnerCompanyRow[],
      (requests ?? []) as PartnerRequestStat[],
      (contacts ?? []) as PartnerContactRow[],
    )
  } catch (err) {
    console.error('[admin] partenaires', err)
    failed = true
  }
  const linkToCrm = can(admin.role, 'crm')

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Partenaires</span>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-4">
        {failed && <p className="ev-alert ev-alert--danger">Impossible de charger les partenaires. Rechargez la page.</p>}
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
          Distributeurs qui montent les dossiers de leurs clients. Pour en ajouter un : fiche société du CRM, carte « Partenaire distributeur ».
        </p>

        <Section title={`Partenaires (${partners.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {HEADERS.map(h => <th key={h} className="ev-kicker px-4 py-2 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="px-4 py-3 text-sm font-medium">
                      {linkToCrm
                        ? <Link href={`/admin/crm/societes/${p.id}`} className="underline-offset-2 hover:underline" style={{ color: 'var(--ink)' }}>{p.name}</Link>
                        : <span style={{ color: 'var(--ink)' }}>{p.name}</span>}
                      {p.siren && <span className="ev-mono block text-xs font-normal" style={{ color: 'var(--ink-3)' }}>{p.siren}</span>}
                    </td>
                    <td className="ev-mono px-4 py-3 text-sm">{p.accounts}</td>
                    <td className="ev-mono px-4 py-3 text-sm">{p.requests}</td>
                    <td className="px-4 py-3 text-sm">
                      {p.awaitingClient > 0 ? <span className="ev-tag ev-tag--accent">{p.awaitingClient}</span> : <span className="ev-mono" style={{ color: 'var(--ink-3)' }}>0</span>}
                    </td>
                    <td className="ev-mono px-4 py-3 text-sm">{p.activeContracts}</td>
                    <td className="ev-mono px-4 py-3 text-sm whitespace-nowrap">{eur(p.volume)}</td>
                    <td className="ev-mono px-4 py-3 text-sm whitespace-nowrap">{eur(p.financed)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>{p.lastRequestAt ? fmtDate(p.lastRequestAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {partners.length === 0 && !failed && (
              <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
                Aucun partenaire activé. Ouvrez la fiche d’une société dans le CRM et cliquez sur « Activer comme partenaire ».
              </p>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
