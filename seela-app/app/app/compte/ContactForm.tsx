'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveOnboardingContact } from '@/app/app/onboarding/actions'

const ROLES = [
  { key: 'dirigeant', label: 'Dirigeant / Gérant' },
  { key: 'daf', label: 'Directeur Financier (DAF)' },
  { key: 'dg', label: 'Directeur Général' },
  { key: 'office_manager', label: 'Office Manager' },
]

export default function ContactForm({ initial, email }: { initial: { first_name: string; last_name: string; phone: string; role: string }; email: string }) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    const res = await saveOnboardingContact(form)
    if (!res.ok) { setState('error'); setMessage(res.message); return }
    setState('saved')
    setMessage('Coordonnées enregistrées.')
    router.refresh()
  }

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setForm(f => ({ ...f, [key]: e.target.value })); setState('idle') }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 sm:px-5 py-4">
      <label className="block"><span className="ev-label">Prénom</span><input value={form.first_name} onChange={field('first_name')} required className="ev-input" /></label>
      <label className="block"><span className="ev-label">Nom</span><input value={form.last_name} onChange={field('last_name')} required className="ev-input" /></label>
      <label className="block"><span className="ev-label">Téléphone</span><input value={form.phone} onChange={field('phone')} type="tel" className="ev-input" /></label>
      <label className="block"><span className="ev-label">Fonction</span>
        <select value={form.role} onChange={field('role')} className="ev-input">
          <option value="">Choisir…</option>
          {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </label>
      <p className="text-xs sm:col-span-2" style={{ color: 'var(--ink-3)' }}>Email de connexion : <span style={{ color: 'var(--ink)' }}>{email}</span>. Pour en changer, écrivez-nous à contact@everlease.fr.</p>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={state === 'saving'} className="ev-btn ev-btn--primary ev-btn--sm">{state === 'saving' ? 'Enregistrement…' : 'Enregistrer'}</button>
        {message && <p role="status" className="text-xs" style={{ color: state === 'error' ? 'var(--danger)' : 'var(--ok)' }}>{message}</p>}
      </div>
    </form>
  )
}
