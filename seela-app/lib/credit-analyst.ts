// Agent « analyste crédit » : lit un dossier en base (service role), calcule ses indicateurs, demande au
// modèle une analyse de crédit, l'enregistre (credit_analyses) et prévient l'équipe.
// Appelé à la soumission (après la réponse au client), depuis la fiche admin, et par le récapitulatif
// planifié (app/api/cron/credit-recap). La logique pure (indicateurs, prompt, lecture) est dans
// lib/credit-analysis.ts.
import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchRegistry, isSiren, type RegistryResult } from '@/lib/company-registry'
import { diagnoseMatching } from '@/lib/matching'
import { sendEmail } from '@/lib/email'
import { requestLabel } from '@/lib/request-label'
import { RS } from '@/lib/status'
import { FINANCING_TYPES } from '@/lib/equipment'
import {
  buildUserPrompt,
  computeIndicators,
  CREDIT_ANALYST_SYSTEM,
  CreditAnalysisParseError,
  emailTeamCreditAnalysis,
  isCreditOpinion,
  parseCreditAnalysis,
  recapHtml,
  recapSubject,
  type CreditAnalysis,
  type CreditDossier,
  type CreditIndicators,
  type Recap,
  type RecapItem,
  type RegistryLookup,
} from '@/lib/credit-analysis'

// Modèle par défaut ; surchargeable (CREDIT_ANALYST_MODEL) sans redéployer
const MODEL = process.env.CREDIT_ANALYST_MODEL ?? 'claude-opus-5-5'
// Base des liens vers le back-office dans les emails internes
export const APP_URL = (process.env.APP_URL ?? 'https://everlease.fr').replace(/\/$/, '')

/** Destinataires internes : même variable que les demandes « Parler à un expert ». */
export function teamEmails(): string[] {
  return (process.env.LEADS_EMAIL ?? 'broutin.louis@gmail.com').split(',').map(e => e.trim()).filter(Boolean)
}

/** Erreur à afficher telle quelle à l'admin ; rien n'a été enregistré. */
export class CreditAnalysisError extends Error {}

export type CreditAnalysisRecord = {
  id: string
  request_id: string
  avis: string
  analysis: CreditAnalysis
  indicators: CreditIndicators
  model: string
  triggered_by: string
  created_at: string
}

export type Trigger = 'submission' | 'admin' | 'recap'

const lookup = (siren: string | null | undefined, r: RegistryResult | null): RegistryLookup =>
  !isSiren(siren) ? { status: 'no_siren', company: null } : !r ? { status: 'error', company: null } : { status: r.status, company: r.status === 'ok' ? r.company : null }

const sirenOf = (s: string | null | undefined) => {
  const digits = (s ?? '').replace(/\D/g, '')
  return digits.length === 9 || digits.length === 14 ? digits.slice(0, 9) : null
}

/** Rassemble tout ce que l'analyste doit voir : dossier, société, registre (client et fournisseur), historique, financeurs. */
export async function loadCreditDossier(db: SupabaseClient, requestId: string): Promise<CreditDossier | null> {
  const { data: request, error } = await db
    .from('financing_requests')
    .select(`id, status, total_amount, duration_months, periodicite, document_type, notes, supplier_name, supplier_siren, supplier_address,
      document_number, document_date, created_at, company_id,
      companies(name, siren, legal_form, naf_code, creation_year, address, revenue_bracket, age_bracket, headcount_bracket, revenue_declared,
        result_declared, kyc_completed, financial_docs_uploaded, seela_score, seela_score_grade, lifecycle_stage),
      contacts(first_name, last_name, email, phone, job_title),
      line_items(description, quantity, unit_price, total_price, category, equipment_family, equipment_type, selected),
      offers(leaser_name, monthly_payment, duration_months, rate, status, selected)`)
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw new CreditAnalysisError(`Lecture du dossier impossible (${error.message})`)
  if (!request) return null

  const r = request as unknown as CreditDossier['request'] & {
    company_id: string | null
    companies: CreditDossier['company']
    contacts: CreditDossier['contact']
    line_items: CreditDossier['lines']
    offers: CreditDossier['offers']
  }

  const [history, registry, supplierRegistry, leaserVerdicts] = await Promise.all([
    r.company_id
      ? db.from('financing_requests').select('id, status, total_amount, created_at').eq('company_id', r.company_id).neq('id', requestId).order('created_at')
      : Promise.resolve({ data: [] as CreditDossier['history'] }),
    fetchRegistry(r.companies?.siren),
    fetchRegistry(sirenOf(r.supplier_siren)),
    // Le diagnostic des financeurs est un confort : sa panne n'empêche pas l'analyse
    diagnoseMatching(db, requestId).catch(err => { console.error('[credit-analyst] diagnostic', err); return [] }),
  ])

  return {
    request: r,
    company: r.companies ?? null,
    contact: r.contacts ?? null,
    lines: r.line_items ?? [],
    offers: r.offers ?? [],
    history: (history.data ?? []) as CreditDossier['history'],
    registry: lookup(r.companies?.siren, registry),
    supplierRegistry: lookup(sirenOf(r.supplier_siren), supplierRegistry),
    leaserVerdicts,
  }
}

/** Appel au modèle ; lève une CreditAnalysisError lisible en cas de refus, de troncature ou de réponse inexploitable. */
async function askModel(dossier: CreditDossier, indicators: CreditIndicators) {
  if (!process.env.ANTHROPIC_API_KEY) throw new CreditAnalysisError('Analyse IA non configurée (ANTHROPIC_API_KEY absente).')
  const client = new Anthropic()
  let message: Anthropic.Message
  try {
    message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 8000,
        output_config: { effort: 'medium' },
        system: CREDIT_ANALYST_SYSTEM,
        messages: [{ role: 'user', content: buildUserPrompt(dossier, indicators) }],
      },
      { timeout: 90_000 },
    )
  } catch (err) {
    if (err instanceof Anthropic.APIError) throw new CreditAnalysisError(`Analyse IA indisponible (${err.status ?? 'réseau'}). Réessayez dans un instant.`)
    throw err
  }
  if (message.stop_reason === 'refusal') throw new CreditAnalysisError('Le modèle a refusé d’analyser ce dossier.')
  if (message.stop_reason === 'max_tokens') throw new CreditAnalysisError('Réponse du modèle tronquée. Réessayez.')
  const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
  try {
    return { analysis: parseCreditAnalysis(text), usage: message.usage, model: message.model }
  } catch (err) {
    if (err instanceof CreditAnalysisParseError) throw new CreditAnalysisError(`${err.message}. Réessayez.`)
    throw err
  }
}

/** Analyse un dossier et enregistre le résultat. Lève CreditAnalysisError (dossier introuvable, modèle, écriture). */
export async function runCreditAnalysis(db: SupabaseClient, requestId: string, trigger: Trigger): Promise<CreditAnalysisRecord> {
  const dossier = await loadCreditDossier(db, requestId)
  if (!dossier) throw new CreditAnalysisError('Dossier introuvable.')
  if (dossier.request.status === RS.draft) throw new CreditAnalysisError('Un brouillon ne s’analyse pas : attendez la soumission.')

  const indicators = computeIndicators(dossier)
  const { analysis, usage, model } = await askModel(dossier, indicators)

  const { data, error } = await db
    .from('credit_analyses')
    .insert({
      request_id: requestId,
      avis: analysis.avis,
      analysis,
      indicators,
      model,
      triggered_by: trigger,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
    })
    .select('id, request_id, avis, analysis, indicators, model, triggered_by, created_at')
    .single()
  if (error || !data) throw new CreditAnalysisError(`Enregistrement de l’analyse impossible (${error?.message ?? 'inconnu'})`)
  return data as CreditAnalysisRecord
}

/** Dernière analyse d'un dossier, ou null. Une erreur de lecture est signalée, pas confondue avec « aucune ». */
export async function latestCreditAnalysis(db: SupabaseClient, requestId: string): Promise<CreditAnalysisRecord | null> {
  const { data, error } = await db
    .from('credit_analyses')
    .select('id, request_id, avis, analysis, indicators, model, triggered_by, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new CreditAnalysisError(`Lecture de l’analyse impossible (${error.message})`)
  return (data as CreditAnalysisRecord | null) ?? null
}

/** Notification interne (email, et Slack si configuré) avec la fiche d'analyse. Ne lève jamais. */
export async function notifyTeam(record: CreditAnalysisRecord, companyName: string): Promise<void> {
  const requestRef = requestLabel({ id: record.request_id })
  const adminUrl = `${APP_URL}/admin/dossiers/${record.request_id}`
  const email = emailTeamCreditAnalysis({ requestRef, companyName, adminUrl, analysis: record.analysis, indicators: record.indicators, model: record.model })
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  const results = await Promise.allSettled([
    sendEmail({ to: teamEmails(), subject: email.subject, html: email.html, alwaysSend: true }),
    slackUrl
      ? fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `:bar_chart: ${email.subject}\n${record.analysis.synthese}\n${adminUrl}` }),
        })
      : Promise.resolve(null),
  ])
  for (const r of results) if (r.status === 'rejected') console.error('[credit-analyst] notification', r.reason)
}

/**
 * À la soumission : analyse puis notification, sans jamais faire échouer la soumission.
 * Le dossier est déjà transmis ; une analyse manquante se relance depuis la fiche ou au récapitulatif.
 */
export async function analyzeSubmission(db: SupabaseClient, requestId: string): Promise<void> {
  try {
    const record = await runCreditAnalysis(db, requestId, 'submission')
    const { data } = await db.from('financing_requests').select('companies(name)').eq('id', requestId).maybeSingle()
    const company = (data as unknown as { companies: { name: string | null } | null } | null)?.companies
    await notifyTeam(record, company?.name?.trim() || 'Société sans nom')
  } catch (err) {
    console.error('[credit-analyst] soumission', requestId, err)
  }
}

// ── Récapitulatif des demandes reçues ────────────────────────────────

type RecapRow = {
  id: string
  status: string | null
  total_amount: number | null
  duration_months: number | null
  document_type: string | null
  created_at: string
  companies: { name: string | null; siren: string | null } | null
  offers: { leaser_name: string | null; monthly_payment: number | null; selected: boolean | null }[] | null
  credit_analyses: { avis: string; analysis: CreditAnalysis; indicators: CreditIndicators; created_at: string }[] | null
}

/**
 * Dossiers soumis depuis `since` : analyse ceux qui n'en ont pas (au plus `limit`, en parallèle, pour tenir dans
 * la durée d'une fonction), puis construit le récapitulatif. Les dossiers sans analyse y figurent quand même.
 */
export async function buildRecap(db: SupabaseClient, since: Date, limit: number, now: Date = new Date()): Promise<Recap> {
  const { data, error } = await db
    .from('financing_requests')
    .select(`id, status, total_amount, duration_months, document_type, created_at, companies(name, siren),
      offers(leaser_name, monthly_payment, selected), credit_analyses(avis, analysis, indicators, created_at)`)
    .neq('status', RS.draft)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw new CreditAnalysisError(`Lecture des dossiers impossible (${error.message})`)
  const rows = (data ?? []) as unknown as RecapRow[]

  const missing = rows.filter(r => !(r.credit_analyses ?? []).length)
  const results = await Promise.allSettled(missing.slice(0, limit).map(r => runCreditAnalysis(db, r.id, 'recap')))
  let analyzedNow = 0
  results.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      analyzedNow++
      missing[i].credit_analyses = [{ avis: res.value.avis, analysis: res.value.analysis, indicators: res.value.indicators, created_at: res.value.created_at }]
    } else {
      console.error('[credit-analyst] récap', missing[i].id, res.reason)
    }
  })

  const items: RecapItem[] = rows.map(r => {
    const latest = [...(r.credit_analyses ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null
    const offer = (r.offers ?? []).find(o => o.selected) ?? null
    const financingSlug = r.document_type === 'facture' ? 'lease_back' : 'leasing'
    return {
      id: r.id,
      ref: requestLabel(r),
      companyName: r.companies?.name?.trim() || 'Société sans nom',
      siren: r.companies?.siren ?? null,
      status: r.status,
      amount: r.total_amount == null ? null : Number(r.total_amount),
      duration: r.duration_months,
      financingType: FINANCING_TYPES.find(f => f.slug === financingSlug)?.label ?? financingSlug,
      createdAt: r.created_at,
      avis: latest && isCreditOpinion(latest.avis) ? latest.avis : null,
      synthese: latest?.analysis?.synthese ?? null,
      flags: (latest?.indicators?.flags ?? []).filter(f => f.severity !== 'info').map(f => f.label),
      leaserName: offer?.leaser_name ?? null,
      monthly: offer?.monthly_payment == null ? null : Number(offer.monthly_payment),
    }
  })

  return { since: since.toISOString(), until: now.toISOString(), items, analyzedNow, missing: items.filter(i => !i.avis).length }
}

/** Envoie le récapitulatif à l'équipe. */
export async function sendRecap(recap: Recap): Promise<{ success: boolean }> {
  return sendEmail({ to: teamEmails(), subject: recapSubject(recap), html: recapHtml(recap, APP_URL), alwaysSend: true })
}
