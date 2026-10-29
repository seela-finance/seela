import { test, expect } from '@playwright/test'
import { recommendedOffer, sortOffers, formatRate, leaserInitials } from '../../lib/offers'

const offer = (id: string, monthly_payment: number, duration_months = 36, status = 'indicative') =>
  ({ id, monthly_payment, duration_months, status })

test.describe('Recommandation des offres', () => {
  test('recommande la mensualité la plus basse', () => {
    expect(recommendedOffer([offer('a', 320), offer('b', 290), offer('c', 310)])?.id).toBe('b')
  })

  test('à égalité de loyer, la durée la plus courte', () => {
    expect(recommendedOffer([offer('a', 300, 48), offer('b', 300, 36)])?.id).toBe('b')
  })

  test('une offre refusée n’est jamais recommandée', () => {
    expect(recommendedOffer([offer('a', 100, 36, 'refused'), offer('b', 300), offer('c', 310)])?.id).toBe('b')
  })

  test('pas de recommandation avec moins de 2 offres éligibles', () => {
    expect(recommendedOffer([offer('a', 300)])).toBeNull()
    expect(recommendedOffer([offer('a', 300), offer('b', 200, 36, 'refused')])).toBeNull()
  })

  test('tri : recommandée en tête, refusées en dernier', () => {
    const sorted = sortOffers([offer('a', 320), offer('r', 100, 36, 'refused'), offer('b', 290)])
    expect(sorted.map(o => o.id)).toEqual(['b', 'a', 'r'])
  })
})

test.describe('Affichage', () => {
  test('taux réel formaté, jamais de valeur par défaut', () => {
    expect(formatRate(4.85)).toBe('4,85 %')
    expect(formatRate(null)).toBeNull()
    expect(formatRate(undefined)).toBeNull()
  })

  test('initiales de tout leaser, pas seulement les 3 historiques', () => {
    expect(leaserInitials('BNP Lease')).toBe('BL')
    expect(leaserInitials('Grenke')).toBe('G')
    expect(leaserInitials('Leasecom Financement Équipement')).toBe('LF')
  })
})
