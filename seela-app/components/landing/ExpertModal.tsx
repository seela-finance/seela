'use client'

// Modale « Parler à un expert » : formulaire contrôlé, erreurs par champ,
// état envoyé. Branchée sur l'envoi de lead existant (/api/contact-expert).
// Trois provenances (kicker) : rappel par un conseiller, fournisseurs et
// distributeurs, financeurs.
import React from 'react'
import Link from 'next/link'
import { BtnGauge } from './Gauge'

export type ModalKind = 'expert' | 'partner' | 'funder'

const KICKER: Record<ModalKind, string> = {
  expert: 'Rappel par un conseiller',
  partner: 'Fournisseurs et distributeurs',
  funder: 'Financeurs',
}

type Fields = { company: string; first: string; last: string; role: string; has: '' | 'oui' | 'non'; email: string; phone: string }
type FieldKey = keyof Fields

const EMPTY: Fields = { company: '', first: '', last: '', role: '', has: '', email: '', phone: '' }

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.company.trim()) e.company = 'Indiquez le nom de votre entreprise.'
  if (!f.first.trim()) e.first = 'Votre prénom est requis.'
  if (!f.last.trim()) e.last = 'Votre nom est requis.'
  if (!f.role.trim()) e.role = 'Précisez votre rôle.'
  if (!f.has) e.has = 'Choisissez une réponse.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) e.email = 'Entrez une adresse e-mail valide.'
  if (f.phone.replace(/\D/g, '').length < 9) e.phone = 'Entrez un numéro à 10 chiffres.'
  return e
}

export default function ExpertModal({ kind, onClose }: { kind: ModalKind; onClose: () => void }) {
  const [f, setF] = React.useState<Fields>(EMPTY)
  const [submitted, setSubmitted] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [netError, setNetError] = React.useState<string | null>(null)
  const firstRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

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
          role: f.role.trim(),
          devis: f.has,
          email: f.email.trim(),
          telephone: f.phone.trim(),
          origine: KICKER[kind],
        }),
      })
      if (!res.ok) throw new Error('request failed')
      setSent(true)
    } catch {
      setNetError('Une erreur est survenue. Réessayez ou écrivez-nous à contact@everlease.fr.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal__bg" onClick={onClose} />
      <div className="modal__card">
        <button className="modal__close" type="button" aria-label="Fermer" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        {!sent ? (
          <>
            <div className="kicker">{KICKER[kind]}</div>
            <h2 id="modal-title" className="display h3" style={{ marginTop: 10, fontSize: 28 }}>Parler à un expert</h2>
            <p className="small" style={{ margin: '8px 0 0', color: 'var(--ink-2)' }}>Un conseiller vous rappelle sous 24&nbsp;h ouvrées. Aucune carte ni RIB demandé.</p>
            <form className="form" onSubmit={submit} noValidate>
              <div className={cls('company', ' full')}>
                <label htmlFor="f-company">Entreprise</label>
                <input ref={firstRef} id="f-company" name="company" type="text" autoComplete="organization" value={f.company} onChange={set('company')} />
                <div className="msg">{errs.company}</div>
              </div>
              <div className={cls('first')}>
                <label htmlFor="f-first">Prénom</label>
                <input id="f-first" name="first" type="text" autoComplete="given-name" value={f.first} onChange={set('first')} />
                <div className="msg">{errs.first}</div>
              </div>
              <div className={cls('last')}>
                <label htmlFor="f-last">Nom</label>
                <input id="f-last" name="last" type="text" autoComplete="family-name" value={f.last} onChange={set('last')} />
                <div className="msg">{errs.last}</div>
              </div>
              <div className={cls('role', ' full')}>
                <label htmlFor="f-role">Rôle dans l&apos;entreprise</label>
                <input id="f-role" name="role" type="text" autoComplete="organization-title" value={f.role} onChange={set('role')} />
                <div className="msg">{errs.role}</div>
              </div>
              <fieldset className={cls('has', ' full')} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                <legend style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', padding: 0, marginBottom: 6 }}>Avez-vous une première demande de financement à soumettre&nbsp;?</legend>
                <div className="radios">
                  <label className={f.has === 'oui' ? 'on' : undefined}>
                    <input type="radio" name="has" value="oui" checked={f.has === 'oui'} onChange={() => setF((p) => ({ ...p, has: 'oui' }))} />
                    Oui, j&apos;ai un devis ou une facture
                  </label>
                  <label className={f.has === 'non' ? 'on' : undefined}>
                    <input type="radio" name="has" value="non" checked={f.has === 'non'} onChange={() => setF((p) => ({ ...p, has: 'non' }))} />
                    Pas encore
                  </label>
                </div>
                <div className="msg">{errs.has}</div>
              </fieldset>
              <div className={cls('email')}>
                <label htmlFor="f-email">E-mail professionnel</label>
                <input id="f-email" name="email" type="email" autoComplete="email" value={f.email} onChange={set('email')} />
                <div className="msg">{errs.email}</div>
              </div>
              <div className={cls('phone')}>
                <label htmlFor="f-phone">Téléphone</label>
                <input id="f-phone" name="phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} />
                <div className="msg">{errs.phone}</div>
              </div>
              <div className="form__foot">
                {hasErrors && <div className="alert" role="alert">Certains champs sont à corriger avant l&apos;envoi.</div>}
                {netError && <div className="alert" role="alert">{netError}</div>}
                <button className="btn btn--primary" type="submit" disabled={sending} style={{ justifyContent: 'center' }}>
                  <BtnGauge />
                  {sending ? 'Envoi en cours…' : 'Être rappelé'}
                </button>
                <p className="legal" style={{ margin: 0 }}>Vos coordonnées servent uniquement à vous rappeler. <Link href="/confidentialite" style={{ textDecoration: 'underline' }}>Confidentialité</Link>.</p>
              </div>
            </form>
          </>
        ) : (
          <div className="sent">
            <div className="ok-mark" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <h2 id="modal-title" className="display h3" style={{ fontSize: 28 }}>Merci, c&apos;est noté.</h2>
            <p className="lede" style={{ fontSize: 16, marginTop: 10 }}>Un conseiller everlease vous rappelle sous 24&nbsp;h ouvrées au numéro indiqué. Si vous avez déjà un devis, gardez-le sous la main.</p>
            <div className="cta-row" style={{ marginTop: 22 }}>
              <Link className="btn btn--primary" href="/auth">Déposer un devis maintenant</Link>
              <button className="btn btn--ghost" type="button" onClick={onClose}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
