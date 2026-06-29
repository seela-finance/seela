import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

// Où arrivent les demandes "Parler à un expert".
// Liste d'emails séparés par des virgules, surchargeable via env LEADS_EMAIL.
const LEADS_EMAILS = (process.env.LEADS_EMAIL ?? 'broutin.louis@gmail.com,aurelien.audelin@gmail.com')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean)

interface ExpertLead {
  entreprise?: string
  prenom?: string
  nom?: string
  role?: string
  devis?: string | null // 'oui' | 'non' | null
  email?: string
  telephone?: string
}

// Échappe le HTML pour éviter toute injection dans l'email.
function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(req: Request) {
  let body: ExpertLead
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { entreprise, prenom, nom, role, devis, email, telephone } = body

  // Validation des champs obligatoires.
  const missing = Object.entries({ entreprise, prenom, nom, role, email, telephone })
    .filter(([, v]) => !v || !String(v).trim())
    .map(([k]) => k)
  if (missing.length) {
    return NextResponse.json({ error: `Champs manquants : ${missing.join(', ')}` }, { status: 400 })
  }

  const devisLabel = devis === 'oui' ? 'Oui, a un devis' : devis === 'non' ? 'Pas encore' : 'Non précisé'
  const fullName = `${prenom} ${nom}`

  // ── Email à l'équipe ───────────────────────────────────────────────
  const subject = `[Everlease] Demande d'expert — ${entreprise} (${fullName})`
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;color:#0E0E0C;max-width:520px">
    <h2 style="margin:0 0 16px;font-size:18px">Nouvelle demande « Parler à un expert »</h2>
    <table style="border-collapse:collapse;font-size:14px;line-height:1.6">
      <tr><td style="color:#9A9A93;padding:2px 16px 2px 0">Entreprise</td><td><strong>${esc(entreprise)}</strong></td></tr>
      <tr><td style="color:#9A9A93;padding:2px 16px 2px 0">Contact</td><td>${esc(fullName)}</td></tr>
      <tr><td style="color:#9A9A93;padding:2px 16px 2px 0">Rôle</td><td>${esc(role)}</td></tr>
      <tr><td style="color:#9A9A93;padding:2px 16px 2px 0">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
      <tr><td style="color:#9A9A93;padding:2px 16px 2px 0">Téléphone</td><td><a href="tel:${esc(telephone)}">${esc(telephone)}</a></td></tr>
      <tr><td style="color:#9A9A93;padding:2px 16px 2px 0">Devis en main</td><td>${esc(devisLabel)}</td></tr>
    </table>
    <p style="color:#9A9A93;font-size:12px;margin-top:20px">Demande envoyée depuis la landing everlease.fr</p>
  </div>`

  // ── Slack (optionnel, actif seulement si le webhook est configuré) ──
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  const slackPayload = {
    text: `:wave: Nouvelle demande d'expert — *${entreprise}*`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🤝 Nouvelle demande « Parler à un expert »' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Entreprise*\n${entreprise}` },
          { type: 'mrkdwn', text: `*Contact*\n${fullName}` },
          { type: 'mrkdwn', text: `*Rôle*\n${role}` },
          { type: 'mrkdwn', text: `*Devis en main*\n${devisLabel}` },
          { type: 'mrkdwn', text: `*Email*\n${email}` },
          { type: 'mrkdwn', text: `*Téléphone*\n${telephone}` },
        ],
      },
    ],
  }

  // On tente les deux canaux indépendamment ; un lead n'est perdu que si les deux échouent.
  const [emailRes, slackRes] = await Promise.allSettled([
    sendEmail({ to: LEADS_EMAILS, subject, html, alwaysSend: true }),
    slackUrl
      ? fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        })
      : Promise.resolve(null),
  ])

  const emailOk = emailRes.status === 'fulfilled' && emailRes.value?.success !== false
  const slackOk = !slackUrl || (slackRes.status === 'fulfilled' && (slackRes.value === null || (slackRes.value as Response).ok))

  if (!emailOk && !slackOk) {
    console.error('[contact-expert] échec email ET slack', { emailRes, slackRes })
    return NextResponse.json({ error: "Impossible d'envoyer la demande" }, { status: 502 })
  }
  if (!emailOk) console.error('[contact-expert] email en échec (slack ok)', emailRes)
  if (!slackOk) console.error('[contact-expert] slack en échec (email ok)', slackRes)

  return NextResponse.json({ success: true })
}
