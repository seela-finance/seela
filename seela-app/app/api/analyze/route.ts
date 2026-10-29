import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchOwnDocument, DocumentError } from '@/lib/documents'

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { documentUrl, mimeType } = await req.json()
    const { base64, type } = await fetchOwnDocument(documentUrl, mimeType, user.id)
    const isPdf = type === 'application/pdf'

    const messages: MessageParam[] = [
      {
        role: 'user',
        content: [
          isPdf
            ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
            : { type: 'image', source: { type: 'base64', media_type: type as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
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
    if (err instanceof DocumentError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Analyse échouée, veuillez réessayer' }, { status: 500 })
  }
}
