import { NextResponse } from 'next/server'

const LEGAL_FORMS: Record<string, string> = {
  '1000': 'Entrepreneur individuel',
  '1100': 'Auto-entrepreneur',
  '5410': 'Société à responsabilité limitée',
  '5498': 'EURL',
  '5499': 'Société anonyme',
  '5505': "Société anonyme à conseil d'administration",
  '5710': 'Société par actions simplifiée',
  '5720': 'Société par actions simplifiée unipersonnelle',
  '5800': 'Société européenne',
  '5300': 'Société en nom collectif',
  '6540': 'SA coopérative',
  '9220': 'Association loi 1901',
}

function formatSiren(siren: string): string {
  const s = siren.replace(/\s/g, '')
  return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)}`
}

function buildAddress(siege: Record<string, string | number | null> | null): string {
  if (!siege) return ''
  const parts: string[] = []
  if (siege.numero_voie) parts.push(String(siege.numero_voie))
  if (siege.type_voie) parts.push(String(siege.type_voie))
  if (siege.libelle_voie) parts.push(String(siege.libelle_voie))
  const street = parts.join(' ')
  const city = siege.libelle_commune ? String(siege.libelle_commune) : ''
  const cp = siege.code_postal ? String(siege.code_postal) : ''
  const line2 = [cp, city].filter(Boolean).join(' ')
  return [street, line2, 'France'].filter(Boolean).join(', ')
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  if (q.length < 2) return NextResponse.json({ results: [] })

  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&per_page=5`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) throw new Error(`Upstream error ${res.status}`)

    const data = await res.json()
    const results = (data.results ?? []).map((r: Record<string, unknown>) => {
      const siren = String(r.siren ?? '').replace(/\s/g, '')
      const siege = (r.siege ?? null) as Record<string, string | number | null> | null
      const natureCode = String(r.nature_juridique ?? '')
      return {
        name: r.nom_complet ?? r.denomination ?? '',
        siren,
        siren_formatted: siren.length === 9 ? formatSiren(siren) : siren,
        legal_form: LEGAL_FORMS[natureCode] ?? null,
        naf_code: siege?.activite_principale ?? (r.activite_principale as string | null) ?? null,
        year_created: r.date_creation
          ? parseInt(String(r.date_creation).slice(0, 4), 10)
          : null,
        address: buildAddress(siege),
      }
    })

    return NextResponse.json({ results })
  } catch (err: unknown) {
    console.error('search-company error:', err)
    return NextResponse.json({ results: [] })
  }
}
