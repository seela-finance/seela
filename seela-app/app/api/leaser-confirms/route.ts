import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  sendEmail,
  emailClientLeaserConfirmed,
  emailClientLeaserRefused,
} from '@/lib/email'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.SEELA_ADMIN_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { offerId, decision } = await req.json()
  if (!offerId || !decision) {
    return NextResponse.json({ error: 'offerId and decision required' }, { status: 400 })
  }
  if (decision !== 'confirmed' && decision !== 'refused') {
    return NextResponse.json({ error: 'decision must be confirmed or refused' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, request_id, leaser_name, monthly_payment, duration_months, status')
    .eq('id', offerId)
    .single()

  if (offerErr || !offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }

  const { data: request } = await supabase
    .from('financing_requests')
    .select('id, user_id')
    .eq('id', offer.request_id)
    .single()

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, email')
    .eq('id', request.user_id)
    .single()

  const userEmail = (profile as { email?: string } | null)?.email ?? ''

  const requestRef = `C-${offer.request_id.slice(0, 4).toUpperCase()}-${offer.request_id.slice(4, 8).toUpperCase()}`
  const companyName = profile?.company_name ?? 'Entreprise'

  if (decision === 'confirmed') {
    await supabase
      .from('offers')
      .update({ status: 'leaser_confirmed' })
      .eq('id', offerId)

    await supabase
      .from('financing_requests')
      .update({ status: 'leaser_confirmed' })
      .eq('id', offer.request_id)

    const emailData = emailClientLeaserConfirmed({
      userEmail,
      companyName,
      leaserName: offer.leaser_name,
      monthlyPayment: offer.monthly_payment,
      durationMonths: offer.duration_months,
      requestRef,
    })
    await sendEmail(emailData)
  } else {
    await supabase
      .from('offers')
      .update({ status: 'refused' })
      .eq('id', offerId)

    await supabase
      .from('financing_requests')
      .update({ status: 'offers_available' })
      .eq('id', offer.request_id)

    const emailData = emailClientLeaserRefused({
      userEmail,
      companyName,
      leaserName: offer.leaser_name,
      requestRef,
    })
    await sendEmail(emailData)
  }

  return NextResponse.json({ success: true, decision, requestRef })
}
