import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient, isServiceRoleConfigured, SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/admin'
import { documentPath } from '@/lib/documents'
import { isUuid } from '@/lib/admin-request-detail'
import { requestStatusInfo } from '@/lib/status'
import { requestLabel } from '@/lib/request-label'
import { fetchRegistry } from '@/lib/company-registry'
import {
  DOCUMENT_KIND_LABEL,
  classifyDocuments,
  compareIdentity,
  companyAlert,
  formatBytes,
  scoreBreakdown,
  type CompanyDocument,
  type StoredFile,
} from '@/lib/admin-company'
import { AlertBanner, Badge, Breadcrumb, Field, Section, eur, fmtDate, fmtDateTime } from '@/components/admin/ui'

// Fichiers du dossier storage du client (racine + un niveau de sous-dossiers, ex. bilans/)
async function listClientFiles(db: SupabaseClient, ownerId: string): Promise<StoredFile[]> {
  type Item = { name: string; id: string | null; created_at: string | null; metadata: { size?: number; mimetype?: string } | null }
  const list = async (prefix: string) => {
    const { data } = await db.storage.from('documents').list(prefix, { limit: 1000 })
    return (data ?? []) as Item[]
  }
  const toFile = (prefix: string, i: Item): StoredFile => ({
    path: `${prefix}/${i.name}`,
    size: i.metadata?.size ?? null,
    createdAt: i.created_at,
    mimetype: i.metadata?.mimetype ?? null,
  })

  const root = await list(ownerId)
  const files = root.filter(i => i.id).map(i => toFile(ownerId, i))
  const folders = root.filter(i => !i.id).map(i => `${ownerId}/${i.name}`)
  const nested = await Promise.all(folders.map(async f => (await list(f)).filter(i => i.id).map(i => toFile(f, i))))
  // Fichier fantôme créé par Supabase pour matérialiser un dossier vide
  return [...files, ...nested.flat()].filter(f => !f.path.endsWith('/.emptyFolderPlaceholder'))
}

// Tokens sémantiques uniquement (le cobalt reste réservé à l'action)
const GRADE_COLOR: Record<string, string> = { A: 'var(--ok)', 'B+': 'var(--ok)', B: 'var(--warning)', 'C+': 'var(--warning)', C: 'var(--danger)' }

export default async function AdminCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()

  if (!isServiceRoleConfigured()) {
    return (
      <p className="ev-alert ev-alert--danger m-6">
        {SERVICE_ROLE_MISSING_MESSAGE}
      </p>
    )
  }

  // Service role : lecture de la société de n'importe quel client, après requireAdmin()
  const db = createAdminClient()
  const [{ data: profile }, { data: requestRows }, { data: authData }] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).maybeSingle(),
    db
      .from('financing_requests')
      .select('id, status, total_amount, duration_months, document_url, document_type, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    db.auth.admin.getUserById(id),
  ])
  if (!profile) notFound()

  const requests = requestRows ?? []
  const requestIds = requests.map(r => r.id)
  const [registry, files, { data: rawEvents }] = await Promise.all([
    fetchRegistry(profile.siren),
    listClientFiles(db, id),
    db
      .from('admin_events')
      .select('id, admin_id, request_id, action, note, created_at')
      // ids issus de la base (uuid) : pas d'injection possible dans le filtre
      .or(requestIds.length ? `profile_id.eq.${id},request_id.in.(${requestIds.join(',')})` : `profile_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const registryCompany = registry.status === 'ok' ? registry.company : null
  const alert = companyAlert(registryCompany)
  const identity = compareIdentity(profile, registryCompany)
  const score = scoreBreakdown(profile.seela_score_details)
  const user = authData?.user ?? null
  const contactName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null

  // Documents : liens signés 1 h, générés en une requête
  const documents = classifyDocuments(
    files,
    requests.map(r => ({ id: r.id, document_type: r.document_type, document_path: documentPath(r.document_url, id) })),
  )
  const { data: signed } = documents.length
    ? await db.storage.from('documents').createSignedUrls(documents.map(d => d.path), 3600)
    : { data: [] }
  const signedUrl = new Map((signed ?? []).filter(s => s.signedUrl).map(s => [s.path, s.signedUrl]))
  const documentGroups = (Object.keys(DOCUMENT_KIND_LABEL) as CompanyDocument['kind'][])
    .map(kind => ({ kind, items: documents.filter(d => d.kind === kind) }))
    .filter(g => g.items.length > 0)

  const adminIds = [...new Set((rawEvents ?? []).map(e => e.admin_id as string))]
  const { data: admins } = adminIds.length
    ? await db.from('admins').select('user_id, name').in('user_id', adminIds)
    : { data: [] as { user_id: string; name: string }[] }
  const adminName = new Map((admins ?? []).map(a => [a.user_id, a.name]))
  const refById = new Map(requests.map(r => [r.id, requestLabel(r)]))

  const name = profile.company_name?.trim() || registryCompany?.name || 'Société sans nom'
  const submitted = requests.filter(r => r.status && r.status !== 'draft')

  return (
    <div>
      <Breadcrumb items={[{ label: 'Sociétés', href: '/admin/societes' }, { label: name }]} />

      <div className="px-6 py-6 max-w-6xl space-y-4">
        {alert && <AlertBanner>{alert}</AlertBanner>}

        {/* En-tête */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="ev-display text-xl" style={{ color: 'var(--ink)' }}>{name}</h1>
          {profile.siren && <span className="text-sm" style={{ color: 'var(--ink-3)' }}>SIREN <span className="ev-mono">{profile.siren}</span></span>}
          {registryCompany && (
            <Badge info={registryCompany.active
              ? { label: 'Active au registre', color: 'var(--ok)', bg: 'var(--ok-soft)', dot: 'var(--ok)' }
              : { label: 'Cessée au registre', color: 'var(--danger)', bg: 'var(--danger-soft)', dot: 'var(--danger)' }}
            />
          )}
          {!profile.onboarding_completed && (
            <Badge info={{ label: 'Onboarding incomplet', color: 'var(--warning)', bg: 'var(--warning-soft)', dot: 'var(--warning)' }} />
          )}
        </div>

        {/* Synthèse */}
        <Section title="Synthèse">
          <dl className="px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Dossiers soumis" value={String(submitted.length)} />
            <Field label="Montant total demandé" value={<span className="ev-mono">{eur(submitted.reduce((s, r) => s + (r.total_amount ?? 0), 0))}</span>} />
            <Field
              label="Score Everlease"
              value={profile.seela_score_grade ? (
                <span style={{ color: GRADE_COLOR[profile.seela_score_grade] ?? 'var(--ink)', fontWeight: 600 }}>
                  {profile.seela_score_grade} <span className="ev-mono" style={{ color: 'var(--ink-3)', fontWeight: 400 }}>· {profile.seela_score}/100</span>
                </span>
              ) : null}
            />
            <Field label="Inscrite le" value={fmtDate(user?.created_at ?? profile.created_at)} />
          </dl>
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Contact */}
          <Section title="Contact">
            <dl className="px-4 py-4 grid grid-cols-2 gap-4">
              <Field label="Nom" value={contactName} />
              <Field label="Fonction" value={profile.role} />
              <Field label="Email du compte" value={user?.email ?? profile.email} />
              <Field label="Téléphone" value={profile.phone} />
              <Field label="Email vérifié" value={user ? (user.email_confirmed_at ? `Oui, le ${fmtDate(user.email_confirmed_at)}` : 'Non') : null} />
              <Field label="Dernière connexion" value={user?.last_sign_in_at ? fmtDateTime(user.last_sign_in_at) : null} />
            </dl>
          </Section>

          {/* Déclaré à l'onboarding */}
          <Section title="Déclaré par le client">
            <dl className="px-4 py-4 grid grid-cols-2 gap-4">
              <Field label="Chiffre d'affaires" value={profile.revenue_declared != null ? eur(profile.revenue_declared) : profile.revenue_bracket} />
              <Field label="Résultat net" value={profile.result_declared != null ? eur(profile.result_declared) : null} />
              <Field label="Effectif" value={profile.headcount_bracket} />
              <Field label="Année de création" value={profile.date_creation ? `${profile.date_creation} (${new Date().getFullYear() - profile.date_creation} ans)` : null} />
              <Field label="Bilans fournis" value={profile.financial_docs_uploaded ? 'Oui' : 'Non'} />
              <Field label="Pays" value={profile.country} />
            </dl>
          </Section>
        </div>

        {/* Identité : déclaré vs registre */}
        <Section
          title="Identité"
          right={<span className="text-xs" style={{ color: 'var(--ink-3)' }}>Registre : annuaire des entreprises (data.gouv), mis à jour chaque jour</span>}
        >
          {registry.status === 'error' && (
            <p className="ev-alert ev-alert--warning mx-4 mt-4">
              Registre indisponible pour le moment : seules les données déclarées sont affichées.
            </p>
          )}
          {registry.status === 'not_found' && (
            <p className="ev-alert mx-4 mt-4">
              {profile.siren ? 'SIREN introuvable au registre public.' : 'Pas de SIREN renseigné.'}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['', 'Déclaré par le client', 'Registre public'].map(h => (
                    <th key={h} className="ev-kicker px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {identity.map(row => (
                  <tr key={row.label} style={{ borderBottom: '1px solid var(--line)', background: row.mismatch ? 'var(--warning-soft)' : undefined }}>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{row.label}</td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>{row.declared ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>
                      {row.registry ?? '—'}
                      {row.mismatch && <span className="ml-2 text-xs font-medium" style={{ color: 'var(--warning)' }}>écart</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {registryCompany && (
            <dl className="px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="SIRET du siège" value={registryCompany.siret} />
              <Field label="Effectif (registre)" value={registryCompany.headcount} />
              <Field label="Catégorie" value={registryCompany.category} />
              <Field
                label="Établissements"
                value={registryCompany.establishments ? `${registryCompany.establishments.open} ouvert(s) sur ${registryCompany.establishments.total}` : null}
              />
            </dl>
          )}
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Dirigeants */}
          <Section title="Dirigeants (registre)">
            {!registryCompany || registryCompany.directors.length === 0 ? (
              <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Aucun dirigeant connu.</p>
            ) : (
              <ul className="px-4 py-3 divide-y divide-[var(--line)]">
                {registryCompany.directors.map((d, i) => (
                  <li key={i} className="py-2 flex items-baseline justify-between gap-3">
                    <span className="text-sm" style={{ color: 'var(--ink)' }}>{d.name}</span>
                    <span className="text-xs text-right" style={{ color: 'var(--ink-3)' }}>{d.role ?? (d.kind === 'company' ? 'Personne morale' : '—')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Score */}
          <Section
            title="Score Everlease"
            right={score?.partial ? <span className="text-xs" style={{ color: 'var(--warning)' }}>Partiel : sans chiffres financiers</span> : undefined}
          >
            {!score ? (
              <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Score pas encore calculé.</p>
            ) : (
              <ul className="px-4 py-3 space-y-2">
                {score.rows.map(r => (
                  <li key={r.label} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-xs" style={{ color: 'var(--ink-3)' }}>{r.label}</span>
                    <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                      <span className="block h-full rounded-full" style={{ width: `${((r.points ?? 0) / r.max) * 100}%`, background: 'var(--accent)' }} />
                    </span>
                    <span className="ev-mono w-12 text-right text-xs" style={{ color: 'var(--ink)' }}>
                      {r.points ?? '—'}/{r.max}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {registryCompany && registryCompany.finances.length > 0 && (
              <div className="px-4 pb-4">
                <p className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Chiffres publiés au registre</p>
                {registryCompany.finances.slice(0, 3).map(f => (
                  <p key={f.year} className="ev-mono text-sm" style={{ color: 'var(--ink)' }}>
                    {f.year} · CA {eur(f.revenue)} · résultat {eur(f.netResult)}
                  </p>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Dossiers */}
        <Section title="Dossiers">
          {requests.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Aucun dossier.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Référence', 'Statut', 'Montant HT', 'Durée', 'Document', 'Créé le'].map(h => (
                      <th key={h} className="ev-kicker px-4 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="ev-mono px-4 py-2.5 text-sm font-medium whitespace-nowrap">
                        <Link href={`/admin/dossiers/${r.id}`} className="underline-offset-2 hover:underline" style={{ color: 'var(--ink)' }}>{requestLabel(r)}</Link>
                      </td>
                      <td className="px-4 py-2.5"><Badge info={requestStatusInfo(r.status)} /></td>
                      <td className="ev-mono px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>{eur(r.total_amount)}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{r.duration_months ? `${r.duration_months} mois` : '—'}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--ink-3)' }}>{r.document_type ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Documents */}
        <Section title="Documents" right={<span className="text-xs" style={{ color: 'var(--ink-3)' }}>{documents.length} fichier(s) · liens valables 1 h</span>}>
          {documentGroups.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Aucun document uploadé.</p>
          ) : (
            <div className="px-4 py-3 space-y-4">
              {documentGroups.map(g => (
                <div key={g.kind}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--ink-3)' }}>{DOCUMENT_KIND_LABEL[g.kind]}</p>
                  <ul className="divide-y divide-[var(--line)]">
                    {g.items.map(d => {
                      const url = signedUrl.get(d.path)
                      return (
                        <li key={d.path} className="py-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <span className="min-w-0 text-sm truncate" style={{ color: 'var(--ink)' }}>
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{d.name}</a>
                            ) : d.name}
                            {d.request && (
                              <Link href={`/admin/dossiers/${d.request.id}`} className="ev-mono ml-2 text-xs hover:opacity-70" style={{ color: 'var(--ink-3)' }}>
                                {d.request.ref}
                              </Link>
                            )}
                          </span>
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                            {formatBytes(d.size)} · {fmtDate(d.createdAt)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Historique */}
        <Section title="Historique des actions admin">
          {(rawEvents ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: 'var(--ink-3)' }}>Aucune action de l&apos;équipe sur cette société.</p>
          ) : (
            <ol className="px-4 py-4 space-y-3">
              {(rawEvents ?? []).map(e => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--line-strong)' }} />
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>
                      {e.action}
                      {e.request_id && refById.get(e.request_id) && (
                        <Link href={`/admin/dossiers/${e.request_id}`} className="ev-mono ml-1 hover:opacity-70" style={{ color: 'var(--ink-3)' }}>
                          · {refById.get(e.request_id)}
                        </Link>
                      )}
                      {e.note && <span style={{ color: 'var(--ink-3)' }}> · {e.note}</span>}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                      {fmtDateTime(e.created_at)} · {adminName.get(e.admin_id) ?? 'Admin'}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>
    </div>
  )
}
