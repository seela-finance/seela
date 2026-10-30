import { test, expect } from '@playwright/test'
import { legalFormLabel, legalFormShort, inseeLegalFormLabel } from '../../lib/legal-forms'

test.describe('Formes juridiques INSEE', () => {
  test('5499 est une SARL, jamais une SA (bug SIREN 944710367)', () => {
    expect(legalFormShort('5499')).toBe('SARL')
    expect(legalFormLabel('5499')).toBe('Société à responsabilité limitée')
  })

  test('sigles des formes courantes', () => {
    expect(legalFormShort('1000')).toBe('EI')
    expect(legalFormShort('5410')).toBe('SARL')
    expect(legalFormShort('5485')).toBe('SELARL')
    expect(legalFormShort('5599')).toBe('SA')
    expect(legalFormShort('5699')).toBe('SA')
    expect(legalFormShort('5710')).toBe('SAS')
    expect(legalFormShort('5785')).toBe('SELAS')
    expect(legalFormShort('5202')).toBe('SNC')
    expect(legalFormShort('6540')).toBe('SCI')
    expect(legalFormShort('9220')).toBe('Association')
  })

  test('anciens codes unipersonnels', () => {
    expect(legalFormShort('5498')).toBe('EURL')
    expect(legalFormShort('5720')).toBe('SASU')
  })

  test('libellé officiel INSEE disponible', () => {
    expect(inseeLegalFormLabel('5499')).toBe('Société à responsabilité limitée (sans autre indication)')
    expect(inseeLegalFormLabel('5710')).toBe('SAS, société par actions simplifiée')
  })

  test('code inconnu : jamais une forme devinée', () => {
    expect(legalFormLabel('1234')).toBe('Autre (code 1234)')
    expect(legalFormShort('1234')).toBeNull()
    expect(legalFormLabel('')).toBeNull()
    expect(legalFormLabel(null)).toBeNull()
  })

  // Le score Everlease détecte la forme par sous-chaîne (app/api/score-seela).
  test('libellés compatibles avec le scoring', () => {
    for (const code of ['5410', '5485', '5499', '5498']) {
      expect(legalFormLabel(code)!.toLowerCase()).toContain('responsabilité limitée')
    }
    for (const code of ['5710', '5720', '5785']) {
      expect(legalFormLabel(code)!.toLowerCase()).toContain('actions simplifiée')
    }
  })
})

test('EARL : responsabilité limitée, pas société civile', () => {
  expect(legalFormShort('6598')).toBe('EARL')
  expect(legalFormLabel('6598')!.toLowerCase()).toContain('responsabilité limitée')
})
