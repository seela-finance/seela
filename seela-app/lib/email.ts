import { Resend } from 'resend'
import { SENSITIVE_RETENTION_DAYS } from '@/lib/pieces'

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
      from: 'everlease <noreply@everlease.fr>',
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
  // Mot de l'équipe everlease ajouté à l'email (facultatif)
  note?: string
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return {
    to: leaserEmail,
    subject: `[everlease] Nouveau dossier de financement — ${oneLine(requestRef)} — ${oneLine(companyName)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Nouveau dossier à étudier</p>
    <p style="color:#6B6F76;margin:4px 0 0">Réf. ${esc(requestRef)} — transmis par everlease</p>
  </div>
  ${note.trim() ? `<div style="border-left:3px solid #141517;padding:4px 0 4px 16px;margin-bottom:24px"><p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:0 0 6px">Mot de l'équipe everlease</p><p style="font-size:13px;white-space:pre-line;margin:0">${esc(note.trim())}</p></div>` : ''}
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
  <p style="font-size:13px;color:#6B6F76">Pour confirmer ou refuser ce dossier, contactez votre référent everlease. Réf. ${esc(requestRef)}.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif · contact@everlease.fr</p>
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
    subject: `[everlease] Votre dossier ${oneLine(requestRef)} est en cours d'examen chez ${oneLine(leaserName)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Votre dossier avance</p>
    <p style="color:#6B6F76;margin:4px 0 0">Bonne nouvelle pour ${esc(companyName)}</p>
  </div>
  <div style="background:#E9ECFF;border:1px solid #E9ECFF;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#1226B0;margin:0">
      Votre dossier a été validé par everlease et transmis à <strong>${esc(leaserName)}</strong>.
      Il étudie votre offre indicative de <strong>${fmt(monthlyPayment)}/mois sur ${durationMonths} mois</strong>, hors assurance et services.
      Sous réserve d'acceptation du dossier par le financeur.
    </p>
  </div>
  <p style="font-size:13px;color:#6B6F76">Réf. dossier : ${esc(requestRef)}</p>
  <p style="font-size:13px;color:#6B6F76">Un conseiller everlease vous contacte dès que le financeur répond. En cas de question, écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif</p>
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
    subject: `[everlease] Financement confirmé — ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Financement confirmé !</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#E3F3EC;border:1px solid #E3F3EC;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#0E7C5B;margin:0">
      <strong>${esc(leaserName)}</strong> a accepté votre dossier.
      Votre financement de <strong>${fmt(monthlyPayment)}/mois sur ${durationMonths} mois</strong>, hors assurance et services, est confirmé.
      Votre contrat de location est en cours de préparation.
    </p>
  </div>
  <p style="font-size:13px;color:#6B6F76">Réf. dossier : ${esc(requestRef)}</p>
  <p style="font-size:13px;color:#6B6F76">Un conseiller everlease vous rappelle sous 24 h ouvrées pour la signature du contrat. Pour toute question : <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif</p>
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
    subject: `[everlease] Mise à jour de votre dossier ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Mise à jour de votre dossier</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#FFF4E5;border:1px solid #FFF4E5;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;color:#8A4B00;margin:0">
      <strong>${esc(leaserName)}</strong> n'a pas pu donner suite à votre dossier à ce stade.
      Les autres offres que vous avez reçues restent disponibles et votre dossier peut être présenté à d'autres financeurs.
    </p>
  </div>
  <p style="font-size:13px;color:#6B6F76">Réf. dossier : ${esc(requestRef)}</p>
  <p style="font-size:13px;color:#6B6F76">Un conseiller everlease vous contacte pour étudier les alternatives. Écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif</p>
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
    subject: `[everlease] Mise à jour de votre dossier ${oneLine(requestRef)}`,
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
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif</p>
</div>`,
  }
}

const EUR = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const MENTIONS = `<p style="font-size:12px;color:#6B6F76;margin:12px 0 0">Offre indicative, hors assurance et services. Sous réserve d'acceptation du dossier par le financeur.</p>`

const FOOTER = (requestRef: string) => `
  <p style="font-size:13px;color:#6B6F76">Réf. dossier : ${esc(requestRef)}</p>
  <p style="font-size:13px;color:#6B6F76">Retrouvez le détail dans votre espace, rubrique « Offres ». Pour toute question : <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a></p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif</p>
</div>`

/** Offre ajoutée par l'équipe (#34). */
export function emailClientNewOffer({
  userEmail, companyName, leaserName, monthlyPayment, durationMonths, requestRef,
}: { userEmail: string; companyName: string; leaserName: string; monthlyPayment: number; durationMonths: number; requestRef: string }) {
  return {
    to: userEmail,
    subject: `[everlease] Nouvelle offre disponible — ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Nouvelle offre disponible</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#FFFFFF;border:1px solid #DCDEE1;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;margin:0">
      Votre conseiller everlease a obtenu une offre de <strong>${esc(leaserName)}</strong> :
      <strong>${EUR(monthlyPayment)} HT / mois sur ${durationMonths} mois</strong>.
    </p>
    ${MENTIONS}
  </div>${FOOTER(requestRef)}`,
  }
}

/** Contre-proposition du financeur (#34) : ancien et nouveau loyer, message de l'équipe. */
export function emailClientCounterOffer({
  userEmail, companyName, leaserName, previousMonthly, monthlyPayment, durationMonths, message, requestRef,
}: {
  userEmail: string; companyName: string; leaserName: string; previousMonthly: number | null
  monthlyPayment: number; durationMonths: number; message: string | null; requestRef: string
}) {
  const before = previousMonthly && previousMonthly !== monthlyPayment
    ? `<span style="color:#6B6F76;text-decoration:line-through">${EUR(previousMonthly)}</span> → ` : ''
  return {
    to: userEmail,
    subject: `[everlease] Contre-proposition à examiner — ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Contre-proposition à examiner</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#FFFFFF;border:1px solid #DCDEE1;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;margin:0">
      <strong>${esc(leaserName)}</strong> propose de nouvelles conditions :
      ${before}<strong>${EUR(monthlyPayment)} HT / mois sur ${durationMonths} mois</strong>.
    </p>
    ${message ? `<p style="font-size:13px;margin:12px 0 0;white-space:pre-line">${esc(message)}</p>` : ''}
    <p style="font-size:13px;margin:12px 0 0">Acceptez-les ou refusez-les depuis votre espace.</p>
    ${MENTIONS}
  </div>${FOOTER(requestRef)}`,
  }
}

/**
 * Invitation du client par un distributeur partenaire : le dossier est prêt, le client le rejoint et
 * choisit son offre. Financeur jamais nommé ; montants indicatifs avec les mentions.
 */
export function emailClientPartnerInvitation({
  clientEmail, partnerName, clientCompanyName, totalAmount, monthlyFrom, durationMonths, link, requestRef,
}: {
  clientEmail: string; partnerName: string; clientCompanyName: string; totalAmount: number
  monthlyFrom: number | null; durationMonths: number; link: string; requestRef: string
}) {
  return {
    to: clientEmail,
    subject: `[everlease] ${oneLine(partnerName)} vous propose de financer votre équipement en loyers`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Votre dossier de financement est prêt</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(clientCompanyName)} · préparé par ${esc(partnerName)}</p>
  </div>
  <div style="background:#FFFFFF;border:1px solid #DCDEE1;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;margin:0 0 12px">
      ${esc(partnerName)} a préparé avec everlease le financement locatif de votre devis de <strong>${EUR(totalAmount)} HT</strong>.
    </p>
    ${monthlyFrom != null ? `<p style="font-size:13px;margin:0">Exemple illustratif : à partir de <strong>${EUR(monthlyFrom)} HT / mois sur ${durationMonths} mois</strong>.</p>${MENTIONS}` : `<p style="font-size:13px;margin:0">Un conseiller everlease étudie votre dossier et vous rappelle sous 24 h ouvrées.</p>`}
  </div>
  <p style="margin-bottom:24px"><a href="${esc(link)}" style="display:inline-block;padding:12px 22px;background:#1F3BFF;color:#fff;border-radius:999px;text-decoration:none;font-size:14px;font-weight:500">Voir mon dossier et choisir mon offre</a><br><span style="font-size:12px;color:#6B6F76">Lien personnel, valable 30 jours, réservé à ${esc(clientEmail)}. Aucune carte ni RIB demandé.</span></p>
  <p style="font-size:13px;color:#6B6F76">Une question ? Écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>. Réf. ${esc(requestRef)}.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif · contact@everlease.fr</p>
</div>`,
  }
}

// ─── Pièces du dossier (docs/pieces-et-compte.md) ──────────────────────────

/** Adresses de l'équipe pour les notifications internes (même réglage que le formulaire expert). */
export const TEAM_EMAILS = (process.env.LEADS_EMAIL ?? 'broutin.louis@gmail.com,aurelien.audelin@gmail.com').split(',').map(s => s.trim()).filter(Boolean)

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.everlease.fr').replace(/\/+$/, '')

/** Un client a déposé une pièce : l'équipe la contrôle depuis la fiche société. Envoyé même hors production. */
export function emailTeamPieceDeposited({ companyName, pieceLabel, companyId }: { companyName: string; pieceLabel: string; companyId: string }) {
  return {
    to: TEAM_EMAILS,
    alwaysSend: true,
    subject: `[everlease] Pièce à contrôler — ${oneLine(companyName)} · ${oneLine(pieceLabel)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Pièce à contrôler</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <p style="font-size:13px;margin:0 0 20px"><strong>${esc(pieceLabel)}</strong> vient d'être déposée. À valider ou refuser depuis la fiche société.</p>
  <p style="margin-bottom:24px"><a href="${APP_URL}/admin/crm/societes/${esc(companyId)}" style="display:inline-block;padding:10px 20px;background:#141517;color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:500">Ouvrir la fiche société</a></p>
</div>`,
  }
}

/** Pièce refusée par l'équipe : le client voit le motif et redépose. */
export function emailClientPieceRefused({ userEmail, companyName, pieceLabel, note }: { userEmail: string; companyName: string; pieceLabel: string; note: string }) {
  return {
    to: userEmail,
    subject: `[everlease] Une pièce de votre dossier est à redéposer — ${oneLine(pieceLabel)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Une pièce est à redéposer</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#FFFFFF;border:1px solid #DCDEE1;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;margin:0 0 8px">Votre conseiller n'a pas pu retenir <strong>${esc(pieceLabel)}</strong> :</p>
    <p style="font-size:13px;margin:0;white-space:pre-line;border-left:3px solid #141517;padding-left:12px">${esc(note)}</p>
  </div>
  <p style="margin-bottom:24px"><a href="${APP_URL}/app/compte" style="display:inline-block;padding:12px 22px;background:#1F3BFF;color:#fff;border-radius:999px;text-decoration:none;font-size:14px;font-weight:500">Redéposer la pièce</a></p>
  <p style="font-size:13px;color:#6B6F76">Une question ? Écrivez-nous à <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif · contact@everlease.fr</p>
</div>`,
  }
}

/** Le financeur a accepté : il reste la pièce d'identité et le RIB pour mettre le contrat en place. */
export function emailClientContractPieces({ userEmail, companyName, requestRef }: { userEmail: string; companyName: string; requestRef: string }) {
  return {
    to: userEmail,
    subject: `[everlease] Dernière étape avant votre contrat — ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Dernière étape avant votre contrat</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)}</p>
  </div>
  <div style="background:#FFFFFF;border:1px solid #DCDEE1;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;margin:0 0 8px">Le financeur a accepté votre dossier. Pour établir le contrat, il lui faut :</p>
    <ul style="font-size:13px;margin:0;padding-left:18px"><li>la pièce d'identité du dirigeant (recto verso) ;</li><li>un RIB pour le prélèvement des loyers.</li></ul>
    <p style="font-size:12px;color:#6B6F76;margin:12px 0 0">Ces documents sont effacés de nos serveurs ${SENSITIVE_RETENTION_DAYS} jours après la mise en place du contrat.</p>
  </div>
  <p style="margin-bottom:24px"><a href="${APP_URL}/app/compte" style="display:inline-block;padding:12px 22px;background:#1F3BFF;color:#fff;border-radius:999px;text-decoration:none;font-size:14px;font-weight:500">Déposer mes pièces</a></p>
  <p style="font-size:13px;color:#6B6F76">Réf. ${esc(requestRef)}. Une question ? <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif · contact@everlease.fr</p>
</div>`,
  }
}

// ─── Demandes du client sur son contrat (docs/contrat-client.md) ────────────

/** Un client a fait une demande sur son contrat : l'équipe la traite depuis la fiche dossier. Envoyé même hors production. */
export function emailTeamContractRequest({ companyName, requestRef, requestId, kindLabel, message }: {
  companyName: string; requestRef: string; requestId: string; kindLabel: string; message: string
}) {
  return {
    to: TEAM_EMAILS,
    alwaysSend: true,
    subject: `[everlease] Demande client — ${oneLine(kindLabel)} · ${oneLine(companyName)} · ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">${esc(kindLabel)}</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)} · ${esc(requestRef)}</p>
  </div>
  <div style="background:#FFFFFF;border:1px solid #DCDEE1;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;margin:0;white-space:pre-line;border-left:3px solid #141517;padding-left:12px">${esc(message)}</p>
  </div>
  <p style="font-size:13px;margin:0 0 20px">À prendre en charge sous 24 h ouvrées : le client voit l'état de sa demande sur sa fiche contrat.</p>
  <p style="margin-bottom:24px"><a href="${APP_URL}/admin/dossiers/${esc(requestId)}" style="display:inline-block;padding:10px 20px;background:#141517;color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:500">Ouvrir le dossier</a></p>
</div>`,
  }
}

/** L'équipe a répondu : le client lit la réponse sur sa fiche contrat. */
export function emailClientContractRequestAnswered({ userEmail, companyName, requestRef, requestId, kindLabel, answer }: {
  userEmail: string; companyName: string; requestRef: string; requestId: string; kindLabel: string; answer: string
}) {
  return {
    to: userEmail,
    subject: `[everlease] Réponse à votre demande — ${oneLine(kindLabel)} · ${oneLine(requestRef)}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Votre conseiller a répondu</p>
    <p style="color:#6B6F76;margin:4px 0 0">${esc(companyName)} · ${esc(kindLabel)}</p>
  </div>
  <div style="background:#FFFFFF;border:1px solid #DCDEE1;border-radius:16px;padding:20px;margin-bottom:24px">
    <p style="font-size:13px;margin:0;white-space:pre-line;border-left:3px solid #141517;padding-left:12px">${esc(answer)}</p>
  </div>
  <p style="margin-bottom:24px"><a href="${APP_URL}/app/contrats/${esc(requestId)}" style="display:inline-block;padding:12px 22px;background:#1F3BFF;color:#fff;border-radius:999px;text-decoration:none;font-size:14px;font-weight:500">Voir mon contrat</a></p>
  <p style="font-size:13px;color:#6B6F76">Réf. ${esc(requestRef)}. Une question ? <a href="mailto:contact@everlease.fr" style="color:#1F3BFF">contact@everlease.fr</a>.</p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">everlease — Plateforme de financement locatif · contact@everlease.fr</p>
</div>`,
  }
}
