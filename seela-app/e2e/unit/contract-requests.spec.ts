import { test, expect } from '@playwright/test'
import {
  availableKinds, buildSchedule, canTransition, parseContractRequest, partnerSummary,
} from '../../lib/contract-requests'

test('natures ouvertes : tout une fois actif, matériel et administratif dès l’accord du financeur, rien avant', () => {
  expect(availableKinds('active')).toEqual(['report_echeance', 'rachat_anticipe', 'materiel', 'administratif'])
  expect(availableKinds('leaser_confirmed')).toEqual(['materiel', 'administratif'])
  expect(availableKinds('seela_validated')).toEqual([])
  expect(availableKinds(null)).toEqual([])
})

test('saisie du client : nature connue et ouverte, message de 10 à 2000 caractères, fins de ligne normalisées', () => {
  expect(parseContractRequest({ kind: 'report_echeance', message: 'Échéance de janvier, trésorerie saisonnière.' }, 'active'))
    .toEqual({ ok: true, kind: 'report_echeance', message: 'Échéance de janvier, trésorerie saisonnière.' })
  expect(parseContractRequest({ kind: 'report_echeance', message: 'Échéance de janvier, trésorerie saisonnière.' }, 'leaser_confirmed'))
    .toEqual({ ok: false, error: 'Cette demande n’est pas possible à ce stade du contrat.' })
  expect(parseContractRequest({ kind: 'autre', message: 'Un message assez long.' }, 'active').ok).toBe(false)
  expect(parseContractRequest({ kind: 'administratif', message: 'court' }, 'active').ok).toBe(false)
  expect(parseContractRequest({ kind: 'administratif', message: 'x'.repeat(2001) }, 'active').ok).toBe(false)
  const r = parseContractRequest({ kind: 'administratif', message: '  Attestation\r\nde loyers  ' }, 'active')
  expect(r).toEqual({ ok: true, kind: 'administratif', message: 'Attestation\nde loyers' })
})

test('transitions de l’équipe : reçue → en cours → répondue → close ; une demande close ne bouge plus', () => {
  expect(canTransition('recue', 'en_cours')).toBe(true)
  expect(canTransition('recue', 'repondue')).toBe(true)
  expect(canTransition('en_cours', 'repondue')).toBe(true)
  expect(canTransition('repondue', 'en_cours')).toBe(true)
  expect(canTransition('repondue', 'close')).toBe(true)
  expect(canTransition('close', 'en_cours')).toBe(false)
  expect(canTransition('inconnu', 'close')).toBe(false)
})

test('résumé partenaire : natures et états des demandes ouvertes, sans le message ; null sans demande ouverte', () => {
  expect(partnerSummary([])).toBeNull()
  expect(partnerSummary([{ kind: 'materiel', status: 'close' }])).toBeNull()
  expect(partnerSummary([{ kind: 'report_echeance', status: 'recue' }, { kind: 'materiel', status: 'en_cours' }, { kind: 'administratif', status: 'repondue' }]))
    .toBe('Report d’échéance · reçue ; Ajout ou remplacement de matériel · en cours')
})

test('échéancier indicatif : une échéance par mois depuis le démarrage, les passées réglées, la prochaine repérée, fin de mois respectée', () => {
  const today = new Date('2026-11-24T10:00:00Z')
  const s = buildSchedule('2026-08-31', 36, 420, today)!
  expect(s.lines).toHaveLength(36)
  expect(s.lines.slice(0, 4).map(l => l.date)).toEqual(['2026-08-31', '2026-09-30', '2026-10-31', '2026-11-30'])
  expect(s.paid).toBe(3)
  expect(s.remaining).toBe(33)
  expect(s.next).toEqual({ index: 4, date: '2026-11-30', amount: 420, state: 'prochaine' })
  expect(s.end).toBe('2029-07-31')
  expect(s.lines[35].state).toBe('a_venir')
  // Démarrage le jour même : la première échéance est la prochaine, rien de réglé
  const fresh = buildSchedule('2026-11-24', 24, 100, today)!
  expect(fresh.paid).toBe(0)
  expect(fresh.next?.index).toBe(1)
  // Contrat terminé : tout réglé, pas de prochaine
  const over = buildSchedule('2020-01-15', 12, 100, today)!
  expect(over.remaining).toBe(0)
  expect(over.next).toBeNull()
  expect(buildSchedule(null, 36, 420, today)).toBeNull()
  expect(buildSchedule('2026-08-31', 36, null, today)).toBeNull()
  expect(buildSchedule('31/08/2026', 36, 420, today)).toBeNull()
})
