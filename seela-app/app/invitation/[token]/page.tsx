import Link from 'next/link'
import type { Metadata } from 'next'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { hashToken, invitationState, sameEmail, type Invitation } from '@/lib/partner-workflow'
import { OS } from '@/lib/status'
import AcceptInvitation from './AcceptInvitation'

export const metadata: Metadata = { title: 'Votre dossier de financement · everlease', robots: { index: false } }

const EUR = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

type RequestSummary = {
  total_amount: number | string | null
  duration_months: number | null
  partner_company_id: string | null
  companies: { name: string | null } | null
  offers: { monthly_payment: number | string | null; duration_months: number | null; status: string }[] | null
}

// Lien envoyé au client par un distributeur partenaire : résumé du dossier, puis connexion avec l'email invité.
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const validToken = /^[A-Za-z0-9_-]{20,100}$/.test(token)

  let invitation: Invitation | null = null
  let summary: RequestSummary | null = null
  let partnerName: string | null = null
  if (validToken && isServiceRoleConfigured()) {
    const db = createAdminClient()
    const { data } = await db.from('request_invitations')
      .select('id, request_id, email, expires_at, accepted_at, accepted_by, revoked_at')
      .eq('token_hash', hashToken(token)).maybeSingle()
    invitation = (data as Invitation | null) ?? null
    if (invitation) {
      const { data: req } = await db.from('financing_requests')
        .select('total_amount, duration_months, partner_company_id, companies ( name ), offers ( monthly_payment, duration_months, status )')
        .eq('id', invitation.request_id).maybeSingle()
      summary = (req as unknown as RequestSummary | null) ?? null
      if (summary?.partner_company_id) {
        const { data: partner } = await db.from('companies').select('name').eq('id', summary.partner_company_id).maybeSingle()
        partnerName = partner?.name ?? null
      }
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const state = invitationState(invitation)
  const next = `/invitation/${token}`
  const authHref = (mode: 'signup' | 'login') =>
    `/auth?mode=${mode}&next=${encodeURIComponent(next)}${invitation ? `&email=${encodeURIComponent(invitation.email)}` : ''}`

  const best = (summary?.offers ?? [])
    .filter(o => o.status !== OS.refused && o.monthly_payment != null)
    .sort((a, b) => Number(a.monthly_payment) - Number(b.monthly_payment))[0]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo /></Link>
        </div>

        {state === 'invalid' || !invitation || !summary ? (
          <div className="ev-card p-6 text-center">
            <h1 className="ev-display mb-2" style={{ fontSize: 22 }}>Ce lien n’est plus valable</h1>
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Demandez à votre fournisseur de vous renvoyer le lien de votre dossier.</p>
          </div>
        ) : state === 'expired' ? (
          <div className="ev-card p-6 text-center">
            <h1 className="ev-display mb-2" style={{ fontSize: 22 }}>Ce lien a expiré</h1>
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              {partnerName ? `Demandez à ${partnerName}` : 'Demandez à votre fournisseur'} de vous renvoyer le lien de votre dossier.
            </p>
          </div>
        ) : (
          <div className="ev-card p-6">
            <p className="ev-kicker mb-3">Dossier de financement</p>
            <h1 className="ev-display mb-1" style={{ fontSize: 24 }}>{summary.companies?.name ?? 'Votre société'}</h1>
            <p className="text-sm mb-5" style={{ color: 'var(--ink-3)' }}>
              Préparé par {partnerName ?? 'votre fournisseur'} avec everlease
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="ev-card p-3.5">
                <p className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Montant financé</p>
                <p className="ev-mono font-semibold" style={{ color: 'var(--ink)' }}>{EUR(Number(summary.total_amount ?? 0))} HT</p>
              </div>
              <div className="ev-card p-3.5">
                <p className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>{best ? 'Loyer à partir de' : 'Durée'}</p>
                <p className="ev-mono font-semibold" style={{ color: 'var(--ink)' }}>
                  {best ? `${EUR(Number(best.monthly_payment))} / mois` : `${summary.duration_months ?? '—'} mois`}
                </p>
              </div>
            </div>
            {best ? (
              <p className="text-xs mb-6" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
                Exemple illustratif sur {best.duration_months ?? summary.duration_months} mois, hors assurance et services. Sous réserve d’acceptation du dossier par le financeur.
              </p>
            ) : (
              <p className="text-xs mb-6" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>Un conseiller everlease étudie votre dossier et vous rappelle sous 24 h ouvrées.</p>
            )}

            {state === 'accepted' ? (
              user && invitation.accepted_by === user.id ? (
                <Link href="/app/dashboard" className="ev-btn ev-btn--primary w-full justify-center">Ouvrir mon espace</Link>
              ) : (
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Ce dossier a déjà été ouvert. <Link href="/auth" className="underline">Se connecter</Link></p>
              )
            ) : !user ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>
                  Pour consulter vos offres et choisir la vôtre, créez votre espace avec <strong>{invitation.email}</strong>.
                </p>
                <Link href={authHref('signup')} className="ev-btn ev-btn--primary w-full justify-center">Créer mon espace</Link>
                <Link href={authHref('login')} className="ev-btn ev-btn--ghost w-full justify-center">J’ai déjà un compte</Link>
              </div>
            ) : sameEmail(user.email, invitation.email) ? (
              <AcceptInvitation token={token} />
            ) : (
              <div className="ev-alert ev-alert--warning text-sm">
                Ce dossier est réservé à {invitation.email}. Vous êtes connecté avec {user.email} : déconnectez-vous puis reconnectez-vous avec la bonne adresse.
              </div>
            )}
            <p className="text-xs mt-5" style={{ color: 'var(--ink-3)' }}>Aucune carte ni RIB demandé.</p>
          </div>
        )}
      </div>
    </div>
  )
}
