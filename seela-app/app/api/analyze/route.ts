import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { NextResponse } from 'next/server'

const client = new Anthropic()

const PROMPT = `Analyse ce document commercial (devis ou facture) et retourne un JSON structuré.

LIGNES À INCLURE dans "items" : matériel informatique, machines, véhicules utilitaires, équipements industriels, serveurs, mobilier professionnel — tout équipement physique avec une durée de vie amortissable.

EXCLURE impérativement des "items" : éco-participations, remises, avoirs, services, formations, garanties, maintenances, licences logicielles, frais de livraison, taxes, assurances.

Pour chaque ligne retenue dans "items" : description (string), quantité (number), prix unitaire HT (number), prix total HT (number), category (string parmi : "Informatique" | "Mobilier" | "Véhicule" | "Médical" | "Industrie" | "Téléphonie" | "Audiovisuel" | "Autre").

Extrait aussi :
- "supplier" : l'entreprise émettrice du document (nom, adresse, numéro SIREN/SIRET si présent)
- "document_number" : le numéro de devis ou de facture (ex: DEV-2026-0142, FA-2024-00891)
- "document_date" : la date d'émission au format YYYY-MM-DD

Réponds UNIQUEMENT en JSON valide avec exactement ce format :
{
  "supplier": { "name": "", "address": "", "siren": "" },
  "document_number": "",
  "document_date": "",
  "items": [ { "description": "", "quantity": 0, "unit_price": 0, "total_price": 0, "category": "" } ]
}
Si une valeur est absente ou non trouvée, utilise null.`

export async function POST(req: Request) {
  try {
    const { documentUrl, mimeType } = await req.json()
    if (!documentUrl) return NextResponse.json({ error: 'Missing documentUrl' }, { status: 400 })

    const res = await fetch(documentUrl)
    if (!res.ok) throw new Error('Failed to fetch document')

    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const type = (mimeType || res.headers.get('content-type') || 'application/pdf') as string
    const isPdf = type === 'application/pdf'

    const messages: MessageParam[] = [
      {
        role: 'user',
        content: [
          isPdf
            ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
            : { type: 'image', source: { type: 'base64', media_type: type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      },
    ]

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages,
    })

    const textBlock = message.content.find(c => c.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response')

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (err: unknown) {
    console.error('Analyze error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analyse échouée' },
      { status: 500 }
    )
  }
}
