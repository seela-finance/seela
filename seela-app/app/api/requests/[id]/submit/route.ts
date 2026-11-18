import { after } from 'next/server'
import { clientRoute } from '@/lib/client-route'
import { parseSubmitPayload, submitRequest } from '@/lib/client-workflow'
import { runMatching } from '@/lib/matching'
import { analyzeSubmission } from '@/lib/credit-analyst'
import { loadPartnerContext, supabasePartnerStore } from '@/lib/partner-store'
import { parseClientInput, submitAsPartner } from '@/lib/partner-workflow'
import { emailClientPartnerInvitation, sendEmail } from '@/lib/email'
import { requestLabel } from '@/lib/request-label'
import { OS } from '@/lib/status'
import type { SupabaseClient } from '@supabase/supabase-js'

// Soumission d'un brouillon : lignes, total calculé côté serveur, statut, puis matching.
// Compte d'une société partenaire : le dossier est rattaché au client (SIREN) et le client est invité par email.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const origin = new URL(req.url).origin
  return clientRoute(id, async ({ userId, store, db }) => {
    const payload = parseSubmitPayload(body)
    const partnerCtx = await loadPartnerContext(db, userId)

    let invitation: { token: string; clientEmail: string; clientCompanyName: string; partnerName: string } | null = null
    if (partnerCtx?.partnerEnabled) {
      const client = parseClientInput((body as Record<string, unknown> | null)?.client)
      const result = await submitAsPartner({ partner: supabasePartnerStore(db), client: store }, userId, id, payload, client)
      if (result.status === 'already') return { status: result.status, offers: 0, partner: true }
      invitation = { token: result.token, clientEmail: client.email, clientCompanyName: result.clientCompanyName, partnerName: result.partner.companyName }
    } else {
      const result = await submitRequest(store, userId, id, payload)
      if (result === 'already') return { status: result, offers: 0 }
    }

    // L'analyse crédit (agent analyste) part après la réponse au client : elle ne le fait pas attendre,
    // et son échec ne bloque rien (reprise depuis la fiche admin ou au récapitulatif).
    after(() => analyzeSubmission(db, id))

    // Le dossier est transmis même si le matching échoue : il reste « submitted »,
    // visible dans l'onglet « À traiter » du back-office.
    let offers = 0
    try {
      offers = (await runMatching(db, id)).offers
    } catch (err) {
      console.error('[submit] matching', err)
    }

    if (invitation) {
      await sendInvitation(db, id, origin, invitation, payload.durationMonths)
      return { status: 'submitted', offers, partner: true }
    }
    return { status: 'submitted', offers }
  })
}

async function sendInvitation(
  db: SupabaseClient,
  requestId: string,
  origin: string,
  inv: { token: string; clientEmail: string; clientCompanyName: string; partnerName: string },
  durationMonths: number,
) {
  const [{ data: request }, { data: offers }] = await Promise.all([
    db.from('financing_requests').select('id, total_amount').eq('id', requestId).maybeSingle(),
    db.from('offers').select('monthly_payment, duration_months, status').eq('request_id', requestId),
  ])
  const best = (offers ?? [])
    .filter(o => o.status !== OS.refused && o.monthly_payment != null)
    .sort((a, b) => Number(a.monthly_payment) - Number(b.monthly_payment))[0]
  const email = emailClientPartnerInvitation({
    clientEmail: inv.clientEmail,
    partnerName: inv.partnerName,
    clientCompanyName: inv.clientCompanyName,
    totalAmount: Number(request?.total_amount ?? 0),
    monthlyFrom: best ? Number(best.monthly_payment) : null,
    durationMonths: best?.duration_months ?? durationMonths,
    link: `${origin}/invitation/${inv.token}`,
    requestRef: requestLabel({ id: requestId }),
  })
  const sent = await sendEmail(email)
  if (!sent.success) console.error('[submit] invitation non envoyée', requestId)
}
