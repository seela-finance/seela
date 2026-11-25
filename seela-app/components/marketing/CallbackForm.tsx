'use client'

// Formulaire de rappel intégré à la page (Solutions, Secteurs, Métiers, pages
// money, blog). Remplace l'ancien lien mailto « Parler à un expert » : cinq
// champs, envoyés à l'API de lead existante (/api/contact-expert), qui prévient
// l'équipe et crée le lead dans le CRM. `origine` dit de quelle page vient la
// demande. Le rôle n'est pas demandé ici : l'API l'exige, on l'envoie « Non
// précisé ».
import React from 'react'
import Link from 'next/link'
import { BtnGauge } from '@/components/landing/Gauge'
import { track } from '@/lib/track'

type Fields = { company: string; first: string; last: string; email: string; phone: string }
type FieldKey = keyof Fields

const EMPTY: Fields = { company: '', first: '', last: '', email: '', phone: '' }

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.company.trim()) e.company = 'Indiquez le nom de votre entreprise.'
  if (!f.first.trim()) e.first = 'Votre prénom est requis.'
  if (!f.last.trim()) e.last = 'Votre nom est requis.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) e.email = 'Entrez une adresse e-mail valide.'
  if (f.phone.replace(/\D/g, '').length < 9) e.phone = 'Entrez un numéro à 10 chiffres.'
  return e
}

export default function CallbackForm({ origine }: { origine: string }) {
  const [f, setF] = React.useState<Fields>(EMPTY)
  const [submitted, setSubmitted] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [netError, setNetError] = React.useState<string | null>(null)

  const errs = submitted ? validate(f) : {}
  const hasErrors = Object.keys(errs).length > 0
  const set = (k: FieldKey) => (ev: React.ChangeEvent<HTMLInputElement>) => setF((prev) => ({ ...prev, [k]: ev.target.value }))
  const cls = (k: FieldKey, extra = '') => `field${extra}${errs[k] ? ' err' : ''}`

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    setNetError(null)
    if (Object.keys(validate(f)).length > 0 || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/contact-expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entreprise: f.company.trim(),
          prenom: f.first.trim(),
          nom: f.last.trim(),
          role: 'Non précisé',
          devis: null,
          email: f.email.trim(),
          telephone: f.phone.trim(),
          origine,
        }),
      })
      if (!res.ok) throw new Error('request failed')
      track('demande_expert')
      setSent(true)
    } catch {
      setNetError('Une erreur est survenue. Réessayez ou écrivez-nous à contact@everlease.fr.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div id="rappel" className="mk-form sent">
        <div role="status">
        <div className="ok-mark" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <h3>Merci, c&apos;est noté.</h3>
        <p className="mk-form__sub">Notre équipe vous rappelle sous 24&nbsp;h ouvrées au numéro indiqué. Si vous avez déjà un devis, gardez-le sous la main.</p>
        </div>
        <div className="cta-row" style={{ marginTop: 20 }}>
          <Link className="btn btn--primary" href="/auth"><BtnGauge />Déposer un devis maintenant</Link>
        </div>
      </div>
    )
  }

  return (
    <div id="rappel" className="mk-form">
      <h3>Parler à un expert</h3>
      <p className="mk-form__sub">Laissez vos coordonnées, notre équipe vous rappelle sous 24&nbsp;h ouvrées.</p>
      <form className="form" onSubmit={submit} noValidate aria-label="Être rappelé par notre équipe">
        <div className={cls('company', ' full')}>
          <label htmlFor="cb-company">Entreprise</label>
          <input id="cb-company" name="company" type="text" autoComplete="organization" value={f.company} onChange={set('company')} aria-invalid={!!errs.company} />
          <div className="msg">{errs.company}</div>
        </div>
        <div className={cls('first')}>
          <label htmlFor="cb-first">Prénom</label>
          <input id="cb-first" name="first" type="text" autoComplete="given-name" value={f.first} onChange={set('first')} aria-invalid={!!errs.first} />
          <div className="msg">{errs.first}</div>
        </div>
        <div className={cls('last')}>
          <label htmlFor="cb-last">Nom</label>
          <input id="cb-last" name="last" type="text" autoComplete="family-name" value={f.last} onChange={set('last')} aria-invalid={!!errs.last} />
          <div className="msg">{errs.last}</div>
        </div>
        <div className={cls('email')}>
          <label htmlFor="cb-email">E-mail professionnel</label>
          <input id="cb-email" name="email" type="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={!!errs.email} />
          <div className="msg">{errs.email}</div>
        </div>
        <div className={cls('phone')}>
          <label htmlFor="cb-phone">Téléphone</label>
          <input id="cb-phone" name="phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} aria-invalid={!!errs.phone} />
          <div className="msg">{errs.phone}</div>
        </div>
        <div className="form__foot">
          {hasErrors && <div className="alert" role="alert">Certains champs sont à corriger avant l&apos;envoi.</div>}
          {netError && <div className="alert" role="alert">{netError}</div>}
          <button className="btn btn--primary" type="submit" disabled={sending}>
            <BtnGauge />
            {sending ? 'Envoi en cours…' : 'Être rappelé'}
          </button>
          <p className="legal" style={{ margin: 0 }}>Aucune carte ni RIB demandé. Vos coordonnées servent uniquement à vous rappeler. <Link href="/confidentialite" style={{ textDecoration: 'underline' }}>Confidentialité</Link>.</p>
        </div>
      </form>
    </div>
  )
}
