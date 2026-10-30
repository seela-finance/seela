import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchOwnDocument, DocumentError } from '@/lib/documents'

const client = new Anthropic()

const PROMPT = `Analyse ce bilan comptable et extrais: chiffre d'affaires total HT (CA), résultat net, effectif si mentionné. Réponds UNIQUEMENT en JSON: { "chiffre_affaires": number | null, "resultat_net": number | null, "effectif": number | null }. Montants en euros. Si absent: null.`

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
      max_tokens: 256,
      messages,
    })

    const textBlock = message.content.find(c => c.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response')

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      chiffre_affaires: parsed.chiffre_affaires ?? null,
      resultat_net: parsed.resultat_net ?? null,
      effectif: parsed.effectif ?? null,
    })
  } catch (err: unknown) {
    console.error('analyze-bilan error:', err)
    if (err instanceof DocumentError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Analyse échouée, veuillez réessayer' }, { status: 500 })
  }
}
