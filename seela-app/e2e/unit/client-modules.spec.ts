import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Une valeur (constante, enum, classe) exportée d'un module 'use client' devient une
// référence client quand une page serveur l'importe : `.map` y plante en prod.
// Les composants (fonctions) sont les seuls exports autorisés.

const ROOTS = ['app', 'components', 'lib']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    // Ignore les doublons iCloud (« fichier 2.tsx »)
    return /\.tsx?$/.test(name) && !/ \d+\.tsx?$/.test(name) ? [path] : []
  })
}

test('aucun module client n’exporte de valeur non-composant', () => {
  const offenders = ROOTS.flatMap(sourceFiles).flatMap(file => {
    const src = readFileSync(file, 'utf8')
    if (!/^\s*['"]use client['"]/.test(src)) return []
    return [...src.matchAll(/^export\s+(?:const|let|var|enum|class)\s+(\w+)/gm)].map(m => `${file}: ${m[1]}`)
  })
  expect(offenders).toEqual([])
})
