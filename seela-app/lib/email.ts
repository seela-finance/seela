import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const EMAIL_MODE = process.env.EMAIL_MODE ?? 'development'
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? 'broutin.louis@gmail.com'

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  // Copie (ex. l'admin qui transmet un dossier) ; non envoyée hors production
  cc?: string
  // Notifications internes (équipe) : envoyées aux vrais destinataires même hors
  // production. Le garde-fou dev ne sert qu'à ne pas spammer les vrais clients.
  alwaysSend?: boolean
}

export async function sendEmail({ to, subject, html, cc, alwaysSend = false }: SendEmailParams) {
  const live = alwaysSend || EMAIL_MODE === 'production'
  const recipient = live ? to : FOUNDER_EMAIL

  if (!live) {
    console.log(`[DEV] Email redirigé vers ${FOUNDER_EMAIL} (destinataire réel : ${to})`)
  }

  if (!resend) {
    console.log(`[EMAIL] subject="${subject}" to="${recipient}"\n---\n${html.replace(/<[^>]+>/g, '')}`)
    return { success: true, dev: true }
  }

  try {
    const result = await resend.emails.send({
      from: 'Everlease <noreply@everlease.fr>',
      to: recipient,
      ...(live && cc ? { cc } : {}),
      subject,
      html,
    })
    if (result.error) {
      console.error('[EMAIL] Resend error:', result.error)
      return { success: false, error: result.error }
    }
    return { success: true, id: result.data?.id }
  } catch (err) {
    console.error('[EMAIL] Error:', err)
    return { success: false, error: err }
  }
}

// Échappe les valeurs saisies par le client ou extraites par l'IA avant de les
// injecter dans le HTML des emails (sinon : liens/boutons piégés envoyés aux leasers).
// Valeur insérée dans un sujet d'email (texte brut) : pas de retour à la ligne.
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ')
}

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Email templates ──────────────────────────────────────────────

export function emailLeaserValidation({
  leaserEmail,
  leaserName,
  referentName,
  companyName,
  siren,
  totalAmount,
  durationMonths,
  monthlyPayment,
  equipmentList,
  documentUrl,
  requestRef,
  note = '',
}: {
  leaserEmail: string
  leaserName: string
  referentName: string
  companyName: string
  siren: string
  totalAmount: number
  durationMonths: number
  monthlyPayment: number
  equipmentList: string
  documentUrl: string
  requestRef: string
  // Mot de l'équipe Everlease ajouté à l'email (facultatif)
  note?: string
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return {
    to: leaserEmail,
    subject: `[Everlease] Nouveau dossier de financement — ${oneLine(requestRef)} — ${oneLine(companyName)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Nouveau dossier à étudier</p>
    <p style="color:#6B6F76;margin:4px 0 0">Réf. ${esc(requestRef)} — transmis par Everlease</p>
  </div>
  ${note.trim() ? `<div style="border-left:3px solid #141517;padding:4px 0 4px 16px;margin-bottom:24px"><p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:0 0 6px">Mot de l'équipe Everlease</p><p style="font-size:13px;white-space:pre-line;margin:0">${esc(note.trim())}</p></div>` : ''}
  <div style="background:#F2F3F4;border:1px solid #DCDEE1;border-radius:16px;padding:24px;margin-bottom:24px">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:0 0 12px">Entreprise</p>
    <p style="font-size:16px;font-weight:600;margin:0 0 4px">${esc(companyName)}</p>
    <p style="color:#6B6F76;font-size:13px;margin:0">SIREN ${esc(siren)}</p>
  </div>
  <div style="background:#F2F3F4;border:1px solid #DCDEE1;border-radius:16px;padding:24px;margin-bottom:24px">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:0 0 16px">Financement demandé</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#6B6F76;font-size:13px">Montant HT</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px">${fmt(totalAmount)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B6F76;font-size:13px">Durée</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px">${durationMonths} mois</td></tr>
      <tr><td style="padding:6px 0;color:#6B6F76;font-size:13px">Loyer mensuel indicatif</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px">${fmt(monthlyPayment)} HT/mois</td></tr>
    </table>
  </div>
  <div style="background:#F2F3F4;border:1px solid #DCDEE1;border-radius:16px;padding:24px;margin-bottom:24px">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:0 0 12px">Équipements</p>
    <p style="font-size:13px;white-space:pre-line;margin:0">${esc(equipmentList)}</p>
  </div>
  ${documentUrl ? `<p style="margin-bottom:24px"><a href="${esc(documentUrl)}" style="display:inline-block;padding:10px 20px;background:#141517;color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:500">Télécharger le document original</a><br><span style="font-size:12px;color:#6B6F76">Lien valable 7 jours.</span></p>` : ''}
  <p style="font-size:13px;color:#6B6F76">Pour confirmer ou refuser ce dossier, contactez votre référent Everlease. Réf. ${esc(requestRef)}.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">Everlease — Plateforme de financement locatif · contact@everlease.fr</p>
</div>`,
  }
}

export function emailClientEverleaseValidated({
  userEmail,
  companyName,
  leaserName,
  monthlyPayment,
  durationMonths,
  requestRef,
}: {
  userEmail: string
  companyName: string
  leaserName: string
  monthlyPayment: number
  durationMonths: number
  requestRef: string
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return {
    to: userEmail,
    subject: `[Everlease] Votre dossier ${oneLine(requestRef)} est en cours d'examen chez ${oneLine(leaserName)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Votre dossier avance</p>
    <p style="color:#6B6F76;margin:4px 0 0">Bonne nouvelle pour ${esc(companyName)}</p>
  </div>
  <div style="background:#E9ECFF;border:1px solid #E9ECFF;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#1226B0;margin:0">
      Votre dossier a été validé par Everlease et transmis à <strong>${esc(leaserName)}</strong>.
      Le leaser dispose de 48h ouvrées pour confirmer votre offre indicative de <strong>${fmt(monthlyPayment)}/mois sur ${durationMonths} mois</strong>.
    </p>
  </div>
  <p style="font-size:13px;color:#6B6F76">Réf. dossier : ${esc(requestRef)}</p>
  <p style="font-size:13px;color:#6B6F76">Un conseiller Everlease vous contacte dès que le leaser répond. En cas de question, écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">Everlease — Plateforme de financement locatif</p>
</div>`,
  }
}

export function emailClientLeaserConfirmed({
  userEmail,
  companyName,
  leaserName,
  monthlyPayment,
  durationMonths,
  requestRef,
}: {
  userEmail: string
  companyName: string
  leaserName: string
  monthlyPayment: number
  durationMonths: number
  requestRef: string
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return {
    to: userEmail,
    subject: `[Everlease] 🎉 Financement confirmé — ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Financement confirmé !</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#E3F3EC;border:1px solid #E3F3EC;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#0E7C5B;margin:0">
      <strong>${esc(leaserName)}</strong> a accepté votre dossier.
      Votre financement de <strong>${fmt(monthlyPayment)}/mois sur ${durationMonths} mois</strong> est confirmé.
      Votre contrat de location est en cours de préparation.
    </p>
  </div>
  <p style="font-size:13px;color:#6B6F76">Réf. dossier : ${esc(requestRef)}</p>
  <p style="font-size:13px;color:#6B6F76">Vous recevrez votre contrat sous 2 à 3 jours ouvrés. Pour toute question : <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">Everlease — Plateforme de financement locatif</p>
</div>`,
  }
}

export function emailClientLeaserRefused({
  userEmail,
  companyName,
  leaserName,
  requestRef,
}: {
  userEmail: string
  companyName: string
  leaserName: string
  requestRef: string
}) {
  return {
    to: userEmail,
    subject: `[Everlease] Mise à jour de votre dossier ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Mise à jour de votre dossier</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#FFF4E5;border:1px solid #FFF4E5;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#8A4B00;margin:0">
      <strong>${esc(leaserName)}</strong> n'a pas pu donner suite à votre dossier à ce stade.
      Les autres offres que vous avez reçues restent disponibles et votre dossier peut être soumis à d'autres leasers partenaires.
    </p>
  </div>
  <p style="font-size:13px;color:#6B6F76">Réf. dossier : ${esc(requestRef)}</p>
  <p style="font-size:13px;color:#6B6F76">Un conseiller Everlease vous contacte pour étudier les alternatives. Écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">Everlease — Plateforme de financement locatif</p>
</div>`,
  }
}

export function emailClientRequestRefused({
  userEmail,
  companyName,
  message,
  requestRef,
}: {
  userEmail: string
  companyName: string
  // Message rédigé par l'équipe pour le client (le motif interne n'est jamais envoyé)
  message: string
  requestRef: string
}) {
  return {
    to: userEmail,
    subject: `[Everlease] Mise à jour de votre dossier ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Mise à jour de votre dossier</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#FFF4E5;border:1px solid #FFF4E5;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#8A4B00;margin:0;white-space:pre-line">${esc(message)}</p>
  </div>
  <p style="font-size:13px;color:#6B6F76">Réf. dossier : ${esc(requestRef)}</p>
  <p style="font-size:13px;color:#6B6F76">Pour toute question, écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">Everlease — Plateforme de financement locatif</p>
</div>`,
  }
}
