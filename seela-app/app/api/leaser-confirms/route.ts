import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  sendEmail,
  emailClientLeaserConfirmed,
  emailClientLeaserRefused,
} from '@/lib/email'
import { OS, RS, canTransitionOffer, canTransitionRequest, type RequestStatus } from '@/lib/status'
import { TransitionError, transitionOffer, transitionRequest } from '@/lib/transitions'

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { offerId, decision } = await req.json()
  if (!offerId || !decision) {
    return NextResponse.json({ error: 'offerId and decision required' }, { status: 400 })
  }
  if (decision !== 'confirmed' && decision !== 'refused') {
    return NextResponse.json({ error: 'decision must be confirmed or refused' }, { status: 400 })
  }

  // Service role : la RLS bloquerait (sans erreur) les écritures de la clé anon sans session.
  const supabase = createAdminClient()

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
    .select('id, status, user_id')
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

  const offerTo = decision === 'confirmed' ? OS.leaser_confirmed : OS.refused
  let requestTo: RequestStatus = RS.leaser_confirmed
  if (decision === 'refused') {
    // Le client retrouve ses autres offres ; s'il n'en reste aucune, le dossier passe en « sans offre ».
    const { count } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', offer.request_id)
      .neq('id', offerId)
      .neq('status', OS.refused)
    requestTo = count ? RS.offers_available : RS.no_match
  }

  // Vérifié avant toute écriture : une offre pas encore transmise au leaser, ou déjà traitée → 409, aucun email.
  if (!canTransitionOffer(offer.status, offerTo, 'admin')) {
    return NextResponse.json({ error: `Offer status is ${offer.status}, expected seela_validated` }, { status: 409 })
  }
  if (!canTransitionRequest(request.status, requestTo, 'admin')) {
    return NextResponse.json({ error: `Request status is ${request.status}, expected seela_validated` }, { status: 409 })
  }

  const offerExtra = decision === 'confirmed'
    ? { leaser_confirmed_at: new Date().toISOString() }
    : { selected: false }

  try {
    await transitionOffer(supabase, offerId, offer.status, offerTo, offerExtra)
    try {
      await transitionRequest(supabase, request.id, request.status, requestTo)
    } catch (err) {
      // Le dossier n'a pas suivi : on remet l'offre dans son état d'origine.
      await supabase
        .from('offers')
        .update(decision === 'confirmed'
          ? { status: offer.status, leaser_confirmed_at: null }
          : { status: offer.status, selected: true })
        .eq('id', offerId)
        .eq('status', offerTo)
      throw err
    }
  } catch (err) {
    if (err instanceof TransitionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  const emailData = decision === 'confirmed'
    ? emailClientLeaserConfirmed({
        userEmail,
        companyName,
        leaserName: offer.leaser_name,
        monthlyPayment: offer.monthly_payment,
        durationMonths: offer.duration_months,
        requestRef,
      })
    : emailClientLeaserRefused({
        userEmail,
        companyName,
        leaserName: offer.leaser_name,
        requestRef,
      })
  const emailSent = (await sendEmail(emailData)).success

  return NextResponse.json({ success: true, decision, requestRef, emailSent })
}
