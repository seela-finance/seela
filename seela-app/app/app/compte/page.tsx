import Link from 'next/link'
import { redirect } from 'next/navigation'
import TopActions from '@/components/TopActions'
import PieceRow from '@/components/PieceRow'
import ContactForm from './ContactForm'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { loadAccount } from '@/lib/account'
import { loadCompanyPieces } from '@/lib/pieces-store'
import { pieceChecklist, pieceProgress, SENSITIVE_RETENTION_DAYS } from '@/lib/pieces'
import { RS } from '@/lib/status'

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ev-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <h2 className="ev-kicker">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

// « Mon compte » (docs/pieces-et-compte.md) : la société (lecture), les pièces à fournir et leur état, les coordonnées.
export default async function ComptePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const account = await loadAccount(supabase, user.id)
  const company = account?.company ?? null
  const db = isServiceRoleConfigured() ? createAdminClient() : null
  const { data: contactRow } = await supabase.from('contacts').select('job_title').eq('user_id', user.id).maybeSingle()
  const jobTitle = (contactRow as { job_title?: string | null } | null)?.job_title ?? ''

  let partner = false
  let dossierRows: ReturnType<typeof pieceChecklist> = []
  let contractRows: ReturnType<typeof pieceChecklist> = []
  let progress = { done: 0, total: 0 }
  if (company && db) {
    const [{ data: row }, docs, { data: requests }] = await Promise.all([
      db.from('companies').select('partner_enabled').eq('id', company.id).maybeSingle(),
      loadCompanyPieces(db, company.id),
      db.from('financing_requests').select('status').eq('company_id', company.id),
    ])
    partner = !!(row as { partner_enabled?: boolean | null } | null)?.partner_enabled
    const statuses = (requests ?? []).map(r => r.status as string)
    // Pièce d'identité et RIB : demandés seulement une fois le financeur d'accord
    const contractPhase = statuses.some(s => s === RS.leaser_confirmed || s === RS.active)
    dossierRows = pieceChecklist(company, docs, 'dossier')
    contractRows = contractPhase ? pieceChecklist(company, docs, 'contrat') : []
    progress = pieceProgress(company, docs, 'dossier')
  }

  return (
    <div>
      <div className="h-12 flex items-center px-4 sm:px-6 border-b whitespace-nowrap overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Mon compte</span>
        <TopActions />
      </div>

      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="ev-display" style={{ fontSize: 24, color: 'var(--ink)' }}>Mon compte</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>Votre société, les pièces de votre dossier et vos coordonnées.</p>
        </div>

        <Card title="Société">
          {company ? (
            <dl className="divide-y divide-[var(--line)]">
              {[
                ['Raison sociale', company.name],
                ['SIREN', company.siren],
                ['Forme juridique', company.legal_form],
                ['Année de création', company.creation_year ? String(company.creation_year) : null],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 sm:px-5 py-2.5 text-sm">
                  <dt style={{ color: 'var(--ink-3)' }}>{k}</dt>
                  <dd className={k === 'SIREN' ? 'ev-mono' : ''} style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v ?? '—'}</dd>
                </div>
              ))}
              <div className="px-4 sm:px-5 py-2.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                Ces informations viennent du registre des entreprises. Une erreur ? Écrivez-nous à contact@everlease.fr.
              </div>
            </dl>
          ) : (
            <div className="px-4 sm:px-5 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>
              Votre société n’est pas encore renseignée. <Link href="/app/onboarding" className="underline" style={{ color: 'var(--ink)' }}>Compléter mon inscription</Link>
            </div>
          )}
        </Card>

        {company && !partner && (
          <Card title="Pièces du dossier" right={progress.total > 0 ? <span className="ev-mono text-xs" style={{ color: 'var(--ink-3)' }}>{progress.done}/{progress.total} validées</span> : null}>
            <p className="px-4 sm:px-5 pt-3 text-xs" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Votre conseiller les vérifie avant de présenter votre dossier aux financeurs. Elles ne sont demandées qu’une fois et servent à tous vos dossiers.
            </p>
            <ul className="divide-y divide-[var(--line)]">
              {dossierRows.map(row => <PieceRow key={row.kind} row={row} userId={user.id} />)}
            </ul>
          </Card>
        )}

        {company && !partner && contractRows.length > 0 && (
          <Card title="Mise en place du contrat">
            <p className="px-4 sm:px-5 pt-3 text-xs" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Le financeur a accepté votre dossier. Ces deux pièces servent à établir le contrat et sont effacées de nos serveurs {SENSITIVE_RETENTION_DAYS} jours après sa mise en place.
            </p>
            <ul className="divide-y divide-[var(--line)]">
              {contractRows.map(row => <PieceRow key={row.kind} row={row} userId={user.id} />)}
            </ul>
          </Card>
        )}

        <Card title="Vos coordonnées">
          <ContactForm
            email={user.email ?? ''}
            initial={{ first_name: account?.firstName ?? '', last_name: account?.lastName ?? '', phone: account?.phone ?? '', role: jobTitle }}
          />
        </Card>
      </div>
    </div>
  )
}
