import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const EMAIL_MODE = process.env.EMAIL_MODE ?? 'development'
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? 'broutin.louis@gmail.com'

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const recipient = EMAIL_MODE !== 'production' ? FOUNDER_EMAIL : to

  if (EMAIL_MODE !== 'production') {
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
      subject,
      html,
    })
    return { success: true, id: result.data?.id }
  } catch (err) {
    console.error('[EMAIL] Error:', err)
    return { success: false, error: err }
  }
}

// ── Email templates ──────────────────────────────────────────────

export function emailLeaserValidation({
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
}: {
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
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return {
    to: `leasing@${leaserName.toLowerCase().replace(/\s+/g, '')}.fr`,
    subject: `[Everlease] Nouveau dossier de financement — ${requestRef} — ${companyName}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#0E0E0C">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Nouveau dossier à étudier</p>
    <p style="color:#9A9A93;margin:4px 0 0">Réf. ${requestRef} — transmis par Everlease</p>
  </div>
  <div style="background:#FAFAF9;border:1px solid #E5E5E3;border-radius:12px;padding:24px;margin-bottom:24px">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9A9A93;margin:0 0 12px">Entreprise</p>
    <p style="font-size:16px;font-weight:600;margin:0 0 4px">${companyName}</p>
    <p style="color:#9A9A93;font-size:13px;margin:0">SIREN ${siren}</p>
  </div>
  <div style="background:#FAFAF9;border:1px solid #E5E5E3;border-radius:12px;padding:24px;margin-bottom:24px">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9A9A93;margin:0 0 16px">Financement demandé</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#9A9A93;font-size:13px">Montant HT</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px">${fmt(totalAmount)}</td></tr>
      <tr><td style="padding:6px 0;color:#9A9A93;font-size:13px">Durée</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px">${durationMonths} mois</td></tr>
      <tr><td style="padding:6px 0;color:#9A9A93;font-size:13px">Loyer mensuel indicatif</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px">${fmt(monthlyPayment)} HT/mois</td></tr>
    </table>
  </div>
  <div style="background:#FAFAF9;border:1px solid #E5E5E3;border-radius:12px;padding:24px;margin-bottom:24px">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9A9A93;margin:0 0 12px">Équipements</p>
    <p style="font-size:13px;white-space:pre-line;margin:0">${equipmentList}</p>
  </div>
  ${documentUrl ? `<p style="margin-bottom:24px"><a href="${documentUrl}" style="display:inline-block;padding:10px 20px;background:#0E0E0C;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500">Télécharger le document original</a></p>` : ''}
  <p style="font-size:13px;color:#9A9A93">Pour confirmer ou refuser ce dossier, contactez votre référent Everlease. Réf. ${requestRef}.</p>
  <hr style="border:none;border-top:1px solid #E5E5E3;margin:24px 0">
  <p style="font-size:11px;color:#9A9A93">Everlease — Plateforme de financement locatif · contact@everlease.fr</p>
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
    subject: `[Everlease] Votre dossier ${requestRef} est en cours d'examen chez ${leaserName}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#0E0E0C">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Votre dossier avance</p>
    <p style="color:#9A9A93;margin:4px 0 0">Bonne nouvelle pour ${companyName}</p>
  </div>
  <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:12px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#3730A3;margin:0">
      Votre dossier a été validé par Everlease et transmis à <strong>${leaserName}</strong>.
      Le leaser dispose de 48h ouvrées pour confirmer votre offre indicative de <strong>${fmt(monthlyPayment)}/mois sur ${durationMonths} mois</strong>.
    </p>
  </div>
  <p style="font-size:13px;color:#9A9A93">Réf. dossier : ${requestRef}</p>
  <p style="font-size:13px;color:#9A9A93">Un conseiller Everlease vous contacte dès que le leaser répond. En cas de question, écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#4F46E5">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #E5E5E3;margin:24px 0">
  <p style="font-size:11px;color:#9A9A93">Everlease — Plateforme de financement locatif</p>
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
    subject: `[Everlease] 🎉 Financement confirmé — ${requestRef}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#0E0E0C">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Financement confirmé !</p>
    <p style="color:#9A9A93;margin:4px 0 0">${companyName}</p>
  </div>
  <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#166534;margin:0">
      <strong>${leaserName}</strong> a accepté votre dossier.
      Votre financement de <strong>${fmt(monthlyPayment)}/mois sur ${durationMonths} mois</strong> est confirmé.
      Votre contrat de location est en cours de préparation.
    </p>
  </div>
  <p style="font-size:13px;color:#9A9A93">Réf. dossier : ${requestRef}</p>
  <p style="font-size:13px;color:#9A9A93">Vous recevrez votre contrat sous 2 à 3 jours ouvrés. Pour toute question : <a href="mailto:contact@everlease.fr" style="color:#4F46E5">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #E5E5E3;margin:24px 0">
  <p style="font-size:11px;color:#9A9A93">Everlease — Plateforme de financement locatif</p>
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
    subject: `[Everlease] Mise à jour de votre dossier ${requestRef}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#0E0E0C">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Mise à jour de votre dossier</p>
    <p style="color:#9A9A93;margin:4px 0 0">${companyName}</p>
  </div>
  <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#92400E;margin:0">
      <strong>${leaserName}</strong> n'a pas pu donner suite à votre dossier à ce stade.
      Les autres offres que vous avez reçues restent disponibles et votre dossier peut être soumis à d'autres leasers partenaires.
    </p>
  </div>
  <p style="font-size:13px;color:#9A9A93">Réf. dossier : ${requestRef}</p>
  <p style="font-size:13px;color:#9A9A93">Un conseiller Everlease vous contacte pour étudier les alternatives. Écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#4F46E5">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #E5E5E3;margin:24px 0">
  <p style="font-size:11px;color:#9A9A93">Everlease — Plateforme de financement locatif</p>
</div>`,
  }
}
