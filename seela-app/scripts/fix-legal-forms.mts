// Génère le SQL de correction de profiles.legal_form (bug #42 : code INSEE 5499 affiché « SA »).
// N'écrit rien en base : imprime des UPDATE à relire puis exécuter dans le SQL editor Supabase.
//
// 1. Dans Supabase : SELECT siren FROM profiles WHERE legal_form IN ('Société anonyme', 'SA') AND siren IS NOT NULL;
// 2. node --experimental-strip-types scripts/fix-legal-forms.mts 944710367 123456789 …
import { legalFormLabel } from '../lib/legal-forms.ts'

const sirens = process.argv.slice(2).filter(s => /^\d{9}$/.test(s))
if (sirens.length === 0) {
  console.error('Usage : node --experimental-strip-types scripts/fix-legal-forms.mts <siren> [siren…]')
  process.exit(1)
}

for (const siren of sirens) {
  const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=3`)
  const data = (await res.json()) as { results?: { siren: string; nature_juridique?: string }[] }
  const company = data.results?.find(r => r.siren === siren)
  const label = legalFormLabel(company?.nature_juridique)
  if (!label) {
    console.log(`-- ${siren} : introuvable, à vérifier à la main`)
    continue
  }
  console.log(`UPDATE profiles SET legal_form = '${label.replace(/'/g, "''")}' WHERE siren = '${siren}'; -- code ${company?.nature_juridique}`)
  await new Promise(r => setTimeout(r, 150)) // l'API publique limite le débit
}
