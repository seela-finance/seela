import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCapability } from '@/lib/admin'
import { isUuid } from '@/lib/admin-request-detail'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLifecycleStage, LIFECYCLE_LABEL } from '@/lib/crm-companies'
import { eur, fmtDate } from '@/components/admin/ui'

type Company = {
  id: string; name: string; siren: string | null; domain: string | null; lifecycle_stage: string; sector: string | null
  legal_form: string | null; naf_code: string | null; creation_year: number | null; headcount_bracket: string | null
  revenue_declared: number | null; source: string | null; signal: string | null; website: string | null; owner_id: string | null
  seela_score: number | null; seela_score_grade: string | null; created_at: string
}
type Contact = { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; job_title: string | null; user_id: string | null }
type Request = { id: string; status: string | null; total_amount: number | null; duration_months: number | null; created_at: string }

const STAGE_TAG: Record<string, string> = { prospect: 'ev-tag', client: 'ev-tag ev-tag--ok', partenaire: 'ev-tag ev-tag--accent', exclu: 'ev-tag ev-tag--danger' }

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="ev-card px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="ev-kicker">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export default async function CrmCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability('crm')
  const { id } = await params
  if (!isUuid(id)) notFound()

  const db = createAdminClient()
  const [companyRes, contactsRes, requestsRes, adminsRes] = await Promise.all([
    db.from('companies').select('*').eq('id', id).maybeSingle(),
    db.from('contacts').select('id, first_name, last_name, email, phone, job_title, user_id').eq('company_id', id).order('created_at'),
    db.from('financing_requests').select('id, status, total_amount, duration_months, created_at').eq('company_id', id).order('created_at', { ascending: false }),
    db.from('admins').select('user_id, name'),
  ])
  const c = companyRes.data as Company | null
  if (!c) notFound()
  const contacts = (contactsRes.data ?? []) as Contact[]
  const requests = (requestsRes.data ?? []) as Request[]
  const owner = ((adminsRes.data ?? []) as { user_id: string; name: string }[]).find(a => a.user_id === c.owner_id)?.name
  const stage = isLifecycleStage(c.lifecycle_stage) ? c.lifecycle_stage : 'prospect'

  const props: [string, React.ReactNode][] = [
    ['SIREN', c.siren ? <span className="ev-mono">{c.siren}</span> : null],
    ['Domaine', c.domain],
    ['Secteur', c.sector],
    ['Forme juridique', c.legal_form],
    ['Code NAF', c.naf_code],
    ['Création', c.creation_year],
    ['Effectif', c.headcount_bracket],
    ['CA déclaré', c.revenue_declared != null ? eur(Number(c.revenue_declared)) : null],
    ['Source', c.source],
    ['Signal', c.signal],
    ['Propriétaire', owner],
    ['Créée le', fmtDate(c.created_at)],
  ]

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink-3)' }}>
        <Link href="/admin/crm/societes" className="hover:underline">Sociétés</Link>
        <span className="mx-2">›</span>
        <span style={{ color: 'var(--ink)' }}>{c.name}</span>
      </div>

      <div className="px-6 py-5 flex flex-wrap gap-4 items-start">
        <div className="flex flex-col gap-4" style={{ flex: '1 1 280px', maxWidth: 340 }}>
          <section className="ev-card p-5 flex flex-col gap-3">
            <h1 className="ev-display text-2xl">{c.name}</h1>
            {c.domain && <p className="text-sm -mt-2" style={{ color: 'var(--ink-3)' }}>{c.domain}</p>}
            <div className="flex flex-wrap gap-1.5">
              <span className={STAGE_TAG[stage]}>{LIFECYCLE_LABEL[stage]}</span>
              {c.seela_score_grade && <span className="ev-tag">Score {c.seela_score_grade} · {c.seela_score}</span>}
            </div>
          </section>
          <Card title="À propos de cette société">
            <dl className="divide-y divide-[var(--line)]">
              {props.map(([k, v]) => (
                <div key={k} className="py-2 flex justify-between gap-3 text-sm">
                  <dt style={{ color: 'var(--ink-3)' }}>{k}</dt>
                  <dd className="text-right" style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div className="flex flex-col gap-4 min-w-0" style={{ flex: '2 1 420px' }}>
          <Card title="Chronologie">
            <p className="py-6 text-sm text-center" style={{ color: 'var(--ink-3)' }}>Les appels, notes et tâches arrivent à la prochaine étape.</p>
          </Card>
        </div>

        <div className="flex flex-col gap-4" style={{ flex: '1 1 280px', maxWidth: 340 }}>
          <Card title={`Contacts (${contacts.length})`}>
            {contacts.length === 0 && <p className="text-sm py-2" style={{ color: 'var(--ink-3)' }}>Aucun contact.</p>}
            <ul className="divide-y divide-[var(--line)]">
              {contacts.map(p => (
                <li key={p.id} className="py-2.5 text-sm">
                  <span className="flex justify-between gap-2">
                    <span className="font-medium" style={{ color: 'var(--ink)' }}>{[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Sans nom'}</span>
                    {p.user_id && <span className="ev-tag ev-tag--accent">Accès app</span>}
                  </span>
                  <span className="block" style={{ color: 'var(--ink-3)' }}>{[p.job_title, p.phone ?? p.email].filter(Boolean).join(' · ') || '—'}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={`Dossiers (${requests.length})`}>
            {requests.length === 0 && <p className="text-sm py-2" style={{ color: 'var(--ink-3)' }}>Aucun dossier.</p>}
            <ul className="divide-y divide-[var(--line)]">
              {requests.map(r => (
                <li key={r.id} className="py-2.5 text-sm">
                  <Link href={`/admin/dossiers/${r.id}`} className="flex justify-between gap-2 hover:underline" style={{ color: 'var(--ink)' }}>
                    <span>{fmtDate(r.created_at)}</span>
                    <span className="ev-tag">{r.status ?? '—'}</span>
                  </Link>
                  <span className="block ev-mono" style={{ color: 'var(--ink-3)' }}>
                    {r.total_amount != null ? eur(Number(r.total_amount)) : '—'}{r.duration_months ? ` · ${r.duration_months} mois` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
