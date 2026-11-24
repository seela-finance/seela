import Link from 'next/link'
import { redirect } from 'next/navigation'
import TopActions from '@/components/TopActions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPartnerContext, loadPartnerRequests } from '@/lib/partner-store'
import { partnerLine, type PartnerLine } from '@/lib/partner-workflow'
import { requestLabel } from '@/lib/request-label'
import ResendInvitation from './ResendInvitation'

const EUR = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const DATE = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

function tagClass(line: PartnerLine) {
  if (line.statusLabel === 'Contrat actif') return 'ev-tag ev-tag--ok'
  if (line.statusLabel === 'Refusé') return 'ev-tag ev-tag--danger'
  if (line.awaitingClient) return 'ev-tag ev-tag--accent'
  return 'ev-tag'
}

// Espace du distributeur partenaire : les dossiers montés pour ses clients, leur avancement, le loyer et la fin du contrat.
// Lecture côté serveur (service role), limitée aux dossiers apportés par sa société et à ces colonnes.
export default async function PartenairePage({ searchParams }: { searchParams: Promise<{ envoye?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const db = createAdminClient()
  const partner = await loadPartnerContext(db, user.id)
  if (!partner?.partnerEnabled) redirect('/app/dashboard')

  const lines = (await loadPartnerRequests(db, partner.companyId)).map(partnerLine)
  const { envoye } = await searchParams
  const sent = envoye ? lines.find(l => l.id === envoye) : null
  const active = lines.filter(l => l.statusLabel === 'Contrat actif')

  return (
    <div>
      <div className="h-12 flex items-center px-4 sm:px-6 border-b whitespace-nowrap overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Mes clients</span>
        <TopActions />
      </div>

      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="ev-kicker mb-1">{partner.companyName} · partenaire everlease</p>
            <h1 className="ev-display" style={{ fontSize: 24, color: 'var(--ink)' }}>Mes clients</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
              {lines.length} dossier{lines.length !== 1 ? 's' : ''} · {active.length} contrat{active.length !== 1 ? 's' : ''} actif{active.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/app/nouveau" className="ev-btn ev-btn--primary">Nouveau dossier client</Link>
        </div>

        {sent && (
          <div role="status" className="ev-alert ev-alert--ok text-sm mb-6">
            Dossier envoyé à {sent.clientName} : votre client a reçu un lien par email pour consulter ses offres et choisir la sienne.
          </div>
        )}

        {lines.length === 0 ? (
          <div className="ev-card ev-card--dashed text-center py-16 px-6">
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>Aucun dossier pour l’instant</p>
            <p className="text-xs mb-5" style={{ color: 'var(--ink-3)' }}>
              Déposez le devis d’un client : everlease calcule les loyers et lui envoie son dossier à confirmer.
            </p>
            <Link href="/app/nouveau" className="ev-btn ev-btn--primary">Monter un premier dossier</Link>
          </div>
        ) : (
          <div className="ev-card divide-y divide-[var(--line)]">
            {lines.map(line => (
              <div key={line.id} className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{line.clientName}</p>
                  <p className="ev-mono text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    {requestLabel({ id: line.id })} · {DATE(line.createdAt)} · {EUR(line.amount)} HT
                  </p>
                </div>
                <div className="sm:w-36">
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{line.monthlyIsIndicative ? 'Loyer dès' : 'Loyer'}</p>
                  <p className="ev-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {line.monthly != null ? `${EUR(line.monthly)} / mois` : '—'}
                  </p>
                  {line.durationMonths != null && <p className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{line.durationMonths} mois</p>}
                </div>
                <div className="sm:w-24">
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Pièces</p>
                  <p className="ev-mono text-sm" style={{ color: line.pieces && line.pieces.done < line.pieces.total ? 'var(--warning)' : 'var(--ink)' }}>
                    {line.pieces ? `${line.pieces.done}/${line.pieces.total}` : '—'}
                  </p>
                </div>
                <div className="sm:w-32">
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Fin du contrat</p>
                  <p className="ev-mono text-sm" style={{ color: 'var(--ink)' }}>{line.contractEnd ? DATE(line.contractEnd) : '—'}</p>
                </div>
                <div className="sm:w-56 flex flex-col items-start gap-1.5">
                  <span className={tagClass(line)}><span className="ev-tag__dot" />{line.statusLabel}</span>
                  {line.awaitingClient && <ResendInvitation requestId={line.id} />}
                </div>
              </div>
            ))}
          </div>
        )}

        {lines.length > 0 && (
          <p className="text-xs mt-4" style={{ color: 'var(--ink-3)' }}>
            Loyers : exemples illustratifs, hors assurance et services. Sous réserve d’acceptation du dossier par le financeur.
          </p>
        )}
      </div>
    </div>
  )
}
