import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  sendEmail,
  emailLeaserValidation,
  emailClientEverleaseValidated,
} from '@/lib/email'

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { offerId } = await req.json()
  if (!offerId) {
    return NextResponse.json({ error: 'offerId required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get offer + request + user
  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, request_id, leaser_name, monthly_payment, duration_months, status')
    .eq('id', offerId)
    .single()

  if (offerErr || !offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }

  if (offer.status !== 'client_confirmed') {
    return NextResponse.json({ error: `Expected status client_confirmed, got ${offer.status}` }, { status: 400 })
  }

  const { data: request } = await supabase
    .from('financing_requests')
    .select('id, total_amount, duration_months, document_type, document_url, user_id, line_items(description, selected, quantity)')
    .eq('id', offer.request_id)
    .single()

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, siren, email')
    .eq('id', request.user_id)
    .single()

  const userEmail = (profile as { email?: string } | null)?.email ?? ''

  // Destinataire leaser : le référent enregistré en base, jamais une adresse devinée.
  // Vérifié avant tout changement de statut pour ne pas valider un dossier non transmis.
  const { data: leaser } = await supabase
    .from('leasers')
    .select('referent_email, referent_name')
    .eq('name', offer.leaser_name)
    .maybeSingle()

  if (!leaser?.referent_email) {
    return NextResponse.json({ error: `No referent_email for leaser ${offer.leaser_name}` }, { status: 409 })
  }

  // Update offer + request status
  await supabase
    .from('offers')
    .update({ status: 'seela_validated' })
    .eq('id', offerId)

  await supabase
    .from('financing_requests')
    .update({ status: 'seela_validated' })
    .eq('id', offer.request_id)

  const requestRef = `C-${offer.request_id.slice(0, 4).toUpperCase()}-${offer.request_id.slice(4, 8).toUpperCase()}`
  const companyName = profile?.company_name ?? 'Entreprise'
  const siren = profile?.siren ?? '—'

  const selectedItems = (request.line_items ?? [])
    .filter((l: { selected: boolean }) => l.selected)
  const equipmentList = selectedItems
    .map((l: { description: string | null; quantity: number | null }) =>
      `${l.quantity && l.quantity > 1 ? `${l.quantity}× ` : ''}${l.description ?? ''}`.trim()
    )
    .join('\n') || 'Non précisé'

  // Send leaser email
  const leaserEmailData = emailLeaserValidation({
    leaserEmail: leaser.referent_email,
    leaserName: offer.leaser_name,
    referentName: leaser.referent_name ?? '',
    companyName,
    siren,
    totalAmount: request.total_amount ?? 0,
    durationMonths: offer.duration_months,
    monthlyPayment: offer.monthly_payment,
    equipmentList,
    documentUrl: isStorageUrl(request.document_url) ? request.document_url : '',
    requestRef,
  })
  const leaserSent = await sendEmail(leaserEmailData)

  // Send client email
  const clientEmailData = emailClientEverleaseValidated({
    userEmail,
    companyName,
    leaserName: offer.leaser_name,
    monthlyPayment: offer.monthly_payment,
    durationMonths: offer.duration_months,
    requestRef,
  })
  const clientSent = await sendEmail(clientEmailData)

  return NextResponse.json({
    success: true,
    requestRef,
    emails: { leaser: leaserSent.success, client: clientSent.success },
  })
}

// document_url est écrit par le navigateur : on ne met en lien que nos propres fichiers.
function isStorageUrl(url: string | null): url is string {
  if (!url || !process.env.NEXT_PUBLIC_SUPABASE_URL) return false
  try {
    const u = new URL(url)
    return u.origin === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin && u.pathname.startsWith('/storage/v1/object/')
  } catch {
    return false
  }
}
