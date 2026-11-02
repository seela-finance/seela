import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { documentPath, signedDocumentUrl } from '@/lib/documents'
import { RS, offerStatusInfo, requestStatusInfo } from '@/lib/status'
import { formatRate } from '@/lib/offers'
import { requestLabel } from '@/lib/request-label'
import {
  buildTimeline,
  documentPreviewKind,
  isUuid,
  type DetailAdminEvent,
  type DetailOffer,
} from '@/lib/admin-request-detail'

type LineItem = {
  id: string
  description: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  category: string | null
  selected: boolean | null
}

function eur(n: number | null, digits = 0) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: '#E5E5E3' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A9A93' }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs" style={{ color: '#9A9A93' }}>{label}</dt>
      <dd className="mt-0.5 text-sm" style={{ color: '#0E0E0C' }}>{value ?? '—'}</dd>
    </div>
  )
}

function Badge({ info }: { info: { label: string; color: string; bg: string; dot: string } }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: info.bg, color: info.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: info.dot }} />
      {info.label}
    </span>
  )
}

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()

  if (!isServiceRoleConfigured()) {
    return (
      <p className="m-6 text-sm px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#991B1B' }}>
        {SERVICE_ROLE_MISSING_MESSAGE}
      </p>
    )
  }

  // Service role : lecture du dossier de n'importe quel client, après requireAdmin()
  const db = createAdminClient()
  const [{ data: request }, { data: rawEvents }] = await Promise.all([
    db
      .from('financing_requests')
      .select('*, line_items(*), offers(*), profiles(company_name, siren, first_name, last_name, email, phone)')
      .eq('id', id)
      .maybeSingle(),
    db
      .from('admin_events')
      .select('id, admin_id, action, note, created_at')
      .eq('request_id', id)
      .order('created_at'),
  ])
  if (!request) notFound()

  // Nom des admins auteurs des actions du journal
  const adminIds = [...new Set((rawEvents ?? []).map(e => e.admin_id as string))]
  const { data: admins } = adminIds.length
    ? await db.from('admins').select('user_id, name').in('user_id', adminIds)
    : { data: [] as { user_id: string; name: string }[] }
  const adminName = new Map((admins ?? []).map(a => [a.user_id, a.name]))
  const events: DetailAdminEvent[] = (rawEvents ?? []).map(e => ({
    id: e.id,
    action: e.action,
    note: e.note,
    created_at: e.created_at,
    adminName: adminName.get(e.admin_id) ?? null,
  }))

  const offers = ((request.offers ?? []) as DetailOffer[]).sort(
    (a, b) => Number(!!b.selected) - Number(!!a.selected) || (a.monthly_payment ?? 0) - (b.monthly_payment ?? 0),
  )
  const lines = (request.line_items ?? []) as LineItem[]
  const selectedTotal = lines.filter(l => l.selected).reduce((s, l) => s + (l.total_price ?? 0), 0)
  const profile = request.profiles as { company_name: string | null; siren: string | null; first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null
  const contactName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null

  const docPath = documentPath(request.document_url, request.user_id)
  const docUrl = await signedDocumentUrl(db, request.document_url, request.user_id, 3600)
  const previewKind = documentPreviewKind(docPath)
  const timeline = buildTimeline(request, offers, events)
  const ref = requestLabel(request)

  return (
    <div>
      <div className="h-12 flex items-center gap-2 px-6 border-b text-sm" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <Link href="/admin" className="hover:opacity-70" style={{ color: '#9A9A93' }}>Dossiers</Link>
        <span style={{ color: '#D1D1CE' }}>/</span>
        <span className="font-medium" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>{ref}</span>
      </div>

      <div className="px-6 py-6 max-w-6xl space-y-4">
        {/* En-tête */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold" style={{ color: '#0E0E0C', letterSpacing: '-0.02em' }}>
            {profile?.company_name?.trim() || 'Société sans nom'}
          </h1>
          <Badge info={requestStatusInfo(request.status)} />
        </div>

        <Section title="Dossier">
          <dl className="px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Référence" value={ref} />
            <Field label="SIREN" value={profile?.siren} />
            <Field label="Contact" value={contactName} />
            <Field label="Email / téléphone" value={[profile?.email, profile?.phone].filter(Boolean).join(' · ') || null} />
            <Field label="Montant HT" value={eur(request.total_amount)} />
            <Field label="Durée" value={request.duration_months ? `${request.duration_months} mois` : null} />
            <Field label="Périodicité" value={request.periodicite} />
            <Field label="Document" value={request.document_type ? request.document_type.charAt(0).toUpperCase() + request.document_type.slice(1) : null} />
            <Field label="Créé le" value={fmtDate(request.created_at)} />
          </dl>
          {request.notes?.trim() && (
            <div className="px-4 pb-4">
              <p className="text-xs" style={{ color: '#9A9A93' }}>Remarques du client</p>
              <p className="mt-0.5 text-sm whitespace-pre-line" style={{ color: '#0E0E0C' }}>{request.notes}</p>
            </div>
          )}
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Document d'origine */}
          <Section
            title="Document d'origine"
            right={docUrl && (
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:opacity-70" style={{ color: '#0E0E0C' }}>
                Ouvrir / télécharger
              </a>
            )}
          >
            {!docUrl ? (
              <p className="px-4 py-6 text-sm" style={{ color: '#9A9A93' }}>
                {request.document_url ? 'Document introuvable dans le stockage.' : 'Aucun document uploadé.'}
              </p>
            ) : previewKind === 'pdf' ? (
              <iframe src={docUrl} title={`Document ${ref}`} className="w-full rounded-b-xl" style={{ height: 420 }} />
            ) : previewKind === 'image' ? (
              // Aperçu d'un fichier privé via lien signé : next/image n'apporte rien ici
              // eslint-disable-next-line @next/next/no-img-element
              <img src={docUrl} alt={`Document ${ref}`} className="w-full max-h-[420px] object-contain rounded-b-xl" />
            ) : (
              <p className="px-4 py-6 text-sm" style={{ color: '#9A9A93' }}>Aperçu indisponible pour ce format.</p>
            )}
          </Section>

          {/* Fournisseur */}
          <Section title="Fournisseur (extrait du document)">
            <dl className="px-4 py-4 grid grid-cols-2 gap-4">
              <Field label="Nom" value={request.supplier_name} />
              <Field label="SIREN" value={request.supplier_siren} />
              <Field label="Adresse" value={request.supplier_address} />
              <Field label="N° de document" value={request.document_number} />
              <Field label="Date du document" value={fmtDate(request.document_date)} />
            </dl>
          </Section>
        </div>

        {/* Lignes */}
        <Section title="Lignes extraites" right={<span className="text-xs" style={{ color: '#9A9A93' }}>Total sélectionné : {eur(selectedTotal, 2)}</span>}>
          {lines.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: '#9A9A93' }}>Aucune ligne extraite.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E5E3' }}>
                    {['Financée', 'Description', 'Catégorie', 'Qté', 'PU HT', 'Total HT'].map(h => (
                      <th key={h} className="px-4 py-2 text-xs font-medium" style={{ color: '#9A9A93' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #F5F5F4', opacity: l.selected ? 1 : 0.5 }}>
                      <td className="px-4 py-2.5 text-sm" style={{ color: '#0E0E0C' }}>{l.selected ? 'Oui' : 'Non'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: '#0E0E0C' }}>{l.description ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: '#9A9A93' }}>{l.category ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>{l.quantity ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>{eur(l.unit_price, 2)}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>{eur(l.total_price, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Offres */}
        <Section title="Offres">
          {offers.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: '#9A9A93' }}>
              {request.status === RS.no_match ? 'Aucune offre — matching sans résultat.' : 'Aucune offre.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E5E3' }}>
                    {['Leaser', 'Loyer HT', 'Durée', 'Taux', 'Statut', 'Choisie', 'Confirmée client', 'Validée', 'Confirmée leaser'].map(h => (
                      <th key={h} className="px-4 py-2 text-xs font-medium whitespace-nowrap" style={{ color: '#9A9A93' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offers.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #F5F5F4' }}>
                      <td className="px-4 py-2.5 text-sm" style={{ color: '#0E0E0C' }}>
                        {o.leaser_name ?? '—'}
                        {o.notes && <span className="block text-xs" style={{ color: '#9A9A93' }}>{o.notes}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: '#0E0E0C', fontVariantNumeric: 'tabular-nums' }}>{eur(o.monthly_payment, 2)}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }}>{o.duration_months ? `${o.duration_months} mois` : '—'}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }}>{formatRate(o.rate) ?? '—'}</td>
                      <td className="px-4 py-2.5"><Badge info={offerStatusInfo(o.status)} /></td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: '#0E0E0C' }}>{o.selected ? 'Oui' : '—'}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }}>{fmtDate(o.confirmed_at)}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }}>{fmtDate(o.seela_validated_at)}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: '#9A9A93' }}>{fmtDate(o.leaser_confirmed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Historique */}
          <Section title="Historique">
            <ol className="px-4 py-4 space-y-3">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#D1D1CE' }} />
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: '#0E0E0C' }}>
                      {t.label}
                      {t.detail && <span style={{ color: '#9A9A93' }}> · {t.detail}</span>}
                    </p>
                    <p className="text-xs" style={{ color: '#9A9A93' }}>
                      {fmtDateTime(t.at)}{t.author ? ` · ${t.author}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="px-4 pb-4 text-xs" style={{ color: '#9A9A93' }}>
              La date de soumission et les emails envoyés seront journalisés avec les actions admin.
            </p>
          </Section>

          {/* Actions (remplies par les issues suivantes du Lot 3) */}
          <Section title="Actions">
            <p className="px-4 py-6 text-sm" style={{ color: '#9A9A93' }}>
              Valider et transmettre, enregistrer la réponse du leaser, corriger le dossier : bientôt disponible ici.
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}
