import { clientRoute } from '@/lib/client-route'
import { ClientActionError } from '@/lib/client-workflow'
import { supabasePartnerStore } from '@/lib/partner-store'
import { parseEmail, resendInvitation } from '@/lib/partner-workflow'
import { emailClientPartnerInvitation, sendEmail } from '@/lib/email'
import { requestLabel } from '@/lib/request-label'
import { OS } from '@/lib/status'

// Renvoi du lien au client (adresse corrigée ou lien expiré) : les liens précédents ne marchent plus.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const origin = new URL(req.url).origin
  return clientRoute(id, async ({ userId, db }) => {
    const email = parseEmail(body.email)
    const store = supabasePartnerStore(db)
    const { data: request } = await db.from('financing_requests')
      .select('id, total_amount, duration_months, partner_company_id, client_joined_at, companies ( name ), offers ( monthly_payment, duration_months, status )')
      .eq('id', id).maybeSingle()
    const token = await resendInvitation(store, userId, request, email)
    const partner = await store.loadPartner(userId)
    if (!request || !partner) throw new ClientActionError('Dossier introuvable.', 404)

    const row = request as unknown as { total_amount: number | string | null; duration_months: number | null; companies: { name: string | null } | null; offers: { monthly_payment: number | string | null; duration_months: number | null; status: string }[] | null }
    const best = (row.offers ?? []).filter(o => o.status !== OS.refused && o.monthly_payment != null)
      .sort((a, b) => Number(a.monthly_payment) - Number(b.monthly_payment))[0]
    const sent = await sendEmail(emailClientPartnerInvitation({
      clientEmail: email,
      partnerName: partner.companyName,
      clientCompanyName: row.companies?.name ?? 'Votre société',
      totalAmount: Number(row.total_amount ?? 0),
      monthlyFrom: best ? Number(best.monthly_payment) : null,
      durationMonths: best?.duration_months ?? row.duration_months ?? 36,
      link: `${origin}/invitation/${token}`,
      requestRef: requestLabel({ id }),
    }))
    if (!sent.success) throw new ClientActionError('Email non envoyé, réessayez.', 502)
    return { ok: true }
  })
}
