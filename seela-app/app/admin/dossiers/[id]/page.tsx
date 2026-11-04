import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { documentPath, signedDocumentUrl } from '@/lib/documents'
import { OS, RS, canTransitionOffer, canTransitionRequest, offerStatusInfo, requestStatusInfo } from '@/lib/status'
import { formatRate } from '@/lib/offers'
import { requestLabel } from '@/lib/request-label'
import {
  buildTimeline,
  documentPreviewKind,
  isUuid,
  type DetailAdminEvent,
  type DetailOffer,
} from '@/lib/admin-request-detail'
import { leaserValidationEmail, WorkflowError, type OfferContext } from '@/lib/admin-workflow'
import RequestActions from '@/components/admin/RequestActions'
import { AlertBanner, Badge, Breadcrumb, Field, Section, eur, fmtDate, fmtDateTime } from '@/components/admin/ui'
import { fetchRegistry } from '@/lib/company-registry'
import { companyAlert } from '@/lib/admin-company'

type LineItem = {
  id: string
  description: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  category: string | null
  selected: boolean | null
}

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()

  if (!isServiceRoleConfigured()) {
    return (
      <p className="ev-alert ev-alert--danger m-6">
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

  // Société cessée au registre : bandeau rouge (même règle que la fiche société)
  const registry = await fetchRegistry(profile?.siren)
  const alert = companyAlert(registry.status === 'ok' ? registry.company : null)

  const docPath = documentPath(request.document_url, request.user_id)
  const docUrl = await signedDocumentUrl(db, request.document_url, request.user_id, 3600)
  const previewKind = documentPreviewKind(docPath)
  const timeline = buildTimeline(request, offers, events)
  const ref = requestLabel(request)

  // Actions possibles, d'après les statuts (mêmes règles que les Server Actions)
  const selected = offers.find(o => o.selected) ?? null
  const canValidate = !!selected && canTransitionOffer(selected.status ?? '', OS.seela_validated, 'admin')
    && canTransitionRequest(request.status, RS.seela_validated, 'admin')
  const awaitingLeaser = !!selected && selected.status === OS.seela_validated && request.status === RS.seela_validated
  const canRefuse = canTransitionRequest(request.status, RS.refused, 'admin')

  // Aperçu de l'email au leaser, construit par la même fonction que l'envoi
  let leaserPreview: { to: string; cc?: string; subject: string; html: string } | { error: string } | null = null
  if (canValidate && selected) {
    const { data: leaser } = await db.from('leasers').select('referent_email, referent_name').eq('name', selected.leaser_name ?? '').maybeSingle()
    const ctx: OfferContext = {
      offer: {
        id: selected.id,
        request_id: request.id,
        leaser_name: selected.leaser_name ?? '',
        monthly_payment: selected.monthly_payment ?? 0,
        duration_months: selected.duration_months ?? 0,
        status: selected.status ?? '',
      },
      request: { ...request, line_items: lines },
      profile: profile ? { company_name: profile.company_name, siren: profile.siren, email: profile.email } : null,
      leaser,
    }
    try {
      leaserPreview = leaserValidationEmail(ctx, docUrl ? '#lien-signe-7-jours-genere-a-l-envoi' : '', '', admin.email)
    } catch (err) {
      leaserPreview = { error: err instanceof WorkflowError ? err.message : 'Aperçu indisponible.' }
    }
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dossiers', href: '/admin' }, { label: ref, mono: true }]} />

      <div className="px-6 py-6 max-w-6xl space-y-4">
        {alert && <AlertBanner>{alert}</AlertBanner>}

        {/* En-tête */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="ev-display text-xl" style={{ color: 'var(--ink)' }}>
            <Link href={`/admin/societes/${request.user_id}`} className="underline-offset-4 hover:underline">
              {profile?.company_name?.trim() || 'Société sans nom'}
            </Link>
          </h1>
          <Badge info={requestStatusInfo(request.status)} />
        </div>

        <Section title="Dossier">
          <dl className="px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Référence" value={<span className="ev-mono">{ref}</span>} />
            <Field label="SIREN" value={profile?.siren ? <span className="ev-mono">{profile.siren}</span> : null} />
            <Field label="Contact" value={contactName} />
            <Field label="Email / téléphone" value={[profile?.email, profile?.phone].filter(Boolean).join(' · ') || null} />
            <Field label="Montant HT" value={<span className="ev-mono">{eur(request.total_amount)}</span>} />
            <Field label="Durée" value={request.duration_months ? `${request.duration_months} mois` : null} />
            <Field label="Périodicité" value={request.periodicite} />
            <Field label="Document" value={request.document_type ? request.document_type.charAt(0).toUpperCase() + request.document_type.slice(1) : null} />
            <Field label="Créé le" value={fmtDate(request.created_at)} />
          </dl>
          {request.notes?.trim() && (
            <div className="px-4 pb-4">
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Remarques du client</p>
              <p className="mt-0.5 text-sm whitespace-pre-line" style={{ color: 'var(--ink)' }}>{request.notes}</p>
            </div>
          )}
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Document d'origine */}
          <Section
            title="Document d'origine"
            right={docUrl && (
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--ink)' }}>
                Ouvrir / télécharger
              </a>
            )}
          >
            {!docUrl ? (
              <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>
                {request.document_url ? 'Document introuvable dans le stockage.' : 'Aucun document uploadé.'}
              </p>
            ) : previewKind === 'pdf' ? (
              <iframe src={docUrl} title={`Document ${ref}`} className="w-full" style={{ height: 420, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }} />
            ) : previewKind === 'image' ? (
              // Aperçu d'un fichier privé via lien signé : next/image n'apporte rien ici
              // eslint-disable-next-line @next/next/no-img-element
              <img src={docUrl} alt={`Document ${ref}`} className="w-full max-h-[420px] object-contain" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }} />
            ) : (
              <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Aperçu indisponible pour ce format.</p>
            )}
          </Section>

          {/* Fournisseur */}
          <Section title="Fournisseur (extrait du document)">
            <dl className="px-4 py-4 grid grid-cols-2 gap-4">
              <Field label="Nom" value={request.supplier_name} />
              <Field label="SIREN" value={request.supplier_siren ? <span className="ev-mono">{request.supplier_siren}</span> : null} />
              <Field label="Adresse" value={request.supplier_address} />
              <Field label="N° de document" value={request.document_number} />
              <Field label="Date du document" value={fmtDate(request.document_date)} />
            </dl>
          </Section>
        </div>

        {/* Lignes */}
        <Section title="Lignes extraites" right={<span className="text-xs" style={{ color: 'var(--ink-3)' }}>Total sélectionné : <span className="ev-mono">{eur(selectedTotal, 2)}</span></span>}>
          {lines.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Aucune ligne extraite.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Financée', 'Description', 'Catégorie', 'Qté', 'PU HT', 'Total HT'].map(h => (
                      <th key={h} className="ev-kicker px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--line)', opacity: l.selected ? 1 : 0.5 }}>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>{l.selected ? 'Oui' : 'Non'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>{l.description ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink-3)' }}>{l.category ?? '—'}</td>
                      <td className="ev-mono px-4 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>{l.quantity ?? '—'}</td>
                      <td className="ev-mono px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>{eur(l.unit_price, 2)}</td>
                      <td className="ev-mono px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>{eur(l.total_price, 2)}</td>
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
            <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>
              {request.status === RS.no_match ? 'Aucune offre — matching sans résultat.' : 'Aucune offre.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Leaser', 'Loyer HT', 'Durée', 'Taux', 'Statut', 'Choisie', 'Confirmée client', 'Validée', 'Confirmée leaser'].map(h => (
                      <th key={h} className="ev-kicker px-4 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offers.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>
                        {o.leaser_name ?? '—'}
                        {o.notes && <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>{o.notes}</span>}
                      </td>
                      <td className="ev-mono px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>{eur(o.monthly_payment, 2)}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{o.duration_months ? `${o.duration_months} mois` : '—'}</td>
                      <td className="ev-mono px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{formatRate(o.rate) ?? '—'}</td>
                      <td className="px-4 py-2.5"><Badge info={offerStatusInfo(o.status)} /></td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>{o.selected ? 'Oui' : '—'}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDate(o.confirmed_at)}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDate(o.seela_validated_at)}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDate(o.leaser_confirmed_at)}</td>
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
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--line-strong)' }} />
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>
                      {t.label}
                      {t.detail && <span style={{ color: 'var(--ink-3)' }}> · {t.detail}</span>}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                      {fmtDateTime(t.at)}{t.author ? ` · ${t.author}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="px-4 pb-4 text-xs" style={{ color: 'var(--ink-3)' }}>
              Les emails envoyés depuis le back-office sont journalisés ici ; la date de soumission n&apos;est pas encore enregistrée.
            </p>
          </Section>

          {/* Actions : valider et transmettre, réponse du leaser, refus */}
          <Section title="Actions">
            <RequestActions
              requestId={request.id}
              canValidate={canValidate}
              awaitingLeaser={awaitingLeaser}
              canRefuse={canRefuse}
              offer={selected ? { id: selected.id, leaserName: selected.leaser_name ?? 'le leaser' } : null}
              leaserPreview={leaserPreview}
            />
          </Section>
        </div>
      </div>
    </div>
  )
}
