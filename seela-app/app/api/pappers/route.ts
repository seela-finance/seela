import { NextResponse } from 'next/server'

// Code INSEE → libellé forme juridique (principales formes)
const FORME_JURIDIQUE: Record<string, string> = {
  '1000': 'Entrepreneur individuel',
  '5410': 'SARL',
  '5498': 'EURL',
  '5499': 'SA',
  '5505': 'SA à conseil d\'administration',
  '5710': 'SAS',
  '5720': 'SASU',
  '5800': 'Société européenne',
  '6540': 'SA coopérative',
  '9220': 'Association loi 1901',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const siren = searchParams.get('siren')?.replace(/\s/g, '')

  if (!siren || siren.length !== 9) {
    return NextResponse.json({ error: 'SIREN invalide' }, { status: 400 })
  }

  try {
    // API Recherche Entreprises — data.gouv.fr, gratuite, sans authentification
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=3`,
      { next: { revalidate: 86400 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    const data = await res.json()
    // Trouver le résultat avec le SIREN exact
    const result = (data.results ?? []).find((r: { siren: string }) => r.siren === siren)

    if (!result) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    const njCode: string = result.nature_juridique ?? ''
    const formeJuridique = FORME_JURIDIQUE[njCode] ?? null

    return NextResponse.json({
      denomination: result.nom_complet ?? null,
      forme_juridique: formeJuridique,
      annee_creation: result.date_creation
        ? new Date(result.date_creation).getFullYear()
        : null,
      tranche_effectif: result.tranche_effectif_salarie ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la recherche' }, { status: 500 })
  }
}
